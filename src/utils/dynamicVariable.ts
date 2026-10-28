import { DynamicVariable, ExtractionFailure, ExtractionResult, HttpResponse } from 'src/types';
import { extractValue, stringifyExtractedValue } from './environment';
import { isObject } from './object';

export function collectExtractionFailures(
  dynamicVariables: DynamicVariable[],
  requestId: string,
  response: HttpResponse,
  onSuccess?: (current: DynamicVariable, extracted: ExtractionResult) => void,
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
    else onSuccess?.(current, extracted);
  }

  return failures;
}

export function extractDynamicVariableFromResponseWithDetails(
  variable: DynamicVariable,
  response: HttpResponse,
): ExtractionResult {
  try {
    let extractedValue: unknown;

    if (variable.source === 'body') {
      if (!response.body) {
        return { value: null, success: false, error: 'response body is empty' };
      }

      let body: unknown;
      try {
        body = !isObject(response.body) ? JSON.parse(JSON.stringify(response.body, null, 2)) : response.body;
      } catch {
        return { value: null, success: false, error: 'response body is not valid JSON' };
      }

      extractedValue = extractValue(body, variable.selector);

      if (extractedValue === undefined) {
        return { value: null, success: false, error: `selector '${variable.selector}' not found in response` };
      }
    } else if (variable.source === 'header') {
      if (!response.headers) {
        return { value: null, success: false, error: 'response has no headers' };
      }

      // Case-insensitive header lookup
      const headerKey = Object.keys(response.headers).find((k) => k.toLowerCase() === variable.selector.toLowerCase());
      extractedValue = headerKey ? response.headers[headerKey] : undefined;

      if (extractedValue === undefined) {
        return { value: null, success: false, error: `header '${variable.selector}' not found in response` };
      }
    }

    const stringValue = stringifyExtractedValue(extractedValue);
    if (stringValue === null) {
      return { value: null, success: false, error: 'extracted value is null or undefined' };
    }

    return { value: stringValue, success: true };
  } catch (e) {
    return { value: null, success: false, error: String(e) };
  }
}

export function generateDynamicVariableId(): string {
  return `dvar_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
