import { useCallback, useRef } from 'react';
import { RESPONSE_STATUS } from 'shared/responseStatus';
import { sendHttp } from 'src/api/network';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectCollectionData,
  selectDynamicVariables,
  selectMappings,
  selectSelectedEnvironment,
  selectSelectedRequestId,
} from 'src/store/selectors';
import { collectionRunActions } from 'src/store/slices/collectionRunSlice';
import { environmentActions } from 'src/store/slices/environmentSlice';
import { requestActions } from 'src/store/slices/requestSlice';
import { responseActions } from 'src/store/slices/responseSlice';
import { DynamicVariable, PostmanItem } from 'src/types';
import {
  applyMapping,
  createHttpRequest,
  detectDataType,
  extractBodyParameters,
  extractDynamicVariables,
  extractQueryParameters,
  extractStatusCode,
  findRequestById,
  formatExtractionWarning,
  getInitialParameterValue,
  headersRecordToString,
  postmanHeadersToRecord,
  substituteRequestVariables,
} from 'src/utils';

const activeControllers = new Map<string, AbortController>();

export function useCollectionRunner() {
  const dispatch = useAppDispatch();

  const collection = useAppSelector(selectCollectionData);
  const dynamicVariables = useAppSelector(selectDynamicVariables);
  const mappings = useAppSelector(selectMappings);
  const selectedEnvironment = useAppSelector(selectSelectedEnvironment);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);

  const dynamicVariablesRef = useRef<DynamicVariable[]>(dynamicVariables);
  dynamicVariablesRef.current = dynamicVariables;
  const cancelRef = useRef<boolean>(false);

  const cancelFolderRun = useCallback(() => {
    activeControllers.forEach((controller) => controller.abort());
    activeControllers.clear();

    cancelRef.current = true;
    dispatch(collectionRunActions.finishFolderRun());
  }, [dispatch]);

  const cancelRequestRun = useCallback(
    (requestId: string) => {
      activeControllers.get(requestId)?.abort();
      activeControllers.delete(requestId);

      dispatch(collectionRunActions.finishRequestRun(requestId));
    },
    [dispatch],
  );

  const executeRequest = useCallback(
    async (item: PostmanItem) => {
      activeControllers.get(item.id)?.abort();
      const controller = new AbortController();
      activeControllers.set(item.id, controller);

      dispatch(collectionRunActions.startRequestRun(item.id));

      try {
        const { request } = item;
        const { body, headers, url } = substituteRequestVariables(
          request.body ?? {},
          selectedEnvironment,
          dynamicVariablesRef.current,
          headersRecordToString(postmanHeadersToRecord(request.header)),
          request.url,
        );

        const httpRequest = createHttpRequest(body, headers, request.method, url);
        const response = await sendHttp(httpRequest, controller.signal);
        const status = extractStatusCode(response);

        let bodyParameters = {};
        let queryParameters = {};

        if (status >= RESPONSE_STATUS.OK && status < RESPONSE_STATUS.REDIRECT) {
          bodyParameters = applyMapping(extractBodyParameters(body), mappings[item.id]?.body || {});
          queryParameters = applyMapping(
            Object.fromEntries(
              Object.entries(extractQueryParameters(url)).map(([key, value]) => [
                key,
                getInitialParameterValue(detectDataType(value), value),
              ]),
            ),
            mappings[item.id]?.query || {},
          );
        }

        if (selectedRequestId === item.id) {
          dispatch(responseActions.setResponse(response));
          dispatch(requestActions.setBodyParameters(bodyParameters));
          dispatch(requestActions.setQueryParameters(queryParameters));
        }

        dispatch(
          collectionRunActions.addResult({
            requestId: item.id,
            status,
            response,
            bodyParameters,
            queryParameters,
            error: null,
            warning: formatExtractionWarning(
              extractDynamicVariables(dynamicVariablesRef.current, item.id, response, (variable, value) =>
                dispatch(environmentActions.updateDynamicVariableValue({ id: variable.id, value })),
              ),
            ),
          }),
        );
      } catch (error) {
        dispatch(
          collectionRunActions.addResult({
            requestId: item.id,
            status: null,
            response: null,
            bodyParameters: {},
            queryParameters: {},
            error: String(error),
            warning: null,
          }),
        );
      } finally {
        if (activeControllers.get(item.id) === controller) activeControllers.delete(item.id);
      }
    },
    [mappings, selectedEnvironment, selectedRequestId, dispatch],
  );

  const runFolder = useCallback(
    async (folderId: string) => {
      const folder = collection.item.find((f) => f.id === folderId);
      if (!folder || folder.item.length === 0) return;

      cancelRef.current = false;

      const requestIds = folder.item.map((item) => item.id);
      dispatch(collectionRunActions.clearFolderResults(requestIds));

      dispatch(
        collectionRunActions.startFolderRun({
          folderId,
          totalRequests: folder.item.length,
        }),
      );

      for (let i = 0; i < folder.item.length; i++) {
        if (cancelRef.current) break;

        await executeRequest(folder.item[i]);
      }

      dispatch(collectionRunActions.finishFolderRun());
    },
    [collection, mappings, selectedEnvironment, dispatch],
  );

  const runRequest = useCallback(
    async (requestId: string) => {
      const item = findRequestById(collection, requestId);
      if (!item) return;

      dispatch(collectionRunActions.clearFolderResults([item.id]));
      await executeRequest(item);
      dispatch(collectionRunActions.finishRequestRun(item.id));
    },
    [collection, mappings, selectedEnvironment, selectedRequestId, dispatch],
  );

  return { cancelFolderRun, cancelRequestRun, runFolder, runRequest };
}
