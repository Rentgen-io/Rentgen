import { useCallback, useRef } from 'react';
import { sendHttp } from 'src/api/network';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectCollectionData,
  selectDynamicVariables,
  selectMappings,
  selectSelectedEnvironment,
} from 'src/store/selectors';
import { collectionRunActions } from 'src/store/slices/collectionRunSlice';
import { environmentActions } from 'src/store/slices/environmentSlice';
import { DynamicVariable, ExtractionFailure, PostmanItem } from 'src/types';
import {
  createHttpRequest,
  detectDataType,
  extractBodyParameters,
  extractDynamicVariableFromResponseWithDetails,
  extractQueryParameters,
  extractStatusCode,
  findRequestById,
  getInitialParameterValue,
  headersRecordToString,
  postmanHeadersToRecord,
  substituteRequestVariables,
} from 'src/utils';

export function useCollectionRunner() {
  const dispatch = useAppDispatch();

  const collection = useAppSelector(selectCollectionData);
  const selectedEnvironment = useAppSelector(selectSelectedEnvironment);
  const mappings = useAppSelector(selectMappings);
  const dynamicVariables = useAppSelector(selectDynamicVariables);

  const dynamicVariablesRef = useRef<DynamicVariable[]>(dynamicVariables);
  dynamicVariablesRef.current = dynamicVariables;
  const cancelRef = useRef<boolean>(false);

  const runFolder = useCallback(
    async (folderId: string) => {
      const folder = collection.item.find((f) => f.id === folderId);
      if (!folder || folder.item.length === 0) return;

      cancelRef.current = false;

      const requestIds = folder.item.map((item) => item.id);
      dispatch(collectionRunActions.clearFolderResults(requestIds));

      dispatch(
        collectionRunActions.startRun({
          folderId,
          totalRequests: folder.item.length,
        }),
      );

      for (let i = 0; i < folder.item.length; i++) {
        if (cancelRef.current) break;

        await executeRequest(folder.item[i]);
      }

      dispatch(collectionRunActions.finishRun());
    },
    [collection, mappings, selectedEnvironment, dispatch],
  );

  const runRequest = useCallback(
    async (requestId: string) => {
      const item = findRequestById(collection, requestId);
      if (!item) return;

      dispatch(collectionRunActions.clearFolderResults([item.id]));
      await executeRequest(item);
      dispatch(collectionRunActions.finishRequestRun());
    },
    [collection, mappings, selectedEnvironment, dispatch],
  );

  const executeRequest = useCallback(
    async (item: PostmanItem) => {
      dispatch(collectionRunActions.startRequestRun(item.id));

      try {
        const { request } = item;
        const { body, headers, url } = substituteRequestVariables(
          request.url,
          headersRecordToString(postmanHeadersToRecord(request.header)),
          request.body?.raw || '',
          selectedEnvironment,
          dynamicVariablesRef.current,
        );

        const httpRequest = createHttpRequest(body, headers, request.method, url);
        const response = await sendHttp(httpRequest);
        const status = extractStatusCode(response);

        let bodyParameters = {};
        let queryParameters = {};

        if (status >= 200 && status < 300) {
          const extractedBodyParameters = extractBodyParameters(body, headers);
          const mappedBodyParameters = mappings[item.id]?.body || {};

          bodyParameters = Object.fromEntries(
            Object.keys(extractedBodyParameters).map((key) => [
              key,
              key in mappedBodyParameters ? mappedBodyParameters[key] : extractedBodyParameters[key],
            ]),
          );

          const extractedQueryParameters = Object.fromEntries(
            Object.entries(extractQueryParameters(request.url)).map(([key, value]) => [
              key,
              getInitialParameterValue(detectDataType(value), value),
            ]),
          );
          const mappedQueryParameters = mappings[item.id]?.query || {};

          queryParameters = Object.fromEntries(
            Object.keys(extractedQueryParameters).map((key) => [
              key,
              key in mappedQueryParameters ? mappedQueryParameters[key] : extractedQueryParameters[key],
            ]),
          );
        }

        const extractionFailures: ExtractionFailure[] = [];

        for (const dynamicVariable of dynamicVariablesRef.current) {
          const previousRequest = dynamicVariable.previousRequests?.find(({ requestId }) => requestId === item.id);
          if (dynamicVariable.requestId !== item.id && !previousRequest) continue;

          const currentDynamicVariable =
            dynamicVariable.requestId === item.id
              ? dynamicVariable
              : {
                  ...dynamicVariable,
                  selector: previousRequest!.selector,
                  source: previousRequest!.source,
                };
          const extractedDynamicVariables = extractDynamicVariableFromResponseWithDetails(
            currentDynamicVariable,
            response,
          );

          if (extractedDynamicVariables.success && extractedDynamicVariables.value !== null)
            dispatch(
              environmentActions.updateDynamicVariableValue({
                id: currentDynamicVariable.id,
                value: extractedDynamicVariables.value,
              }),
            );
          else
            extractionFailures.push({
              variableName: currentDynamicVariable.key,
              selector: currentDynamicVariable.selector,
              source: currentDynamicVariable.source,
              reason: extractedDynamicVariables.error || 'unknown error',
            });
        }

        let warning: string | null = null;
        if (extractionFailures.length > 0) {
          if (extractionFailures.length === 1) {
            const f = extractionFailures[0];
            warning = `Failed to extract {{${f.variableName}}}: ${f.reason}`;
          } else {
            const details = extractionFailures.map((f) => `{{${f.variableName}}}`).join(', ');
            warning = `Failed to extract: ${details}`;
          }
        }

        dispatch(
          collectionRunActions.addResult({
            requestId: item.id,
            status,
            response,
            bodyParameters,
            queryParameters,
            error: null,
            warning,
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
      }
    },
    [mappings, selectedEnvironment, dispatch],
  );

  const cancelRun = useCallback(() => {
    cancelRef.current = true;
    dispatch(collectionRunActions.cancelRun());
  }, [dispatch]);

  return { runFolder, runRequest, cancelRun };
}
