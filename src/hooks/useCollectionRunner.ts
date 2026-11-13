import { useCallback } from 'react';
import { RESPONSE_STATUS } from 'shared/responseStatus';
import { sendHttp } from 'src/api/network';
import { store } from 'src/store';
import { useAppDispatch } from 'src/store/hooks';
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
import { PostmanItem } from 'src/types';
import {
  createHttpRequest,
  extractDynamicVariables,
  extractRequestParameters,
  extractStatusCode,
  findRequestById,
  formatExtractionWarning,
  headersRecordToString,
  isAbortedResponse,
  postmanHeadersToRecord,
  substituteRequestVariables,
} from 'src/utils';

const activeControllers = new Map<string, AbortController>();

// Module-level (like activeControllers), not a useRef: the folder row may remount during a run (e.g. when searching),
// and the cancel must still reach the running loop. A token per run, so a cancelled loop can't affect a newer run.
// requestIds scope the cancel to the folder's own requests: single runs of requests in other folders keep running
let activeFolderRun: { cancelled: boolean; requestIds: string[] } | null = null;

/**
 * The collection, environment, dynamic variables and mappings are read from the store when running (not subscribed
 * to), so the returned callbacks are stable, always use current values (also between the requests of a folder run),
 * and the sidebar rows using this hook don't re-render on every store change.
 */
export function useCollectionRunner() {
  const dispatch = useAppDispatch();

  const cancelFolderRun = useCallback(() => {
    const requestIds = activeFolderRun?.requestIds ?? [];

    if (activeFolderRun) activeFolderRun.cancelled = true;
    activeFolderRun = null;

    requestIds.forEach((requestId) => {
      activeControllers.get(requestId)?.abort();
      activeControllers.delete(requestId);
    });

    dispatch(collectionRunActions.finishFolderRun(requestIds));
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
        const state = store.getState();
        const { body, headers, url } = substituteRequestVariables(
          request.body ?? {},
          selectSelectedEnvironment(state),
          selectDynamicVariables(state),
          headersRecordToString(postmanHeadersToRecord(request.header)),
          request.url,
        );

        const httpRequest = createHttpRequest(body, headers, request.method, url);
        const response = await sendHttp(httpRequest, controller.signal);
        const status = extractStatusCode(response);

        // The state after the response: mappings, selection or variables may have changed while waiting for it
        const latestState = store.getState();
        const { bodyParameters, queryParameters } =
          status >= RESPONSE_STATUS.OK && status < RESPONSE_STATUS.REDIRECT
            ? extractRequestParameters(body, url, selectMappings(latestState)[item.id])
            : { bodyParameters: {}, queryParameters: {} };

        if (selectSelectedRequestId(latestState) === item.id) {
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
            warning: isAbortedResponse(response)
              ? null
              : formatExtractionWarning(
                  extractDynamicVariables(selectDynamicVariables(latestState), item.id, response, (variable, value) =>
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
    [dispatch],
  );

  const runFolder = useCallback(
    async (folderId: string) => {
      const folder = selectCollectionData(store.getState()).item.find((f) => f.id === folderId);
      if (!folder || folder.item.length === 0) return;

      const requestIds = folder.item.map((item) => item.id);
      const run = { cancelled: false, requestIds };
      activeFolderRun = run;

      dispatch(collectionRunActions.clearFolderResults(requestIds));

      dispatch(
        collectionRunActions.startFolderRun({
          folderId,
          totalRequests: folder.item.length,
        }),
      );

      for (let i = 0; i < folder.item.length; i++) {
        if (run.cancelled) break;

        await executeRequest(folder.item[i]);
      }

      // When cancelled, cancelFolderRun already finished the run (and a newer run may be in progress meanwhile)
      if (activeFolderRun === run) {
        activeFolderRun = null;
        dispatch(collectionRunActions.finishFolderRun(requestIds));
      }
    },
    [executeRequest, dispatch],
  );

  const runRequest = useCallback(
    async (requestId: string) => {
      const item = findRequestById(selectCollectionData(store.getState()), requestId);
      if (!item) return;

      dispatch(collectionRunActions.clearFolderResults([item.id]));
      await executeRequest(item);
      dispatch(collectionRunActions.finishRequestRun(item.id));
    },
    [executeRequest, dispatch],
  );

  return { cancelFolderRun, cancelRequestRun, runFolder, runRequest };
}
