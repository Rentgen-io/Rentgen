import { useCallback } from 'react';
import { RESPONSE_STATUS, RESPONSE_STATUS_LABEL } from 'src/constants/responseStatus';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectBody,
  selectDynamicVariables,
  selectHeaders,
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
import { DynamicVariable, ExtractionFailure, HttpResponse, RequestParameters } from 'src/types';
import {
  createHttpRequest,
  detectDataType,
  extractBodyParameters,
  extractDynamicVariableFromResponseWithDetails,
  extractQueryParameters,
  extractStatusCode,
  getInitialParameterValue,
  substituteRequestVariables,
} from 'src/utils';

function applyMapping(extracted: RequestParameters, mapped: RequestParameters): RequestParameters {
  return Object.fromEntries(Object.keys(extracted).map((key) => [key, key in mapped ? mapped[key] : extracted[key]]));
}

function collectExtractionFailures(
  dynamicVariables: DynamicVariable[],
  requestId: string,
  response: HttpResponse,
): ExtractionFailure[] {
  const failures: ExtractionFailure[] = [];

  for (const dynamicVariable of dynamicVariables) {
    const previousRequest = dynamicVariable.previousRequests?.find((entry) => entry.requestId === requestId);
    if (dynamicVariable.requestId !== requestId && !previousRequest) continue;

    const current =
      dynamicVariable.requestId === requestId
        ? dynamicVariable
        : { ...dynamicVariable, selector: previousRequest!.selector, source: previousRequest!.source };
    const extracted = extractDynamicVariableFromResponseWithDetails(current, response);

    if (!extracted.success)
      failures.push({
        variableName: current.key,
        selector: current.selector,
        source: current.source,
        reason: extracted.error || 'unknown error',
      });
  }

  return failures;
}

function formatExtractionWarning(failures: ExtractionFailure[]): string | null {
  if (failures.length === 0) return null;
  if (failures.length === 1) return `Failed to extract {{${failures[0].variableName}}}: ${failures[0].reason}`;

  return `Failed to extract: ${failures.map(({ variableName }) => `{{${variableName}}}`).join(', ')}`;
}

export function useSendHttpRequest() {
  const dispatch = useAppDispatch();

  const method = useAppSelector(selectMethod);
  const url = useAppSelector(selectUrl);
  const headers = useAppSelector(selectHeaders);
  const body = useAppSelector(selectBody);
  const selectedEnvironment = useAppSelector(selectSelectedEnvironment);
  const dynamicVariables = useAppSelector(selectDynamicVariables);
  const selectedRequestId = useAppSelector(selectSelectedRequestId);
  const mappings = useAppSelector(selectMappings);

  return useCallback(async () => {
    dispatch(responseActions.setResponse({ status: RESPONSE_STATUS_LABEL.SENDING, body: null, headers: {}, time: 0 }));

    const historyEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
      const response = await window.electronAPI.sendHttp(request);
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
            Object.entries(extractQueryParameters(url)).map(([key, value]) => [
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
      dispatch(historyActions.addEntry(historyEntry));
    }
  }, [url, headers, body, selectedEnvironment, dynamicVariables, selectedRequestId, method, mappings, dispatch]);
}
