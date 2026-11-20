import { FormDataBody, FormEntry, HttpRequest, RequestBody } from 'shared/types/http';
import { MappingsState } from 'shared/types/mappings';
import { TestEngineConfiguration } from 'shared/types/settings';
import { DataType, ParameterValue, RequestParameters, TestData, TestOptions } from 'shared/types/testing';
import { getFormDataFileFields, isFieldsBody, isFormDataBody } from 'shared/utils/http';
import { createHttpRequest } from 'src/utils/http';
import { isObject, setDeepObjectProperty, stringifyValue } from 'src/utils/object';
import { generateRandomValue } from 'src/utils/random';
import { extractQueryParameters } from 'src/utils/url';
import { detectDataType, extractPropertiesFromJson } from 'src/utils/validation';

/** Writes test values into a body or URL: the tested parameter's test value, and random values for the others. */
interface ParameterWriter {
  setTestValue: (name: string, value: unknown) => void;
  setRandomValue: (name: string, value: string | number) => void;
}

const ARRAY_INDEX_REGEX = /\[(\d+)]/g;

// ---------- Requests ----------

/**
 * Builds a request for one test: the tested body or query parameter gets the test value, and every other
 * parameter with a random type (e.g. randomInt) gets a new random value. The original body is not modified.
 */
export function createTestHttpRequest(options: TestOptions, settings: TestEngineConfiguration): HttpRequest {
  const { body, bodyParameters, headers, method, parameterName, parameterType, queryParameters, testData, url } =
    options;
  const testBody = structuredClone(body);
  const testedBodyParameterName = parameterType === 'body' ? parameterName : undefined;
  const applyBodyValues = (writer: ParameterWriter) =>
    applyParameterValues(bodyParameters, testedBodyParameterName, testData, writer, settings);

  if (isFormDataBody(testBody)) {
    applyBodyValues(createFormDataParameterWriter(testBody, bodyParameters));
  } else if (isFieldsBody(testBody)) {
    const fields = testBody.entries;
    applyBodyValues(createTextParameterWriter((name, value) => updateField(fields, name, value)));
  } else if (isObject(testBody)) {
    const target = testBody;
    const setValue = (name: string, value: unknown) => setDeepObjectProperty(target, name, value);
    applyBodyValues({ setTestValue: setValue, setRandomValue: setValue });
  }

  const testUrl = new URL(url);
  const queryWriter = createTextParameterWriter((name, value) => testUrl.searchParams.set(name, value));
  const testedQueryParameterName = parameterType === 'query' ? parameterName : undefined;
  applyParameterValues(queryParameters, testedQueryParameterName, testData, queryWriter, settings);

  return createHttpRequest(testBody, headers, method, testUrl.toString());
}

// ---------- Parameters ----------

/**
 * The body's testable parameters with their initial test settings: every form field, or every JSON property
 * (objects and arrays themselves are marked "do not test", only their children are tested). Every form-data file is
 * a `file` parameter of its own: "videos[0]", "videos[1]" when a field has several (see getFormDataFileFields); a
 * file wins over a text field of the same name.
 */
export function extractBodyParameters(body: unknown, settings: TestEngineConfiguration): RequestParameters {
  const parameters: RequestParameters = {};

  if (isFieldsBody(body)) {
    for (const [key, value] of body.entries)
      parameters[key] = getInitialParameterValue(detectDataType(value), settings, value);
    if (isFormDataBody(body))
      for (const [field] of getFormDataFileFields(body.files))
        parameters[field] = getInitialParameterValue('file', settings);
  } else if (isObject(body)) {
    for (const [path, type] of Object.entries(extractPropertiesFromJson(body))) {
      if (type === 'DO_NOT_TEST') {
        parameters[path] = getInitialParameterValue('do-not-test', settings, '', false);
        continue;
      }

      // JSON values (e.g. booleans) are stored as they are; for most types the value is replaced by the settings
      const value = getValueAtPath(body, path) as ParameterValue['value'];
      parameters[path] = getInitialParameterValue(detectDataType(value, true), settings, value);
    }
  }

  return parameters;
}

/** A body parameter's value: a form field by name, or a JSON property by dot/bracket notation path. */
export function getBodyParameterValue(body: RequestBody, parameterName: string): unknown {
  if (isFieldsBody(body)) return body.entries.find(([key]) => key === parameterName)?.[1];

  return getValueAtPath(body, parameterName);
}

/** Default test settings for a parameter of the given type, taken from the test engine settings. */
export function getInitialParameterValue(
  type: DataType,
  settings: TestEngineConfiguration,
  value: ParameterValue['value'] = '',
  mandatory = true,
): ParameterValue {
  const parameterValue: ParameterValue = { mandatory, type, value };

  switch (type) {
    case 'enum':
      return { ...parameterValue, value: settings.enum };
    case 'number':
    case 'numeric_string':
      return { ...parameterValue, value: settings.number };
    case 'string':
      return { ...parameterValue, value: { min: settings.string.minLength, max: settings.string.maxLength } };
    default:
      return parameterValue;
  }
}

/**
 * The extracted parameters, each replaced by the user's saved mapping when one exists. Any field may be mapped to any
 * type (e.g. a file field tested with strings), but `file` only where a file can be sent: a saved `file` mapping is
 * ignored unless `canBeFile` (a form-data body), and the extracted parameter is used instead.
 */
function applyMapping(extracted: RequestParameters, mapped: RequestParameters, canBeFile = false): RequestParameters {
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
  settings: TestEngineConfiguration,
): { bodyParameters: RequestParameters; queryParameters: RequestParameters } {
  const queryParameters = Object.fromEntries(
    Object.entries(extractQueryParameters(url)).map(([key, value]) => [
      key,
      getInitialParameterValue(detectDataType(value), settings, value),
    ]),
  );

  return {
    bodyParameters: applyMapping(extractBodyParameters(body, settings), mapping?.body ?? {}, isFormDataBody(body)),
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
  settings: TestEngineConfiguration,
): void {
  if (testedParameterName && testData) writer.setTestValue(testedParameterName, testData.value);

  for (const [name, { type }] of Object.entries(parameters)) {
    if (name === testedParameterName) continue;

    const randomValue = generateRandomValue(type, settings);
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
