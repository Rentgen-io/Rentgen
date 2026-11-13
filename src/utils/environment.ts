import {
  DataType,
  DynamicVariable,
  Environment,
  EnvironmentVariable,
  ExtractionFailure,
  PostmanBody,
  PostmanBodyMode,
  RequestBody,
} from 'src/types';
import { buildRequestBody, getHeaderKey, parseHeaders } from './http';
import { generateRandomValue } from './random';

interface SubstitutedRequest {
  body: RequestBody;
  headers: Record<string, string>;
  url: string;
}

type Substitute = (text: string) => string;

const ARRAY_INDEX_REGEX = /\[(\d+)]/g;
const VARIABLE_PLACEHOLDER_REGEX = /\{\{([^}]+)}}/g;
// Raw bodies are left out: their content type depends on the text (JSON, XML, ...), so the user sets it
const BODY_MODE_CONTENT_TYPES: Partial<Record<PostmanBodyMode, string>> = {
  formdata: 'multipart/form-data',
  urlencoded: 'application/x-www-form-urlencoded',
};

// ---------- Variable extraction ----------

/**
 * Reads a value by a dot/bracket notation path; `undefined` when the path doesn't exist.
 * @example extractValue({ data: { users: [{ id: 1 }] } }, 'data.users[0].id') → 1
 */
export function extractValue(source: unknown, path: string): unknown {
  if (!path || source === null || source === undefined) return undefined;

  const segments = path.replace(ARRAY_INDEX_REGEX, '.$1').split('.').filter(Boolean);
  let current: unknown = source;

  for (const segment of segments) {
    if (current === null || typeof current !== 'object') return undefined;

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

/** Converts an extracted value to the string stored in a dynamic variable; `null` when there is no value. */
export function stringifyExtractedValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  return JSON.stringify(value);
}

/** Warning for the dynamic variables that failed to extract; the reason is shown only for a single failure. */
export function formatExtractionWarning(failures: ExtractionFailure[]): string | null {
  if (failures.length === 0) return null;
  if (failures.length === 1) return `Failed to extract {{${failures[0].variableName}}}: ${failures[0].reason}`;

  return `Failed to extract: ${failures.map(({ variableName }) => `{{${variableName}}}`).join(', ')}`;
}

// ---------- Variable substitution ----------

/**
 * Replaces `{{variables}}` in the URL, headers and body with the environment and dynamic variables, and parses
 * the headers and body into the form that is sent.
 * Without any variables the text is left as is; otherwise an unknown `{{variable}}` becomes an empty string.
 */
export function substituteRequestVariables(
  body: PostmanBody,
  environment: Environment | null,
  dynamicVariables: DynamicVariable[],
  headers: string,
  url: string,
): SubstitutedRequest {
  const staticVariables = environment?.variables ?? [];
  // Guards against callers passing `undefined` despite the type
  const allDynamicVariables = dynamicVariables ?? [];
  const hasVariables = staticVariables.length > 0 || allDynamicVariables.length > 0;
  const variables = hasVariables ? buildVariables(staticVariables, allDynamicVariables, environment?.id || null) : null;

  const substitute: Substitute = (text) => (variables ? substituteVariables(text, variables) : text);

  return {
    body: buildRequestBody(substituteBodyVariables(body, substitute)),
    headers: withBodyContentType(parseHeaders(substitute(headers)), body),
    url: substitute(url),
  };
}

// ---------- Helpers ----------

/**
 * Variable values by name. Dynamic variables override environment variables, and apply when they are global
 * or belong to the selected environment.
 */
function buildVariables(
  staticVariables: EnvironmentVariable[],
  dynamicVariables: DynamicVariable[],
  environmentId: string | null,
): Map<string, string> {
  const variables = new Map<string, string>();

  for (const { key, value } of staticVariables) {
    if (!key || !value) continue;

    // A random keyword (e.g. "randomEmail") gets a new random value on every request
    variables.set(key, String(generateRandomValue(value as DataType) ?? value));
  }

  for (const variable of dynamicVariables) {
    const isApplicable = variable.environmentId === null || variable.environmentId === environmentId;
    if (isApplicable && variable.currentValue !== null) variables.set(variable.key, variable.currentValue);
  }

  return variables;
}

function substituteVariables(text: string, variables: Map<string, string>): string {
  return text.replace(VARIABLE_PLACEHOLDER_REGEX, (_, name: string) => variables.get(name.trim()) ?? '');
}

/** Substitutes the raw body and the keys and values of form-data and urlencoded fields. */
function substituteBodyVariables(body: PostmanBody, substitute: Substitute): PostmanBody {
  const substituteField = <T extends { key: string; value?: string }>(field: T): T => ({
    ...field,
    key: substitute(field.key),
    ...(field.value !== undefined && { value: substitute(field.value) }),
  });

  return {
    ...body,
    ...(body.raw !== undefined && { raw: substitute(body.raw) }),
    ...(body.formdata && { formdata: body.formdata.map(substituteField) }),
    ...(body.urlencoded && { urlencoded: body.urlencoded.map(substituteField) }),
  };
}

/**
 * Adds the Content-Type of a form-data or urlencoded body, as Postman does, unless the user set one.
 * Axios would set it anyway (with the multipart boundary), but this way it appears in test results, reports
 * and cURL exports, and the AI copies it into the requests it writes.
 */
function withBodyContentType(headers: Record<string, string>, body: PostmanBody): Record<string, string> {
  const contentType = body.mode && BODY_MODE_CONTENT_TYPES[body.mode];
  if (!contentType || getHeaderKey(headers, 'content-type')) return headers;

  return { ...headers, 'Content-Type': contentType };
}
