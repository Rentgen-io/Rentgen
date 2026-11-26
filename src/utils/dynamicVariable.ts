import { DynamicVariable, ExtractionError, ExtractionFailure, ExtractionResult } from 'shared/types/environment';
import { HttpResponse } from 'shared/types/http';
import { getHeaderKey } from 'shared/utils/headers';
import { extractValue, stringifyExtractedValue } from './environment';

/**
 * Extracts the dynamic variables linked to a request from its response.
 * Each extracted value is passed to `onExtracted`; the failed extractions are returned (e.g. for a warning).
 */
export function extractDynamicVariables(
  dynamicVariables: DynamicVariable[],
  requestId: string,
  response: HttpResponse,
  onExtracted?: (variable: DynamicVariable, value: string) => void,
): ExtractionFailure[] {
  const failures: ExtractionFailure[] = [];

  for (const dynamicVariable of dynamicVariables) {
    const variable = resolveForRequest(dynamicVariable, requestId);
    if (!variable) continue;

    const result = extractFromResponse(variable, response);
    if (result.success) onExtracted?.(variable, result.value);
    else
      failures.push({
        variableName: variable.key,
        selector: variable.selector,
        source: variable.source,
        reason: result.error,
      });
  }

  return failures;
}

/**
 * The variable with the selector and source to use for the request: its own for the request it belongs to,
 * the saved ones for a request it was previously linked to. `null` when the variable isn't linked to the request.
 */
function resolveForRequest(variable: DynamicVariable, requestId: string): DynamicVariable | null {
  if (variable.requestId === requestId) return variable;

  const previousRequest = variable.previousRequests?.find((entry) => entry.requestId === requestId);
  return previousRequest ? { ...variable, selector: previousRequest.selector, source: previousRequest.source } : null;
}

/** Reads the variable's value from the response body (by path) or headers (by case-insensitive name). */
function extractFromResponse(variable: DynamicVariable, response: HttpResponse): ExtractionResult {
  try {
    let extractedValue: unknown;

    switch (variable.source) {
      case 'body':
        if (!response.body) return failure('emptyBody');

        extractedValue = extractValue(response.body, variable.selector);
        if (extractedValue === undefined) return failure('selectorNotFound');
        break;

      case 'header': {
        if (!response.headers) return failure('noHeaders');

        const headerKey = getHeaderKey(response.headers, variable.selector);
        extractedValue = headerKey ? response.headers[headerKey] : undefined;
        if (extractedValue === undefined) return failure('headerNotFound');
        break;
      }
    }

    const value = stringifyExtractedValue(extractedValue);
    return value === null ? failure('nullValue') : { success: true, value };
  } catch {
    // Malformed saved variables (e.g. without a selector) must not break handling the response
    return failure('invalidVariable');
  }
}

function failure(error: ExtractionError): ExtractionResult {
  return { success: false, error };
}
