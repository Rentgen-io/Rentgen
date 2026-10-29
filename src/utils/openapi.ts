import { RESPONSE_STATUS } from 'shared/responseStatus';
import { sendHttp } from 'src/api/network';
import {
  OpenApiDocument,
  OpenApiMethod,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiPathItem,
  OpenApiRequestBody,
  OpenApiSchemaObject,
  OpenApiSecurityScheme,
  OpenApiServer,
  PostmanBody,
  PostmanFolder,
  PostmanHeader,
  PostmanItem,
  PostmanRequest,
} from 'src/types';
import { generateFolderId, generateRequestId } from './collection';
import { extractStatusCode } from './http';
import { isPlainObject, parseJsonObject } from './object';
import { generateRandomNumber } from './random';

const HTTP_METHODS: OpenApiMethod[] = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];
const JSON_CONTENT_TYPE = /^application\/([\w.+-]+\+)?json$/i;
const ABSOLUTE_URL = /^[a-z][a-z\d+\-.]*:\/\//i;
const TEMPLATE_PLACEHOLDER = /\{([^{}]+)}/g;
const RENTGEN_VARIABLE = /^\{\{[^{}]+}}$/;
const DEFAULT_FOLDER_NAME = 'Imported API';
const BASE_URL_PLACEHOLDER = '{{baseUrl}}';
const MAX_NAME_LENGTH = 80;
const MAX_REQUESTS = 1000;
const MAX_SAMPLE_DEPTH = 5;
const MAX_SAMPLE_PROPERTIES = 50;
const RANDOM_NUMBER_MIN = 0;
const RANDOM_NUMBER_MAX = 10000;

// Random numbers generated for one first path segment during an import, keyed by their `min:max` range
type RandomNumberCache = Map<string, number>;

export function isOpenApiSchema(value: unknown): value is OpenApiDocument {
  if (!isPlainObject(value) || !isPlainObject(value.info)) return false;

  const isOpenApi3 = typeof value.openapi === 'string' && /^3\.\d+/.test(value.openapi);
  const isSwagger2 = value.swagger === '2.0';
  if (!isOpenApi3 && !isSwagger2) return false;

  // OpenAPI 3.1 allows documents without `paths` as long as `webhooks` or `components` exist
  return isPlainObject(value.paths) || isPlainObject(value.webhooks) || isPlainObject(value.components);
}

export async function fetchOpenApiSchema(url: string): Promise<OpenApiDocument | null> {
  try {
    const response = await sendHttp({ method: 'GET', url, headers: { Accept: 'application/json' } });
    const statusCode = extractStatusCode(response);
    if (statusCode < RESPONSE_STATUS.OK || statusCode >= RESPONSE_STATUS.REDIRECT) return null;

    const schema = parseJsonObject(response.body);
    return isOpenApiSchema(schema) ? schema : null;
  } catch {
    return null;
  }
}

/**
 * Convert an OpenAPI/Swagger document into a collection folder holding one request per operation.
 * `sourceUrl` is the location the document was downloaded from and is used to resolve relative server URLs.
 */
export function openApiToFolder(document: OpenApiDocument, sourceUrl?: string): PostmanFolder {
  const documentBaseUrl = resolveBaseUrl(document.servers, document, sourceUrl) || BASE_URL_PLACEHOLDER;
  const paths = isPlainObject(document.paths) ? document.paths : {};
  const items: PostmanItem[] = [];
  const randomNumbersBySegment = new Map<string, RandomNumberCache>();

  for (const [path, rawPathItem] of Object.entries(paths)) {
    if (items.length >= MAX_REQUESTS) break;

    const pathItem = deref<OpenApiPathItem>(document, rawPathItem);
    if (!pathItem) continue;

    const segment = firstPathSegment(path);
    let randomNumbers = randomNumbersBySegment.get(segment);
    if (!randomNumbers) {
      randomNumbers = new Map();
      randomNumbersBySegment.set(segment, randomNumbers);
    }

    for (const method of HTTP_METHODS) {
      if (items.length >= MAX_REQUESTS) break;

      const operation = pathItem[method];
      if (!isPlainObject(operation)) continue;

      items.push(buildItem(document, pathItem, operation, method, path, documentBaseUrl, randomNumbers, sourceUrl));
    }
  }

  return {
    id: generateFolderId(),
    name: document.info?.title?.trim() || DEFAULT_FOLDER_NAME,
    item: items,
  };
}

function firstPathSegment(path: string): string {
  return path.split('/').find((segment) => segment.length > 0) ?? '';
}

function buildItem(
  document: OpenApiDocument,
  pathItem: OpenApiPathItem,
  operation: OpenApiOperation,
  method: OpenApiMethod,
  path: string,
  documentBaseUrl: string,
  randomNumbers: RandomNumberCache,
  sourceUrl?: string,
): PostmanItem {
  const parameters = collectParameters(document, pathItem, operation);
  const security = buildSecurity(document, operation);
  const baseUrl = resolveBaseUrl(operation.servers ?? pathItem.servers, document, sourceUrl) || documentBaseUrl;
  const { body, contentType } = buildBody(document, operation, parameters);
  const query = buildQuery(document, parameters, security.query, randomNumbers);

  const request: PostmanRequest = {
    method: method.toUpperCase(),
    url: `${baseUrl}${buildPath(document, path, parameters)}${query}`,
    header: buildHeaders(document, parameters, security.headers, contentType),
  };

  if (body) request.body = body;

  return {
    id: generateRequestId(),
    name: operationName(operation, path),
    request,
  };
}

/**
 * Operations often carry a full sentence as their summary, which is unreadable in the collection list,
 * so long summaries fall back to the operation id or to `/path`.
 */
function operationName(operation: OpenApiOperation, path: string): string {
  const summary = operation.summary?.trim();
  if (summary && summary.length <= MAX_NAME_LENGTH) return summary;

  return operation.operationId?.trim() || path;
}

function resolveRef(document: OpenApiDocument, ref: string): unknown {
  if (!ref.startsWith('#/')) return undefined;

  let current: unknown = document;

  for (const token of ref.slice(2).split('/')) {
    if (!isPlainObject(current)) return undefined;
    current = current[token.replace(/~1/g, '/').replace(/~0/g, '~')];
  }

  return current;
}

function deref<T>(document: OpenApiDocument, value: unknown): T | undefined {
  const visited = new Set<string>();
  let current: unknown = value;

  while (isPlainObject(current) && typeof current.$ref === 'string') {
    if (visited.has(current.$ref)) return undefined;

    visited.add(current.$ref);
    current = resolveRef(document, current.$ref);
  }

  return isPlainObject(current) ? (current as T) : undefined;
}

/**
 * Base URL declared by the given servers (or Swagger 2.0 `host`/`basePath`), or an empty string when none is declared.
 * Relative URLs are resolved against `sourceUrl`, or prefixed with the `{{baseUrl}}` placeholder when it is unknown.
 */
function resolveBaseUrl(servers: OpenApiServer[] | undefined, document: OpenApiDocument, sourceUrl?: string): string {
  const server = servers?.find((candidate) => !!candidate?.url);
  let baseUrl = server?.url ? substituteServerVariables(server.url, server) : '';

  // Swagger 2.0 describes the base URL through `schemes`, `host` and `basePath`
  if (!baseUrl && !servers) {
    if (document.host) baseUrl = `${document.schemes?.[0] || 'https'}://${document.host}${document.basePath || ''}`;
    else baseUrl = document.basePath || '';
  }

  if (!baseUrl) return '';

  if (!ABSOLUTE_URL.test(baseUrl)) {
    let resolved: string | undefined;

    if (sourceUrl)
      try {
        resolved = new URL(baseUrl, sourceUrl).toString();
      } catch {
        // Fall back to the placeholder when the relative base URL cannot be resolved against the source
      }

    baseUrl = resolved ?? `${BASE_URL_PLACEHOLDER}/${baseUrl.replace(/^\/+/, '')}`;
  }

  return baseUrl.replace(/\/+$/, '');
}

function substituteServerVariables(url: string, server: OpenApiServer): string {
  if (!server.variables) return url;

  return url.replace(TEMPLATE_PLACEHOLDER, (placeholder, name: string) => {
    const variable = server.variables?.[name];
    const value = variable?.default ?? variable?.enum?.[0];

    return value === undefined ? placeholder : String(value);
  });
}

function collectParameters(
  document: OpenApiDocument,
  pathItem: OpenApiPathItem,
  operation: OpenApiOperation,
): OpenApiParameter[] {
  const parameters = new Map<string, OpenApiParameter>();

  // Operation parameters override path item parameters with the same name and location
  for (const parameter of [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])]) {
    const resolved = deref<OpenApiParameter>(document, parameter);
    if (!resolved?.in) continue;
    if (!resolved.name && resolved.in !== 'body') continue;

    parameters.set(`${resolved.in}:${resolved.name ?? ''}`, resolved);
  }

  return [...parameters.values()];
}

/**
 * Value declared by the spec for a parameter, or `undefined` when the spec only describes its type.
 */
function declaredValue(document: OpenApiDocument, parameter: OpenApiParameter): unknown {
  const schema = deref<OpenApiSchemaObject>(document, parameter.schema);
  const candidates = [
    parameter.example,
    parameter.default,
    parameter.enum?.[0],
    schema?.example,
    schema?.default,
    schema?.enum?.[0],
  ];

  return candidates.find((candidate) => candidate !== undefined && candidate !== null);
}

/**
 * Declared example for a parameter, falling back to a `{{name}}` variable the user can bind later.
 */
function parameterValue(document: OpenApiDocument, parameter: OpenApiParameter): string {
  const value = declaredValue(document, parameter);
  if (value === undefined) return `{{${parameter.name}}}`;

  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function encodeValue(value: string): string {
  return RENTGEN_VARIABLE.test(value) ? value : encodeURIComponent(value);
}

function buildPath(document: OpenApiDocument, path: string, parameters: OpenApiParameter[]): string {
  return path.replace(TEMPLATE_PLACEHOLDER, (_, name: string) => {
    const parameter = parameters.find((candidate) => candidate.in === 'path' && candidate.name === name);

    return encodeValue(parameter ? parameterValue(document, parameter) : `{{${name}}}`);
  });
}

function buildQuery(
  document: OpenApiDocument,
  parameters: OpenApiParameter[],
  securityQuery: PostmanHeader[],
  randomNumbers: RandomNumberCache,
): string {
  const pairs: string[] = [];

  for (const parameter of parameters) {
    if (parameter.in !== 'query') continue;

    const value =
      declaredValue(document, parameter) !== undefined
        ? parameterValue(document, parameter)
        : generatedQueryValue(document, parameter, randomNumbers);
    if (value !== undefined) pairs.push(`${encodeURIComponent(parameter.name!)}=${encodeValue(value)}`);
    else if (parameter.required)
      pairs.push(`${encodeURIComponent(parameter.name!)}=${encodeValue(parameterValue(document, parameter))}`);
  }

  for (const { key, value } of securityQuery) pairs.push(`${encodeURIComponent(key)}=${encodeValue(value)}`);

  return pairs.length > 0 ? `?${pairs.join('&')}` : '';
}

/**
 * Sample value for a query parameter without a declared value, so the imported request is runnable as-is.
 * Only scalar string and numeric parameters get one; other types return `undefined`.
 */
function generatedQueryValue(
  document: OpenApiDocument,
  parameter: OpenApiParameter,
  randomNumbers: RandomNumberCache,
): string | undefined {
  // Swagger 2.0 declares type, format and bounds on the parameter itself instead of a schema
  const schema = deref<OpenApiSchemaObject>(document, parameter.schema) ?? parameter;
  const type = Array.isArray(schema.type) ? schema.type.find((candidate) => candidate !== 'null') : schema.type;

  if (type === 'integer' || type === 'number')
    return String(
      cachedRandomNumber(randomNumbers, schema.minimum ?? RANDOM_NUMBER_MIN, schema.maximum ?? RANDOM_NUMBER_MAX),
    );
  if (type === 'string') return String(samplePrimitive(type, schema.format));

  return undefined;
}

/**
 * Reuses the number generated earlier for an identical range, so related parameters stay consistent.
 */
function cachedRandomNumber(randomNumbers: RandomNumberCache, min: number, max: number): number {
  const key = `${min}:${max}`;
  let value = randomNumbers.get(key);

  if (value === undefined) {
    value = generateRandomNumber(min, max);
    randomNumbers.set(key, value);
  }

  return value;
}

function buildHeaders(
  document: OpenApiDocument,
  parameters: OpenApiParameter[],
  securityHeaders: PostmanHeader[],
  contentType?: string,
): PostmanHeader[] {
  const headers: PostmanHeader[] = [];
  const seen = new Set<string>();

  const add = (key: string, value: string) => {
    if (seen.has(key.toLowerCase())) return;

    seen.add(key.toLowerCase());
    headers.push({ key, value });
  };

  for (const parameter of parameters)
    if (parameter.in === 'header' && parameter.name) add(parameter.name, parameterValue(document, parameter));

  for (const { key, value } of securityHeaders) add(key, value);
  if (contentType) add('Content-Type', contentType);

  return headers;
}

function buildSecurity(
  document: OpenApiDocument,
  operation: OpenApiOperation,
): { headers: PostmanHeader[]; query: PostmanHeader[] } {
  const headers: PostmanHeader[] = [];
  const query: PostmanHeader[] = [];
  const requirements = operation.security ?? document.security;
  const schemes = document.components?.securitySchemes ?? document.securityDefinitions;

  // An empty requirement means authentication is optional, so pick the first one that requires a scheme
  const requirement = requirements?.find((candidate) => Object.keys(candidate ?? {}).length > 0);
  if (!requirement || !schemes) return { headers, query };

  for (const name of Object.keys(requirement)) {
    const scheme = deref<OpenApiSecurityScheme>(document, schemes[name]);
    if (!scheme) continue;

    if (scheme.type === 'apiKey' && scheme.name) {
      if (scheme.in === 'query') query.push({ key: scheme.name, value: `{{${name}}}` });
      else if (scheme.in === 'header') headers.push({ key: scheme.name, value: `{{${name}}}` });
    } else if (scheme.type === 'http')
      headers.push({
        key: 'Authorization',
        value: `${scheme.scheme?.toLowerCase() === 'basic' ? 'Basic' : 'Bearer'} {{${name}}}`,
      });
    else if (scheme.type === 'basic') headers.push({ key: 'Authorization', value: `Basic {{${name}}}` });
    else if (scheme.type === 'oauth2' || scheme.type === 'openIdConnect')
      headers.push({ key: 'Authorization', value: `Bearer {{${name}}}` });
  }

  return { headers, query };
}

function buildBody(
  document: OpenApiDocument,
  operation: OpenApiOperation,
  parameters: OpenApiParameter[],
): { body?: PostmanBody; contentType?: string } {
  const requestBody = deref<OpenApiRequestBody>(document, operation.requestBody);
  const content = requestBody?.content;

  if (content) {
    const entries = Object.entries(content);
    const [contentType, mediaType] =
      entries.find(([type]) => JSON_CONTENT_TYPE.test(type.split(';')[0].trim())) ??
      entries.find(([type]) => type.startsWith('application/x-www-form-urlencoded')) ??
      entries[0] ??
      [];

    if (!contentType || !mediaType) return {};

    const sample =
      mediaType.example ??
      Object.values(mediaType.examples ?? {}).find((example) => example?.value !== undefined)?.value ??
      sampleSchema(document, mediaType.schema);

    return { body: toPostmanBody(contentType, sample), contentType };
  }

  // Swagger 2.0 carries the request body in `body` and `formData` parameters
  const bodyParameter = parameters.find((parameter) => parameter.in === 'body');
  if (bodyParameter) {
    const sample = declaredValue(document, bodyParameter) ?? sampleSchema(document, bodyParameter.schema);
    // The sample is built from a JSON schema, so only JSON content types can be serialized faithfully
    const contentType =
      (operation.consumes ?? document.consumes)?.find((type) => JSON_CONTENT_TYPE.test(type.split(';')[0].trim())) ??
      'application/json';

    return { body: toPostmanBody(contentType, sample), contentType };
  }

  const formParameters = parameters.filter((parameter) => parameter.in === 'formData' && parameter.name);
  if (formParameters.length > 0) {
    const sample = Object.fromEntries(
      formParameters.map((parameter) => [parameter.name!, declaredValue(document, parameter) ?? '']),
    );
    const contentType = (operation.consumes ?? document.consumes)?.[0] || 'application/x-www-form-urlencoded';

    return { body: toPostmanBody(contentType, sample), contentType };
  }

  return {};
}

function toPostmanBody(contentType: string, sample: unknown): PostmanBody | undefined {
  if (sample === undefined) return undefined;

  const type = contentType.split(';')[0].trim().toLowerCase();

  if (type === 'application/x-www-form-urlencoded')
    return { mode: 'urlencoded', raw: new URLSearchParams(toFormEntries(sample)).toString() };

  if (type === 'multipart/form-data') return { mode: 'formdata', raw: JSON.stringify(sample, null, 2) };

  if (typeof sample === 'string') return { mode: 'raw', raw: sample };

  return { mode: 'raw', raw: JSON.stringify(sample, null, 2) };
}

function toFormEntries(sample: unknown): Record<string, string> {
  if (!isPlainObject(sample)) return {};

  return Object.fromEntries(
    Object.entries(sample).map(([key, value]) => [
      key,
      value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value),
    ]),
  );
}

function sampleSchema(
  document: OpenApiDocument,
  schema: unknown,
  depth = 0,
  visited: ReadonlySet<unknown> = new Set(),
): unknown {
  const resolved = deref<OpenApiSchemaObject>(document, schema);
  if (!resolved || depth > MAX_SAMPLE_DEPTH || visited.has(resolved)) return null;

  if (resolved.example !== undefined) return resolved.example;
  if (resolved.default !== undefined) return resolved.default;
  if (resolved.enum?.length) return resolved.enum[0];

  // Guards against schemas that reference themselves through `$ref`
  const nextVisited = new Set(visited).add(resolved);

  if (resolved.allOf?.length) {
    const merged: Record<string, unknown> = {};

    for (const part of resolved.allOf) {
      const value = sampleSchema(document, part, depth, nextVisited);
      if (isPlainObject(value)) Object.assign(merged, value);
    }

    return merged;
  }

  const alternative = resolved.oneOf?.[0] ?? resolved.anyOf?.[0];
  if (alternative) return sampleSchema(document, alternative, depth, nextVisited);

  const type = Array.isArray(resolved.type) ? resolved.type.find((candidate) => candidate !== 'null') : resolved.type;

  if (type === 'array' || resolved.items)
    return resolved.items ? [sampleSchema(document, resolved.items, depth + 1, nextVisited)] : [];

  if (type === 'object' || resolved.properties) {
    const sample: Record<string, unknown> = {};

    for (const [key, property] of Object.entries(resolved.properties ?? {})) {
      if (Object.keys(sample).length >= MAX_SAMPLE_PROPERTIES) break;

      sample[key] = sampleSchema(document, property, depth + 1, nextVisited);
    }

    return sample;
  }

  return samplePrimitive(type, resolved.format);
}

function samplePrimitive(type?: string, format?: string): unknown {
  if (type === 'boolean') return true;
  if (type === 'integer' || type === 'number') return 0;
  if (type !== 'string') return null;

  switch (format) {
    case 'date':
      return '2024-01-01';
    case 'date-time':
      return '2024-01-01T00:00:00Z';
    case 'uuid':
      return '00000000-0000-0000-0000-000000000000';
    case 'email':
      return 'user@example.com';
    case 'uri':
    case 'url':
      return 'https://example.com';
    case 'byte':
      return 'c3RyaW5n';
    default:
      return 'string';
  }
}
