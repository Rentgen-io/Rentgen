import { Method } from 'axios';
import { RESPONSE_STATUS_LABEL } from 'shared/responseStatus';
import { buildFieldsBody, getFormDataFileFields, isFieldsBody, isFormDataBody } from 'shared/utils/http';
import { FILE_FORMATS } from 'shared/utils/test-files';
import { store } from 'src/store';
import {
  DataType,
  FormDataBody,
  HttpRequest,
  HttpResponse,
  MappingsState,
  ParameterValue,
  PostmanBody,
  RequestBody,
  RequestParameters,
  TestData,
  TestOptions,
} from 'src/types';
import { isObject, setDeepObjectProperty, stringifyValue, tryParseJsonObject } from './object';
import { generateRandomValue } from './random';
import { extractQueryParameters } from './url';
import { detectDataType, extractPropertiesFromJson } from './validation';

type FormEntry = [string, string];

/** Writes test values into a body or URL: the tested parameter's test value, and random values for the others. */
interface ParameterWriter {
  setTestValue: (name: string, value: unknown) => void;
  setRandomValue: (name: string, value: string | number) => void;
}

const ARRAY_INDEX_REGEX = /\[(\d+)]/g;
const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD']);
const URLENCODED_CONTENT_TYPE_REGEX = /application\/x-www-form-urlencoded/i;

// ---------- Requests ----------

/** Builds the request to send; GET and HEAD requests never get a body. */
export function createHttpRequest(
  body: RequestBody,
  headers: Record<string, string>,
  method: Method | (string & {}),
  url: string,
): HttpRequest {
  const request: HttpRequest = { url, method, headers };
  if (body && !METHODS_WITHOUT_BODY.has(method.toUpperCase())) request.body = body;

  return request;
}

/**
 * Builds a request for one test: the tested body or query parameter gets the test value, and every other
 * parameter with a random type (e.g. randomInt) gets a new random value. The original body is not modified.
 */
export function createTestHttpRequest(options: TestOptions): HttpRequest {
  const { body, bodyParameters, headers, method, parameterName, parameterType, queryParameters, testData, url } =
    options;
  const testBody = structuredClone(body);

  if (isFormDataBody(testBody)) {
    const writer = createFormDataParameterWriter(testBody, bodyParameters);

    applyParameterValues(bodyParameters, parameterType === 'body' ? parameterName : undefined, testData, writer);
  } else if (isFieldsBody(testBody)) {
    const fields = testBody.entries;
    const writer = createTextParameterWriter((name, value) => updateField(fields, name, value));

    applyParameterValues(bodyParameters, parameterType === 'body' ? parameterName : undefined, testData, writer);
  } else if (isObject(testBody)) {
    const target = testBody;
    const setValue = (name: string, value: unknown) => setDeepObjectProperty(target, name, value);

    applyParameterValues(bodyParameters, parameterType === 'body' ? parameterName : undefined, testData, {
      setTestValue: setValue,
      setRandomValue: setValue,
    });
  }

  const testUrl = new URL(url);
  const queryWriter = createTextParameterWriter((name, value) => testUrl.searchParams.set(name, value));
  applyParameterValues(queryParameters, parameterType === 'query' ? parameterName : undefined, testData, queryWriter);

  return createHttpRequest(testBody, headers, method, testUrl.toString());
}

// ---------- Bodies ----------

/** Builds the body that is sent from the editor body: form-data or urlencoded fields, or the parsed raw text. */
export function buildRequestBody(body: PostmanBody): RequestBody {
  return buildFieldsBody(body) ?? (tryParseJsonObject(body.raw ?? null) as RequestBody);
}

/**
 * The body's testable parameters with their initial test settings: every form field, or every JSON property
 * (objects and arrays themselves are marked "do not test", only their children are tested). Every form-data file is
 * a `file` parameter of its own: "videos[0]", "videos[1]" when a field has several (see getFormDataFileFields); a
 * file wins over a text field of the same name.
 */
export function extractBodyParameters(body: unknown): RequestParameters {
  const parameters: RequestParameters = {};

  if (isFieldsBody(body)) {
    for (const [key, value] of body.entries) parameters[key] = getInitialParameterValue(detectDataType(value), value);
    if (isFormDataBody(body))
      for (const [field] of getFormDataFileFields(body.files)) parameters[field] = getInitialParameterValue('file');
  } else if (isObject(body)) {
    for (const [path, type] of Object.entries(extractPropertiesFromJson(body))) {
      if (type === 'DO_NOT_TEST') {
        parameters[path] = getInitialParameterValue('do-not-test', '', false);
        continue;
      }

      // JSON values (e.g. booleans) are stored as they are; for most types the value is replaced by the settings
      const value = getValueAtPath(body, path) as ParameterValue['value'];
      parameters[path] = getInitialParameterValue(detectDataType(value, true), value);
    }
  }

  return parameters;
}

/** A body parameter's value: a form field by name, or a JSON property by dot/bracket notation path. */
export function getBodyParameterValue(body: RequestBody, parameterName: string): unknown {
  if (isFieldsBody(body)) return body.entries.find(([key]) => key === parameterName)?.[1];

  return getValueAtPath(body, parameterName);
}

/** Beautifies the raw body editor text: indents JSON, leaves any other text unchanged (it is sent as typed). */
export function formatBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

export function convertUrlEncodedToFormEntries(encoded: string): FormEntry[] {
  return Array.from(new URLSearchParams(encoded).entries());
}

// ---------- Headers ----------

/** The header's name as written in `headers`, found case-insensitively. */
export function getHeaderKey(headers: Record<string, string>, headerName: string): string | undefined {
  return Object.keys(headers).find((key) => key.toLowerCase() === headerName.toLowerCase());
}

/** The header's value, found case-insensitively; an empty string when missing. */
export function getHeaderValue(headers: Record<string, string>, headerName: string): string {
  const headerKey = getHeaderKey(headers, headerName);

  return headerKey ? String(headers[headerKey]) : '';
}

/** Whether the headers declare a urlencoded body. */
export function hasUrlEncodedContentType(headers: Record<string, string>): boolean {
  return isUrlEncodedContentType(getHeaderValue(headers, 'content-type'));
}

/** Whether a Content-Type value is urlencoded, also with parameters such as `; charset=utf-8`. */
export function isUrlEncodedContentType(contentType: string): boolean {
  return URLENCODED_CONTENT_TYPE_REGEX.test(contentType);
}

// ---------- Responses ----------

/** The numeric status code from a status like "200 OK"; 0 when there is none (e.g. a network error). */
export function extractStatusCode(response: HttpResponse | null): number {
  const statusCode = parseInt(String(response?.status || '').split(' ')[0] || '0', 10);

  return Number.isFinite(statusCode) ? statusCode : 0;
}

/** Whether the request was cancelled by the user (the HTTP handler resolves it with this status, it doesn't throw). */
export function isAbortedResponse(response: HttpResponse | null | undefined): boolean {
  return response?.status === RESPONSE_STATUS_LABEL.ABORTED;
}

// ---------- Test parameters ----------

/** Default test settings for a parameter of the given type, taken from the test engine configuration. */
export function getInitialParameterValue(
  type: DataType,
  value: ParameterValue['value'] = '',
  mandatory = true,
): ParameterValue {
  const parameterValue: ParameterValue = { mandatory, type, value };
  const settings = store.getState().settings.testEngine.configuration;

  switch (type) {
    case 'enum':
      return { ...parameterValue, value: settings.enum };
    case 'number':
    case 'numeric_string':
      return { ...parameterValue, value: settings.number };
    case 'string':
      return { ...parameterValue, value: { min: settings.string.minLength, max: settings.string.maxLength } };
    case 'file':
      return { ...parameterValue, value: [...FILE_FORMATS] };
    default:
      return parameterValue;
  }
}

/**
 * The extracted parameters, each replaced by the user's saved mapping when one exists. Any field may be mapped to any
 * type (e.g. a file field tested with strings), but `file` only where a file can be sent: a saved `file` mapping is
 * ignored unless `canBeFile` (a form-data body), and the extracted parameter is used instead.
 */
export function applyMapping(
  extracted: RequestParameters,
  mapped: RequestParameters,
  canBeFile = false,
): RequestParameters {
  return Object.fromEntries(
    Object.keys(extracted).map((key) => {
      const useMapping = key in mapped && (canBeFile || mapped[key].type !== 'file');

      return [key, useMapping ? mapped[key] : extracted[key]];
    }),
  );
}

/**
 * The testable body and query parameters of a sent request (its variable-substituted body and URL), with the user's
 * saved mapping of that request applied.
 */
export function extractRequestParameters(
  body: unknown,
  url: string,
  mapping: MappingsState[string] | undefined,
): { bodyParameters: RequestParameters; queryParameters: RequestParameters } {
  const queryParameters = Object.fromEntries(
    Object.entries(extractQueryParameters(url)).map(([key, value]) => [
      key,
      getInitialParameterValue(detectDataType(value), value),
    ]),
  );

  return {
    bodyParameters: applyMapping(extractBodyParameters(body), mapping?.body ?? {}, isFormDataBody(body)),
    queryParameters: applyMapping(queryParameters, mapping?.query ?? {}),
  };
}

// ---------- Helpers ----------

/** Sets the first field with the given name; a missing field is not added. */
function updateField(fields: FormEntry[], name: string, value: string): void {
  const field = fields.find(([key]) => key === name);
  if (field) field[1] = value;
}

/** The index in `body.files` of the file a parameter names (e.g. "videos[1]"); -1 when it names no file. */
function findFormDataFile(body: FormDataBody, parameterName: string): number {
  return getFormDataFileFields(body.files).findIndex(([field]) => field === parameterName);
}

/**
 * Sends a form-data parameter as text. A file parameter (e.g. a file tested with strings) becomes a text field of the
 * file's field name, in place of that one file; the field's other files are kept. A field the body doesn't have is
 * not added.
 */
function setFormDataText(body: FormDataBody, parameterName: string, value: string): void {
  const fileIndex = findFormDataFile(body, parameterName);
  if (fileIndex !== -1) {
    const [name] = body.files![fileIndex];
    body.files = body.files!.filter((_, index) => index !== fileIndex);
    body.entries.push([name, value]);
    return;
  }

  const field = body.entries.find(([key]) => key === parameterName);
  if (field) field[1] = value;
}

/**
 * Sends a form-data parameter as a file. A file parameter gets the file in place of its own file (the field's other
 * files are kept); a text field (e.g. tested with files) is replaced by the file. A field the body doesn't have is not
 * added.
 */
function setFormDataFile(body: FormDataBody, parameterName: string, filePath: string): void {
  const fileIndex = findFormDataFile(body, parameterName);
  if (fileIndex !== -1) {
    body.files![fileIndex] = [body.files![fileIndex][0], filePath];
    return;
  }

  if (!body.entries.some(([key]) => key === parameterName)) return;

  body.entries = body.entries.filter(([key]) => key !== parameterName);
  body.files = [...(body.files ?? []), [parameterName, filePath]];
}

/** Reads a value by dot/bracket notation path; `undefined` as soon as a step is null or undefined. */
function getValueAtPath(source: unknown, path: string): unknown {
  let value: unknown = source;

  for (const segment of path.replace(ARRAY_INDEX_REGEX, '.$1').split('.')) {
    if (value === null || value === undefined) return undefined;

    value = (value as Record<string, unknown>)[segment];
  }

  return value;
}

/**
 * Sets the tested parameter to the test value (when there is one), and every other parameter whose type is
 * a random type to a new random value.
 */
function applyParameterValues(
  parameters: RequestParameters,
  testedParameterName: string | undefined,
  testData: TestData | undefined,
  writer: ParameterWriter,
): void {
  if (testedParameterName && testData) writer.setTestValue(testedParameterName, testData.value);

  for (const [name, { type }] of Object.entries(parameters)) {
    if (name === testedParameterName) continue;

    const randomValue = generateRandomValue(type);
    if (randomValue !== null) writer.setRandomValue(name, randomValue);
  }
}

/**
 * Writer for text values (form fields, query parameters). A test value is stringified so its type survives
 * (e.g. the string "42" becomes `"42"`, unlike the number 42).
 */
function createTextParameterWriter(setValue: (name: string, value: string) => void): ParameterWriter {
  return {
    setTestValue: (name, value) => setValue(name, stringifyValue(value)),
    setRandomValue: (name, value) => setValue(name, String(value)),
  };
}

/**
 * Writer for a form-data body: like the text writer, but the field's mapping decides how its test value is sent,
 * whatever the field is in the request: a `file` parameter's test value is the path of the file to send, any other
 * parameter's value is sent as text. Random values are always text (no random type is a file).
 */
function createFormDataParameterWriter(body: FormDataBody, parameters: RequestParameters): ParameterWriter {
  const textWriter = createTextParameterWriter((name, value) => setFormDataText(body, name, value));

  return {
    ...textWriter,
    setTestValue: (name, value) => {
      if (parameters[name]?.type === 'file') setFormDataFile(body, name, String(value));
      else textWriter.setTestValue(name, value);
    },
  };
}
