import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { store } from 'src/store';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
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

export function useSaveRequest() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const body = useAppSelector(selectBody);
  const bodyParameters = useAppSelector(selectBodyParameters);
  const collection = useAppSelector(selectCollectionData);
  const disabled = useAppSelector(selectIsRequestDisabled);
  const headers = useAppSelector(selectHeaders);
  const httpResponse = useAppSelector(selectHttpResponse);
  const method = useAppSelector(selectMethod);
  const preEvaluation = useAppSelector(selectPreEvaluation);
  const queryParameters = useAppSelector(selectQueryParameters);
  const selectedFolderId = useAppSelector(selectSelectedFolderId);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);
  const testResults = useAppSelector(selectCurrentTestResults);
  const url = useAppSelector(selectUrl);

  const saveRequest = useCallback(
    (duplicate = false) => {
      let requestId: string | null = selectedRequestId;
      const parsedHeaders = parseHeaders(headers);

      if (!duplicate && requestId && findRequestById(collection, requestId))
        dispatch(
          collectionActions.updateRequest({ body, headers: parsedHeaders, method, preEvaluation, requestId, url }),
        );
      else {
        dispatch(
          collectionActions.addRequest({
            body,
            folderId: selectedFolderId,
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
            bodyParameters,
            error: null,
            queryParameters,
            requestId,
            response: httpResponse,
            status: extractStatusCode(httpResponse),
          }),
        );

      notify.success(t('common.saved'), { toastId: 'success-save-request' });
    },
    [
      body,
      bodyParameters,
      collection,
      headers,
      httpResponse,
      method,
      preEvaluation,
      queryParameters,
      selectedFolderId,
      selectedRequestId,
      testResults,
      url,
      dispatch,
    ],
  );

  const autoSaveRequest = useCallback(() => {
    if (disabled || !selectedRequestId) return;

    saveRequest();
  }, [disabled, selectedRequestId, saveRequest]);

  return { saveRequest, autoSaveRequest };
}
