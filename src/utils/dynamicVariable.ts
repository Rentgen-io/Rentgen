import { DynamicVariable, ExtractionResult, HttpResponse } from '../types';
import { extractValue, stringifyExtractedValue } from './environment';

/**
 * Extract the value for a dynamic variable from an HTTP response with detailed result.
 * Handles both body (JSON path) and header extraction.
 *
 * @param variable - The dynamic variable configuration
 * @param response - The HTTP response to extract from
 * @returns ExtractionResult with value, success flag, and error message if failed
 */
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
        body = JSON.parse(response.body);
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

/**
 * Extract the value for a dynamic variable from an HTTP response.
 * Handles both body (JSON path) and header extraction.
 *
 * @param variable - The dynamic variable configuration
 * @param response - The HTTP response to extract from
 * @returns The extracted value as a string, or null if extraction failed
 * @deprecated Use extractDynamicVariableFromResponseWithDetails for better error reporting
 */
export function extractDynamicVariableFromResponse(variable: DynamicVariable, response: HttpResponse): string | null {
  const result = extractDynamicVariableFromResponseWithDetails(variable, response);
  return result.value;
}
