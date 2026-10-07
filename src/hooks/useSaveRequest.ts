import { useCallback, useEffect, useRef } from 'react';
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
  selectQueryParameters,
  selectSelectedFolderId,
  selectSelectedRequestId,
  selectUrl,
} from 'src/store/selectors';
import { collectionRunActions } from 'src/store/slices/collectionRunSlice';
import { collectionActions } from 'src/store/slices/collectionSlice';
import { testsActions } from 'src/store/slices/testsSlice';
import { uiActions } from 'src/store/slices/uiSlice';
import { extractStatusCode, findRequestById, parseHeaders } from 'src/utils';

const SAVED_FEEDBACK_MS = 2000;

export function useSaveRequest() {
  const dispatch = useAppDispatch();
  const savedTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const collection = useAppSelector(selectCollectionData);
  const method = useAppSelector(selectMethod);
  const url = useAppSelector(selectUrl);
  const headers = useAppSelector(selectHeaders);
  const body = useAppSelector(selectBody);
  const bodyParameters = useAppSelector(selectBodyParameters);
  const queryParameters = useAppSelector(selectQueryParameters);
  const httpResponse = useAppSelector(selectHttpResponse);
  const selectedFolderId = useAppSelector(selectSelectedFolderId);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);
  const testResults = useAppSelector(selectCurrentTestResults);
  const disabled = useAppSelector(selectIsRequestDisabled);

  useEffect(() => () => clearTimeout(savedTimeout.current), []);

  const saveRequest = useCallback(() => {
    let requestId: string | null = selectedRequestId;
    const parsedHeaders = parseHeaders(headers);

    if (requestId && findRequestById(collection, requestId)) {
      dispatch(collectionActions.updateRequest({ requestId, method, url, headers: parsedHeaders, body }));
    } else {
      dispatch(collectionActions.addRequest({ method, url, headers: parsedHeaders, body, folderId: selectedFolderId }));

      requestId = store.getState().collection.selectedRequestId;
      if (requestId && testResults) dispatch(testsActions.addResults({ requestId, results: testResults }));
    }

    if (requestId && httpResponse)
      dispatch(
        collectionRunActions.addResult({
          requestId,
          status: extractStatusCode(httpResponse),
          response: httpResponse,
          bodyParameters,
          queryParameters,
          error: null,
        }),
      );

    dispatch(uiActions.setSaved(true));
    clearTimeout(savedTimeout.current);
    savedTimeout.current = setTimeout(() => dispatch(uiActions.setSaved(false)), SAVED_FEEDBACK_MS);
  }, [
    body,
    bodyParameters,
    collection,
    headers,
    httpResponse,
    method,
    queryParameters,
    selectedFolderId,
    selectedRequestId,
    testResults,
    url,
    dispatch,
  ]);

  const autoSaveRequest = useCallback(() => {
    if (disabled || !selectedRequestId) return;

    saveRequest();
  }, [disabled, selectedRequestId, saveRequest]);

  return { saveRequest, autoSaveRequest };
}
