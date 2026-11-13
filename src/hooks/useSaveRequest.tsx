import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { store } from 'src/store';
import { useAppDispatch } from 'src/store/hooks';
import {
  selectBody,
  selectBodyParameters,
  selectCollectionData,
  selectCurrentTestResults,
  selectHeaders,
  selectHttpResponse,
  selectIsRequestDisabled,
  selectMethod,
  selectPreEvaluation,
  selectQueryParameters,
  selectSelectedFolderId,
  selectSelectedRequestId,
  selectUrl,
} from 'src/store/selectors';
import { collectionRunActions } from 'src/store/slices/collectionRunSlice';
import { collectionActions } from 'src/store/slices/collectionSlice';
import { testsActions } from 'src/store/slices/testsSlice';
import { extractStatusCode, findRequestById, parseHeaders } from 'src/utils';
import { notify } from 'src/utils/toast';

/**
 * The state is read from the store when saving (not subscribed to), so the returned callbacks are stable, never save
 * stale values, and don't re-render the calling component on every request / response / collection change.
 */
export function useSaveRequest() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const saveRequest = useCallback(
    ({ duplicate = false, silent = false }: { duplicate?: boolean; silent?: boolean } = {}) => {
      const state = store.getState();
      const body = selectBody(state);
      const httpResponse = selectHttpResponse(state);
      const method = selectMethod(state);
      const parsedHeaders = parseHeaders(selectHeaders(state));
      const preEvaluation = selectPreEvaluation(state);
      const testResults = selectCurrentTestResults(state);
      const url = selectUrl(state);
      let requestId: string | null = selectSelectedRequestId(state);

      if (!duplicate && requestId && findRequestById(selectCollectionData(state), requestId))
        dispatch(
          collectionActions.updateRequest({ body, headers: parsedHeaders, method, preEvaluation, requestId, url }),
        );
      else {
        dispatch(
          collectionActions.addRequest({
            body,
            folderId: selectSelectedFolderId(state),
            headers: parsedHeaders,
            method,
            preEvaluation,
            url,
          }),
        );

        requestId = store.getState().collection.selectedRequestId;
        if (requestId && testResults) dispatch(testsActions.addResults({ requestId, results: testResults }));
      }

      if (requestId && httpResponse)
        dispatch(
          collectionRunActions.addResult({
            bodyParameters: selectBodyParameters(state),
            error: null,
            queryParameters: selectQueryParameters(state),
            requestId,
            response: httpResponse,
            status: extractStatusCode(httpResponse),
          }),
        );

      if (!silent) notify.success(t('common.saved'), { toastId: 'success-save-request' });
    },
    [dispatch, t],
  );

  const autoSaveRequest = useCallback(() => {
    const state = store.getState();
    if (selectIsRequestDisabled(state) || !selectSelectedRequestId(state)) return;

    saveRequest({ silent: true });
  }, [saveRequest]);

  return { saveRequest, autoSaveRequest };
}
