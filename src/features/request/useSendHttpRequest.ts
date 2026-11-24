import { useCallback } from 'react';
import { RESPONSE_STATUS_LABEL, isSuccessStatus } from 'shared/responseStatus';
import { RequestParameters } from 'shared/types/testing';
import { generateHistoryId } from 'shared/utils/id';
import { sendHttp } from 'src/api/network';
import { getResponseWarnings } from 'src/services/warnings';
import { store } from 'src/store';
import { useAppDispatch } from 'src/store/hooks';
import {
  selectBody,
  selectDynamicVariables,
  selectHeaders,
  selectHistoryEnabled,
  selectMappings,
  selectMethod,
  selectSelectedEnvironment,
  selectSelectedRequestId,
  selectTestEngineConfiguration,
  selectUrl,
} from 'src/store/selectors';
import { collectionRunActions } from 'src/store/slices/collectionRunSlice';
import { historyActions } from 'src/store/slices/historySlice';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { requestActions } from 'src/store/slices/requestSlice';
import { responseActions } from 'src/store/slices/responseSlice';
import { extractRequestParameters } from 'src/test-engine/parameters';
import { extractDynamicVariables } from 'src/utils/dynamicVariable';
import { substituteRequestVariables } from 'src/utils/environment';
import { createHttpRequest, extractStatusCode } from 'src/utils/http';

let activeController: AbortController | null = null;

/**
 * The request is read from the store when sending (not subscribed to), so sendHttpRequest is stable and only isSending
 * re-renders the calling component.
 */
export function useSendHttpRequest() {
  const dispatch = useAppDispatch();

  const abortRequest = useCallback(() => {
    activeController?.abort();
    activeController = null;
  }, []);

  const sendHttpRequest = useCallback(async () => {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;

    const state = store.getState();
    const body = selectBody(state);
    const dynamicVariables = selectDynamicVariables(state);
    const headers = selectHeaders(state);
    const historyEnabled = selectHistoryEnabled(state);
    const mappings = selectMappings(state);
    const method = selectMethod(state);
    const selectedEnvironment = selectSelectedEnvironment(state);
    const selectedRequestId = selectSelectedRequestId(state);
    const testEngineConfiguration = selectTestEngineConfiguration(state);
    const url = selectUrl(state);

    dispatch(requestActions.setIsSending(true));

    const historyEntry = {
      body,
      headers,
      id: generateHistoryId(),
      method,
      timestamp: Date.now(),
      url,
    };

    try {
      const {
        url: substitutedUrl,
        headers: substitutedHeaders,
        body: substitutedBody,
      } = substituteRequestVariables(
        body,
        selectedEnvironment,
        dynamicVariables,
        headers,
        testEngineConfiguration,
        url,
      );
      const request = createHttpRequest(substitutedBody, substitutedHeaders, method, substitutedUrl);
      const response = await sendHttp(request, controller.signal);
      const status = extractStatusCode(response);

      dispatch(responseActions.setResponse(response));

      let bodyParameters: RequestParameters = {};
      let queryParameters: RequestParameters = {};

      if (isSuccessStatus(status)) {
        ({ bodyParameters, queryParameters } = extractRequestParameters(
          substitutedBody,
          substitutedUrl,
          selectedRequestId ? mappings[selectedRequestId] : undefined,
          testEngineConfiguration,
        ));

        const doNotShowAgain = localStorage.getItem('sendHttpSuccessModalDoNotShowAgain');
        if (!doNotShowAgain || doNotShowAgain !== 'true') dispatch(modalsActions.openSendHttpSuccessModal());
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
            warnings: getResponseWarnings(
              response,
              extractDynamicVariables(dynamicVariables, selectedRequestId, response),
            ),
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
      if (historyEnabled) dispatch(historyActions.addEntry(historyEntry));
      activeController = null;
    }
  }, [dispatch]);

  return { abortRequest, sendHttpRequest };
}
