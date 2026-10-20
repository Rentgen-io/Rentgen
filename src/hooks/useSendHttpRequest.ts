import { useCallback } from 'react';
import { RESPONSE_STATUS, RESPONSE_STATUS_LABEL } from 'shared/responseStatus';
import { sendHttp } from 'src/api/network';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectBody,
  selectDynamicVariables,
  selectHeaders,
  selectIsSending,
  selectMappings,
  selectMethod,
  selectSelectedEnvironment,
  selectSelectedRequestId,
  selectUrl,
} from 'src/store/selectors';
import { collectionRunActions } from 'src/store/slices/collectionRunSlice';
import { historyActions } from 'src/store/slices/historySlice';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { requestActions } from 'src/store/slices/requestSlice';
import { responseActions } from 'src/store/slices/responseSlice';
import { RequestParameters } from 'src/types';
import {
  applyMapping,
  collectExtractionFailures,
  createHttpRequest,
  detectDataType,
  extractBodyParameters,
  extractQueryParameters,
  extractStatusCode,
  formatExtractionWarning,
  generateHistoryId,
  getInitialParameterValue,
  substituteRequestVariables,
} from 'src/utils';

let activeController: AbortController | null = null;

export function useSendHttpRequest() {
  const dispatch = useAppDispatch();

  const body = useAppSelector(selectBody);
  const dynamicVariables = useAppSelector(selectDynamicVariables);
  const headers = useAppSelector(selectHeaders);
  const isSending = useAppSelector(selectIsSending);
  const mappings = useAppSelector(selectMappings);
  const method = useAppSelector(selectMethod);
  const selectedEnvironment = useAppSelector(selectSelectedEnvironment);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);
  const url = useAppSelector(selectUrl);

  const abortRequest = useCallback(() => {
    activeController?.abort();
    activeController = null;
  }, []);

  const sendHttpRequest = useCallback(async () => {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;

    dispatch(requestActions.setIsSending(true));

    const historyEntry = {
      id: generateHistoryId(),
      timestamp: Date.now(),
      method,
      url,
      headers,
      body,
    };

    try {
      const {
        url: substitutedUrl,
        headers: substitutedHeaders,
        body: substitutedBody,
      } = substituteRequestVariables(url, headers, body, selectedEnvironment, dynamicVariables);
      const request = createHttpRequest(substitutedBody, substitutedHeaders, method, substitutedUrl);
      const response = await sendHttp(request, controller.signal);
      const status = extractStatusCode(response);

      dispatch(responseActions.setResponse(response));

      let bodyParameters: RequestParameters = {};
      let queryParameters: RequestParameters = {};

      if (status >= RESPONSE_STATUS.OK && status < RESPONSE_STATUS.REDIRECT) {
        bodyParameters = applyMapping(
          extractBodyParameters(substitutedBody, substitutedHeaders),
          (selectedRequestId && mappings[selectedRequestId]?.body) || {},
        );
        queryParameters = applyMapping(
          Object.fromEntries(
            Object.entries(extractQueryParameters(substitutedUrl)).map(([key, value]) => [
              key,
              getInitialParameterValue(detectDataType(value), value),
            ]),
          ),
          (selectedRequestId && mappings[selectedRequestId]?.query) || {},
        );

        dispatch(modalsActions.openSendHttpSuccessModal());
      }

      dispatch(requestActions.setBodyParameters(bodyParameters));
      dispatch(requestActions.setQueryParameters(queryParameters));

      if (selectedRequestId)
        dispatch(
          collectionRunActions.addResult({
            requestId: selectedRequestId,
            status,
            response,
            bodyParameters,
            queryParameters,
            error: null,
            warning: formatExtractionWarning(collectExtractionFailures(dynamicVariables, selectedRequestId, response)),
          }),
        );
    } catch (error) {
      dispatch(
        responseActions.setResponse({
          status: RESPONSE_STATUS_LABEL.NETWORK_ERROR,
          body: String(error),
          headers: {},
          time: 0,
        }),
      );
    } finally {
      dispatch(requestActions.setIsSending(false));
      dispatch(historyActions.addEntry(historyEntry));
      activeController = null;
    }
  }, [url, headers, body, selectedEnvironment, dynamicVariables, selectedRequestId, method, mappings, dispatch]);

  return { isSending, abortRequest, sendHttpRequest };
}
