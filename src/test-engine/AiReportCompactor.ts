import { HttpBody, HttpRequest, HttpResponse, TestResult, TestStatus } from 'src/types';
import {
  convertUrlEncodedToFormEntries,
  extractPropertiesFromJson,
  extractQueryParameters,
  isObject,
  isUrlEncodedContentType,
  setDeepObjectProperty,
  stringifyValue,
  tryParseJsonObject,
} from 'src/utils';
import { ORIGINAL_REQUEST_TEST_PARAMETER_NAME } from './BaseTests';
import { SENSITIVE_HEADERS } from './SecurityTests';

// ---------- Types ----------

export type CompactStatus = 'bug' | 'fail' | 'fail_no_response' | 'info' | 'manual' | 'pass' | 'warn';

export interface ObjectPatch {
  set?: Record<string, unknown>;
  unset?: string[];
}

export interface RequestDiff {
  method?: string;
  url?: string;
  query?: ObjectPatch;
  headers?: Record<string, string>;
  removedHeaders?: string[];
  body?: unknown;
  bodyPatch?: ObjectPatch;
  noBody?: true;
}

export interface CompactResponse {
  status: string;
  /** Overrides of commonResponseHeaders; omitted when the response has exactly the common headers. */
  headers?: Record<string, string>;
  /** Common response headers this response does not have. */
  removedHeaders?: string[];
  body?: unknown;
}

export interface CompactTest {
  name: string;
  s: CompactStatus;
  exp?: string;
  act?: string;
  value?: unknown;
  req?: RequestDiff;
  res?: string;
  ms?: number;
}

export interface CompactReport {
  originalRequest: HttpRequest;
  fieldMappings?: Record<string, unknown>;
  commonResponseHeaders: Record<string, string>;
  responses: Record<string, CompactResponse>;
  suites: Record<string, CompactTest[]>;
}

export interface RawReport {
  originalRequest: HttpRequest;
  fieldMappings?: Record<string, unknown>;
  suites: Record<string, TestResult[]>;
}

export interface TruncateOptions {
  /** Max length of a single string value. */
  maxString?: number;
  /** Keep only the first N array items. */
  maxArrayItems?: number;
  /** Deeper objects/arrays are collapsed to a summary. */
  maxDepth?: number;
}

export interface NormalizeConfig {
  /** Extra headers to drop entirely (endpoint-specific). */
  dropHeaders?: string[];
  /** Extra headers to keep but mask their value. */
  maskHeaders?: string[];
  /** Body paths that are always masked, e.g. "meta.generatedAt", "items[].id". */
  volatilePaths?: string[];
  /** Learn volatile fields from repeated identical requests. Default: true. */
  learnVolatile?: boolean;
}

export interface CompactOptions {
  /** Passed tests are reduced to {name, s}. */
  onlyFailuresInDetail?: boolean;
  /** Limits for JSON response bodies. */
  truncate?: TruncateOptions;
  /** Limits for test inputs (value, req). Defaults to `truncate`. */
  truncateInputs?: TruncateOptions;
  /** Max length of non-JSON (text/HTML) response bodies. */
  maxTextBody?: number;
  normalize?: NormalizeConfig;
  /** User-masked request fields ("URL", "header.<name>", "body.<path>", "query.<name>"). */
  maskedFields?: string[];
}

interface Volatility {
  paths: Set<string>;
  headers: Set<string>;
}

interface TestedField {
  location: 'body' | 'query';
  path: string;
  value: unknown;
}

type Limits = Required<TruncateOptions>;

// ---------- Universal HTTP rules ----------

/** Connection-level headers (RFC 9110 §7.6.1) plus Date. These never describe API behavior. */
const DROPPED_HEADERS: ReadonlySet<string> = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'te',
  'trailer',
  'upgrade',
  'proxy-connection',
  'date',
]);

/** Standard headers whose presence matters but whose value changes per call. */
const MASKED_HEADERS: ReadonlySet<string> = new Set(['etag', 'last-modified', 'content-length', 'age', 'expires']);

const PLACEHOLDERS = {
  datetime: '<datetime>',
  httpDate: '<http-date>',
  epoch: '<epoch>',
  uuid: '<uuid>',
  jwt: '<jwt>',
  hexId: '<hex-id>',
  token: '<token>',
  varies: '<varies>',
  cookieValue: '<value>',
} as const;

export const DEFAULT_TRUNCATE: Limits = {
  maxString: 50,
  maxArrayItems: 5,
  maxDepth: 6,
};

const DEFAULT_MAX_TEXT_BODY = 50;

/** Prompt section describing the format produced by {@link AiReportCompactor}. Keep in sync with the code below. */
export const AI_REPORT_FORMAT_PROMPT = `INPUT FORMAT (compact report)
- originalRequest is the baseline: url, method, headers, body. It is never
  truncated (it may contain withheld values, see below).
- responses is a dictionary of deduplicated responses ({status, headers, body}).
  Tests reference them by key; several tests may share one response.
- commonResponseHeaders are the headers most responses share. A response's full
  headers are commonResponseHeaders, overridden or extended by its headers, minus
  its removedHeaders. If both are absent, it has exactly commonResponseHeaders.
  A header listed in removedHeaders was really missing from that response.
- suites map suite names to tests. Each test has these fields:
  name   test name. For data-driven tests it names the tested field
         (e.g. body.status, query.page).
  s      result: bug | fail | fail_no_response | info | manual | pass | warn.
  exp    configured expectation.
  act    observed result summary. If absent, it equals exp.
  value  data-driven tests: the tested value. The tested field is set to value
         in the request even when req does not mention it.
  req    differences from originalRequest. If absent, the request equals the
         baseline (apart from value for data-driven tests).
         req.method / req.url replace the baseline values.
         req.query.set / req.query.unset set or remove baseline query parameters.
         req.headers adds or overrides headers.
         req.removedHeaders lists baseline headers that were omitted.
         req.body replaces the whole body. req.noBody=true means no body was sent.
         req.bodyPatch.set / req.bodyPatch.unset set or remove baseline body
         fields by path (e.g. user.tags[0]); the rest of the body is unchanged.
  res    key into responses. If absent, there is no captured HTTP response.
  ms     response time in milliseconds (rounded).
- Reconstruct the full request as originalRequest + req (+ value) before judging it.
- A test with only {name, s:"pass"} is a passed test whose details were
  omitted. Count it as executed coverage; do not ask for its details.
- Response headers removed before sending (connection-level, never evidence):
  ${[...DROPPED_HEADERS].join(', ')}.
  Every other response header is preserved, so a missing security header
  (e.g. X-Content-Type-Options) is real evidence.
- Values in angle brackets are masked placeholders: the field or header WAS
  present, but its exact value was withheld because it changes per call.
  ${PLACEHOLDERS.datetime}, ${PLACEHOLDERS.httpDate}, ${PLACEHOLDERS.epoch}: timestamps.
  ${PLACEHOLDERS.uuid}, ${PLACEHOLDERS.hexId}, ${PLACEHOLDERS.token}, ${PLACEHOLDERS.jwt}: identifiers or secrets.
  ${PLACEHOLDERS.varies}: changed between identical requests (always used for: ${[...MASKED_HEADERS].join(', ')}).
  ${PLACEHOLDERS.cookieValue}: cookie value. A cookie's Expires date is shown as ${PLACEHOLDERS.httpDate};
  cookie names and all other attributes are preserved.
  Repeated response headers (e.g. several set-cookie) are joined with newlines.
  Do not treat placeholders as literal content or as defects.
  Values echoed from the request are never masked by these placeholders.
- {{REDACTED_<FIELD>}} tokens are values the user withheld (FIELD names the
  request field, e.g. HEADER.AUTHORIZATION, BODY.USER.EMAIL, QUERY.TOKEN, URL).
  The same token anywhere in the report (inside longer strings, values, or
  responses) stands for that same original value. A field that shows a
  different value really was sent with that value. Never guess withheld values
  and do not treat tokens as defects. To keep a withheld baseline value in a
  proposed request, copy its token exactly; Rentgen restores the real value.
- Truncation (responses, value, req):
  strings ending in "…[+N chars]" are partial; their ORIGINAL length is the number
  of characters shown + N (use this for length/boundary reasoning).
  Arrays ending in "…[+N more items]" are partial; <array(n)> and
  <object(n keys)> mark collapsed deep structures.
  Never copy truncation markers into proposed requests. If a proposed test needs a
  long input, use the shortest value that still tests the condition.`;

const STATUS_MAP: Record<TestStatus, CompactStatus> = {
  [TestStatus.Bug]: 'bug',
  [TestStatus.Fail]: 'fail',
  [TestStatus.FailNoResponse]: 'fail_no_response',
  [TestStatus.Info]: 'info',
  [TestStatus.Manual]: 'manual',
  [TestStatus.Pass]: 'pass',
  [TestStatus.Warning]: 'warn',
};

// ---------- Value-shape detection ----------

const PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, PLACEHOLDERS.datetime],
  [/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/, PLACEHOLDERS.httpDate],
  [/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, PLACEHOLDERS.uuid],
  [/^eyJ[\w-]+\.[\w-]+\.[\w-]*$/, PLACEHOLDERS.jwt],
  [/^[0-9a-f]{24,}$/i, PLACEHOLDERS.hexId],
];

const TIME_KEY = /time|date|expires|^ts$/i;
// Case-sensitive on purpose: /At$/i would also match keys like "format" or "lat".
const TIME_KEY_SUFFIX = /(_at|At)$/;

const isTimeKey = (key: string): boolean => TIME_KEY.test(key) || TIME_KEY_SUFFIX.test(key);

const isEpoch = (n: number): boolean => Number.isInteger(n) && ((n > 1e9 && n < 1e10) || (n > 1e12 && n < 1e13));

const looksLikeToken = (s: string): boolean =>
  s.length >= 32 && /^[A-Za-z0-9+/=_-]+$/.test(s) && /\d/.test(s) && /[A-Za-z]/.test(s);

function maskString(s: string): string {
  for (const [re, label] of PATTERNS) if (re.test(s)) return label;
  return looksLikeToken(s) ? PLACEHOLDERS.token : s;
}

/** Masks a Set-Cookie value and its Expires date (both change per call); Max-Age and flags are kept. */
const maskCookie = (cookie: string): string =>
  cookie
    .replace(/^([^=]+)=[^;]*/, `$1=${PLACEHOLDERS.cookieValue}`)
    .replace(/(;\s*expires=)[^;]*/gi, `$1${PLACEHOLDERS.httpDate}`);

// ---------- Generic helpers ----------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const isEmpty = (v: unknown): boolean =>
  v === undefined || v === null || v === '' || (isObj(v) && Object.keys(v).length === 0);

/** JSON.stringify with sorted keys, so equal objects get equal strings. */
const stable = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) =>
    isObj(x)
      ? Object.fromEntries(
          Object.keys(x)
            .sort()
            .map((k) => [k, x[k]]),
        )
      : x,
  ) ?? 'undefined';

/** Structural equality with JSON semantics (keys holding `undefined` count as absent). */
function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  if (!isObj(a) || !isObj(b)) return false;

  const aKeys = Object.keys(a).filter((k) => a[k] !== undefined);
  const bKeys = Object.keys(b).filter((k) => b[k] !== undefined);

  return aKeys.length === bKeys.length && aKeys.every((k) => deepEqual(a[k], b[k]));
}

/** "no body" is `undefined`; JSON text is parsed so it compares equal to its object form. */
const normalizeBody = (body: unknown): unknown =>
  body === null || body === undefined ? undefined : tryParseJsonObject(body);

const joinKey = (path: string, key: string): string => (path ? `${path}.${key}` : key);

/** Response headers are typed as strings, but axios returns repeated headers (e.g. set-cookie) as arrays. */
const headerText = (value: unknown): string =>
  Array.isArray(value) ? value.map(String).join('\n') : String(value ?? '');

const genericPath = (path: string): string => path.replace(/\[\d+\]/g, '[]');

const roundNumbers = (v: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === 'number' ? Math.round(x * 10) / 10 : x]));

function truncateString(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…[+${s.length - max} chars]` : s;
}

/** Truncates JSON values while keeping the structure valid. */
function truncateJson(v: unknown, limits: Limits, depth = 0): unknown {
  if (typeof v === 'string') return truncateString(v, limits.maxString);
  if (Array.isArray(v)) {
    if (depth >= limits.maxDepth) return `<array(${v.length})>`;
    const kept = v.slice(0, limits.maxArrayItems).map((x) => truncateJson(x, limits, depth + 1));
    return v.length > limits.maxArrayItems ? [...kept, `…[+${v.length - limits.maxArrayItems} more items]`] : kept;
  }
  if (isObj(v)) {
    if (depth >= limits.maxDepth) return `<object(${Object.keys(v).length} keys)>`;
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, truncateJson(x, limits, depth + 1)]));
  }

  return v;
}

/** Leaf paths with stable-serialized values, e.g. "items[0].id" -> "1". */
function flatten(v: unknown, path: string, out: Map<string, string>): void {
  if (Array.isArray(v)) v.forEach((x, i) => flatten(x, `${path}[${i}]`, out));
  else if (isObj(v)) for (const [k, x] of Object.entries(v)) flatten(x, joinKey(path, k), out);
  else out.set(path, stable(v));
}

function collectPrimitives(v: unknown, out: Set<string>): void {
  if (Array.isArray(v)) v.forEach((x) => collectPrimitives(x, out));
  else if (isObj(v)) Object.values(v).forEach((x) => collectPrimitives(x, out));
  else if (v !== undefined && v !== null) out.add(String(v));
}

/** Collects JSON leaf changes from `base` to `target` as path -> new value, plus removed paths. */
function diffJson(base: unknown, target: unknown, path: string, set: Record<string, unknown>, unset: string[]): void {
  if (Array.isArray(base) && Array.isArray(target) && base.length === target.length) {
    target.forEach((x, i) => diffJson(base[i], x, `${path}[${i}]`, set, unset));
  } else if (isObj(base) && isObj(target)) {
    for (const [k, x] of Object.entries(base))
      if (x !== undefined && target[k] === undefined) unset.push(joinKey(path, k));
    for (const [k, x] of Object.entries(target))
      if (x !== undefined) diffJson(base[k], x, joinKey(path, k), set, unset);
  } else if (!deepEqual(base, target)) {
    set[path] = target;
  }
}

/** Query parameters as a map, or null when a parameter repeats (not expressible as a patch). */
function singleValueParams(params: URLSearchParams): Map<string, string> | null {
  const map = new Map<string, string>();
  for (const [k, v] of params) {
    if (map.has(k)) return null;
    map.set(k, v);
  }
  return map;
}

/** Data-driven tests are named "body.<path>" / "query.<name>" and set that field to `value`. */
function getTestedField({ name, value }: TestResult): TestedField | undefined {
  if (value === undefined) return undefined;
  if (name.startsWith('body.')) return { location: 'body', path: name.slice('body.'.length), value };
  if (name.startsWith('query.')) return { location: 'query', path: name.slice('query.'.length), value };
  return undefined;
}

// ---------- Learning from repeated identical requests ----------

function learnVolatility(tests: TestResult[]): Volatility {
  const groups = new Map<string, HttpResponse[]>();
  for (const { request, response } of tests) {
    if (!request || !response) continue;
    const key = stable(request);
    const list = groups.get(key);
    if (list) list.push(response);
    else groups.set(key, [response]);
  }

  const paths = new Set<string>();
  const headers = new Set<string>();

  for (const list of groups.values()) {
    if (list.length < 2 || new Set(list.map((r) => r.status)).size > 1) continue; // flaky status: don't learn from it

    const bodyMaps = list.map((r) => {
      const map = new Map<string, string>();
      flatten(r.body, '', map);
      return map;
    });
    for (const path of new Set(bodyMaps.flatMap((m) => [...m.keys()])))
      if (new Set(bodyMaps.map((m) => m.get(path))).size > 1) paths.add(genericPath(path));

    const headerMaps = list.map(
      (r) => new Map(Object.entries(r.headers ?? {}).map(([name, value]) => [name.toLowerCase(), headerText(value)])),
    );
    for (const name of new Set(headerMaps.flatMap((m) => [...m.keys()])))
      if (!DROPPED_HEADERS.has(name) && new Set(headerMaps.map((m) => m.get(name))).size > 1) headers.add(name);
  }

  return { paths, headers };
}

// ---------- User-selected masking (redaction) ----------

export const MASK_URL_FIELD = 'URL';
export const MASK_BODY_PREFIX = 'body.';
export const MASK_HEADER_PREFIX = 'header.';
export const MASK_QUERY_PREFIX = 'query.';

/** Shorter masked values are only replaced in their own field, never inside other text (too many false hits). */
const MIN_REDACTED_TEXT_LENGTH = 4;

type MaskableRequest = Pick<HttpRequest, 'url' | 'headers' | 'body'>;

/** Field-qualified, so e.g. header "token" and query "token" get different tokens. */
export const createRedactionToken = (field: string): string => `{{REDACTED_${field.toUpperCase()}}}`;

function getValueAtPath(source: unknown, path: string): unknown {
  return path
    .replace(/\[(\d+)]/g, '.$1')
    .split('.')
    .reduce<unknown>((value, key) => (isObject(value) ? value[key] : undefined), source);
}

function getBodyFields(body: HttpBody | undefined, headers: Record<string, string>): Array<[string, unknown]> {
  if (body === null || body === undefined || body === '') return [];

  if (isUrlEncodedContentType(headers))
    return convertUrlEncodedToFormEntries(String(body)).map(([name, value]) => [`${MASK_BODY_PREFIX}${name}`, value]);

  const parsed = tryParseJsonObject(body);
  if (!isObject(parsed)) return [];

  return Object.entries(extractPropertiesFromJson(parsed))
    .filter(([, type]) => type !== 'DO_NOT_TEST')
    .map(([path]) => [`${MASK_BODY_PREFIX}${path}`, getValueAtPath(parsed, path)]);
}

/** Every field the user can mask, as [field name, original value]. */
export function getMaskableFields({ url, headers = {}, body }: MaskableRequest): Array<[string, unknown]> {
  return [
    [MASK_URL_FIELD, url],
    ...Object.entries(headers).map(([name, value]): [string, unknown] => [`${MASK_HEADER_PREFIX}${name}`, value]),
    ...getBodyFields(body, headers),
    ...Object.entries(extractQueryParameters(url)).map(([name, value]): [string, unknown] => [
      `${MASK_QUERY_PREFIX}${name}`,
      value,
    ]),
  ];
}

export function getSuggestedMaskedFields(headers: Record<string, string> = {}): string[] {
  return Object.keys(headers)
    .filter((name) => SENSITIVE_HEADERS.has(name.toLowerCase()))
    .map((name) => `${MASK_HEADER_PREFIX}${name}`);
}

/** Splits a URL into base (before "?"), raw query, and hash without re-encoding anything. */
function splitUrl(url: string): { base: string; query: string; hash: string } {
  const hashIndex = url.indexOf('#');
  const withoutHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const queryIndex = withoutHash.indexOf('?');

  return {
    base: queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex),
    query: queryIndex === -1 ? '' : withoutHash.slice(queryIndex + 1),
    hash: hashIndex === -1 ? '' : url.slice(hashIndex),
  };
}

const sameValue = (a: unknown, b: unknown): boolean =>
  deepEqual(a, b) || (!isObject(a) && !isObject(b) && a !== undefined && b !== undefined && String(a) === String(b));

interface MaskedField {
  token: string;
  value: unknown;
}

/**
 * Replaces user-masked request values with `{{REDACTED_<FIELD>}}` tokens before anything is sent to the AI,
 * and puts the real values back into the requests the AI generates.
 *
 * A masked field is replaced wherever it still holds its original value (originalRequest, test requests,
 * data-driven values, field mappings). Fields a test changed to a different value stay visible, except that
 * longer original values are also replaced wherever they appear inside other text, e.g. a padded test value
 * or a response that echoes them.
 */
export class RequestRedactor {
  private readonly url: MaskedField | null = null;
  private readonly headers = new Map<string, MaskedField>();
  private readonly query = new Map<string, MaskedField>();
  private readonly body = new Map<string, MaskedField>();
  private readonly fields = new Map<string, MaskedField>();
  /** [original text, token], longest first so overlapping secrets are replaced correctly. */
  private readonly secrets: Array<[string, string]> = [];
  private readonly tokens = new Map<string, MaskedField>();

  constructor(original: MaskableRequest, maskedFields: Iterable<string>) {
    const masked = new Set(maskedFields);
    const values = getMaskableFields(original);

    for (const [field, value] of values) {
      if (!masked.has(field) || value === undefined || value === null) continue;

      const entry: MaskedField = {
        token: createRedactionToken(field),
        value: field === MASK_URL_FIELD ? splitUrl(String(value)).base : value,
      };
      this.fields.set(field, entry);
      this.tokens.set(entry.token, entry);

      if (field === MASK_URL_FIELD) this.url = entry;
      else if (field.startsWith(MASK_HEADER_PREFIX))
        this.headers.set(field.slice(MASK_HEADER_PREFIX.length).toLowerCase(), entry);
      else if (field.startsWith(MASK_QUERY_PREFIX)) this.query.set(field.slice(MASK_QUERY_PREFIX.length), entry);
      else if (field.startsWith(MASK_BODY_PREFIX)) this.body.set(field.slice(MASK_BODY_PREFIX.length), entry);

      const text = String(entry.value);
      if (text.length >= MIN_REDACTED_TEXT_LENGTH) this.secrets.push([text, entry.token]);
    }

    this.secrets.sort(([a], [b]) => b.length - a.length);
  }

  get isActive(): boolean {
    return this.fields.size > 0;
  }

  // ----- Redaction -----

  redactRequest<T extends MaskableRequest>(request: T): T {
    if (!this.isActive) return request;

    const headers = Object.fromEntries(
      Object.entries(request.headers ?? {}).map(([name, value]) => {
        const masked = this.headers.get(name.toLowerCase());
        return [name, masked && value === masked.value ? masked.token : this.redactText(value)];
      }),
    );
    const redacted = { ...request, url: this.redactUrl(request.url), headers };
    if ('body' in request) redacted.body = this.redactBody(request.body, request.headers ?? {}) as HttpBody;

    return redacted;
  }

  redactResponse(response: HttpResponse): HttpResponse {
    if (!this.isActive) return response;

    const headers = Object.fromEntries(
      Object.entries(response.headers ?? {}).map(([name, value]: [string, unknown]) => [
        name,
        Array.isArray(value) ? value.map((item) => this.redactText(String(item))) : this.redactText(String(value)),
      ]),
    ) as Record<string, string>;

    return { ...response, headers, body: this.redactJson(response.body) as HttpBody };
  }

  /** A value of a request field (e.g. "body.email"): replaced by its token when it equals the original. */
  redactFieldValue(field: string, value: unknown): unknown {
    const masked = this.fields.get(field);
    if (masked && sameValue(value, masked.value)) return masked.token;

    return this.redactJson(value);
  }

  /** fieldMappings may keep original example values (e.g. email or date fields). */
  redactFieldMappings<T>(mappings: T): T {
    if (!this.isActive || !isObj(mappings)) return mappings;

    const redacted = Object.fromEntries(
      Object.entries(mappings).map(([location, parameters]) => [
        location,
        isObj(parameters)
          ? Object.fromEntries(
              Object.entries(parameters).map(([name, parameter]) => [
                name,
                isObj(parameter) && 'value' in parameter
                  ? { ...parameter, value: this.redactFieldValue(`${location}.${name}`, parameter.value) }
                  : parameter,
              ]),
            )
          : parameters,
      ]),
    );

    return this.redactJson(redacted) as T;
  }

  redactText(text: string): string {
    let redacted = text;
    for (const [secret, token] of this.secrets) {
      if (redacted.includes(secret)) redacted = redacted.replaceAll(secret, token);

      const encoded = encodeURIComponent(secret);
      if (encoded !== secret && redacted.includes(encoded)) redacted = redacted.replaceAll(encoded, token);
    }
    return redacted;
  }

  redactJson(value: unknown): unknown {
    if (!this.secrets.length) return value;
    if (typeof value === 'string') return this.redactText(value);
    if (typeof value === 'number' || typeof value === 'boolean') {
      const text = String(value);
      return this.secrets.find(([secret]) => secret === text)?.[1] ?? value;
    }
    if (Array.isArray(value)) return value.map((item) => this.redactJson(item));
    if (isObj(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, this.redactJson(v)]));

    return value;
  }

  private redactUrl(url: string): string {
    const { base, query, hash } = splitUrl(url);
    const parameters = query
      .split('&')
      .filter(Boolean)
      .map((parameter) => {
        const [entry] = Array.from(new URLSearchParams(parameter));
        const masked = entry && this.query.get(entry[0]);
        if (!masked || entry[1] !== masked.value) return this.redactText(parameter);

        const separatorIndex = parameter.indexOf('=');
        return `${separatorIndex === -1 ? parameter : parameter.slice(0, separatorIndex)}=${masked.token}`;
      });

    // Case-insensitive, so the uppercase domain/path security tests do not reveal the masked URL.
    const isBaseMasked = this.url && base.toLowerCase() === String(this.url.value).toLowerCase();
    const redactedBase = isBaseMasked ? this.url!.token : this.redactText(base);

    return `${redactedBase}${parameters.length ? `?${parameters.join('&')}` : ''}${this.url ? '' : this.redactText(hash)}`;
  }

  private redactBody(body: unknown, headers: Record<string, string>): unknown {
    if (body === null || body === undefined) return body;

    if (typeof body === 'string' && isUrlEncodedContentType(headers))
      return convertUrlEncodedToFormEntries(body)
        .map(([name, value]) => {
          const masked = this.body.get(name);
          const encodedName = new URLSearchParams([[name, '']]).toString().slice(0, -1);
          return masked && value === String(masked.value)
            ? `${encodedName}=${masked.token}`
            : this.redactText(new URLSearchParams([[name, value]]).toString());
        })
        .join('&');

    const parsed = tryParseJsonObject(body);
    if (!isObject(parsed)) return this.redactJson(parsed);

    const redacted = structuredClone(parsed);
    for (const [path, masked] of this.body)
      if (sameValue(getValueAtPath(redacted, path), masked.value)) setDeepObjectProperty(redacted, path, masked.token);

    return this.redactJson(redacted);
  }

  // ----- Restoration (AI output) -----

  /** Puts the real values back into a request generated by the AI. */
  restoreRequest(request: HttpRequest): HttpRequest {
    if (!this.isActive) return request;

    const restored: HttpRequest = {
      ...request,
      url: this.restoreText(request.url, true),
      headers: Object.fromEntries(
        Object.entries(request.headers ?? {}).map(([name, value]) => [name, this.restoreText(value, false)]),
      ),
    };
    if ('body' in request)
      restored.body =
        typeof request.body === 'string'
          ? this.restoreText(request.body, isUrlEncodedContentType(request.headers ?? {}))
          : (this.restoreJson(request.body) as HttpBody);

    return restored;
  }

  private restoreJson(value: unknown): unknown {
    if (typeof value === 'string') {
      const exact = this.tokens.get(value);
      return exact ? exact.value : this.restoreText(value, false);
    }
    if (Array.isArray(value)) return value.map((item) => this.restoreJson(item));
    if (isObj(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, this.restoreJson(v)]));

    return value;
  }

  /** `encoded`: the text is a URL or form body, so restored values must be URL-encoded (except the base URL). */
  private restoreText(text: string, encoded: boolean): string {
    if (!text.includes('REDACTED_')) return text;

    let restored = text;
    for (const [token, { value }] of this.tokens) {
      const replacement = encoded && token !== this.url?.token ? encodeURIComponent(String(value)) : String(value);
      restored = restored.replaceAll(token, replacement).replaceAll(encodeURIComponent(token), replacement);
    }
    return restored;
  }
}

// ---------- Report builder (one per compaction) ----------

class ReportBuilder {
  private readonly responses: Record<string, CompactResponse> = {};
  private readonly responseIds = new Map<string, string>();
  private readonly echoedCache = new WeakMap<HttpRequest, Set<string>>();
  private readonly redactedRequests = new WeakMap<HttpRequest, HttpRequest>();
  private readonly redactedResponses = new WeakMap<HttpResponse, HttpResponse>();
  private readonly origHeaders: Map<string, { name: string; value: string }>;
  private readonly origBody: unknown;
  private readonly dropHeaders: Set<string>;
  private readonly maskHeaders: Set<string>;

  /** `orig` must already be redacted. */
  constructor(
    private readonly orig: HttpRequest,
    private readonly vol: Volatility,
    private readonly limits: { response: Limits; inputs: Limits; maxTextBody: number },
    normalize: NormalizeConfig,
    private readonly redactor: RequestRedactor,
  ) {
    this.origHeaders = new Map(
      Object.entries(orig.headers ?? {}).map(([name, value]) => [name.toLowerCase(), { name, value }]),
    );
    this.origBody = normalizeBody(orig.body);
    this.dropHeaders = new Set([...DROPPED_HEADERS, ...(normalize.dropHeaders ?? []).map((h) => h.toLowerCase())]);
    this.maskHeaders = new Set([...MASKED_HEADERS, ...(normalize.maskHeaders ?? []).map((h) => h.toLowerCase())]);
  }

  compactTest(suiteName: string, t: TestResult): CompactTest {
    const out: CompactTest = { name: t.name, s: STATUS_MAP[t.status] ?? 'info' };
    if (!isEmpty(t.expected)) out.exp = this.redactor.redactText(t.expected);
    if (!isEmpty(t.actual) && t.actual !== t.expected) out.act = this.redactor.redactText(t.actual);

    // Performance tests carry only metrics; their request/response are the baseline.
    if (suiteName === 'performanceTests') {
      if (isObj(t.value)) out.value = roundNumbers(t.value);
      return out;
    }

    // Compared before redaction: short masked values are redacted in the body but not inside `value`.
    const isBaselineBodyValue =
      t.name === ORIGINAL_REQUEST_TEST_PARAMETER_NAME && deepEqual(t.value, normalizeBody(t.request?.body));
    const value = t.value === undefined ? undefined : this.redactor.redactFieldValue(t.name, t.value);
    if (value !== undefined && !isBaselineBodyValue) out.value = truncateJson(value, this.limits.inputs);

    const request = t.request ? this.redactRequest(t.request) : undefined;
    if (request) {
      const tested = suiteName === 'dataDrivenTests' ? getTestedField({ ...t, value }) : undefined;
      const req = this.diffRequest(request, normalizeBody(request.body), tested);
      if (req) out.req = req;
    }

    const resId = this.addResponse(t.response, request ?? this.orig);
    if (resId) out.res = resId;
    if (typeof t.response?.time === 'number') out.ms = Math.round(t.response.time);

    return out;
  }

  private redactRequest(request: HttpRequest): HttpRequest {
    let redacted = this.redactedRequests.get(request);
    if (!redacted) {
      redacted = this.redactor.redactRequest(request);
      this.redactedRequests.set(request, redacted);
    }
    return redacted;
  }

  private redactResponse(response: HttpResponse): HttpResponse {
    let redacted = this.redactedResponses.get(response);
    if (!redacted) {
      redacted = this.redactor.redactResponse(response);
      this.redactedResponses.set(response, redacted);
    }
    return redacted;
  }

  /**
   * Moves each header's most frequent value to a shared block when that saves space,
   * so a few outlier responses (OPTIONS, proxy 404s) no longer prevent sharing.
   */
  finalize(): Pick<CompactReport, 'commonResponseHeaders' | 'responses'> {
    const list = Object.values(this.responses);
    const common: Record<string, string> = {};

    if (list.length > 1) {
      const valueCounts = new Map<string, Map<string, number>>();
      for (const { headers = {} } of list)
        for (const [name, value] of Object.entries(headers)) {
          const counts = valueCounts.get(name) ?? new Map<string, number>();
          counts.set(value, (counts.get(value) ?? 0) + 1);
          valueCounts.set(name, counts);
        }

      for (const [name, counts] of valueCounts) {
        let value = '';
        let count = 0;
        let present = 0;
        for (const [v, c] of counts) {
          present += c;
          if (c > count) [value, count] = [v, c];
        }

        // Sharing saves the entry in every other response that has it, but each response without
        // the header must then list it in removedHeaders. Responses with another value are unaffected.
        const nameSize = JSON.stringify(name).length;
        const saved = (count - 1) * (nameSize + JSON.stringify(value).length + 2);
        if (count * 2 > list.length && saved > (list.length - present) * (nameSize + 1)) common[name] = value;
      }

      for (const response of list) {
        const headers = response.headers ?? {};
        for (const [name, value] of Object.entries(common)) {
          if (!(name in headers)) (response.removedHeaders ??= []).push(name);
          else if (headers[name] === value) delete headers[name];
        }
      }
    }

    for (const response of list) if (response.headers && !Object.keys(response.headers).length) delete response.headers;

    return { commonResponseHeaders: common, responses: this.responses };
  }

  // ----- Requests -----

  private diffRequest(req: HttpRequest, body: unknown, tested?: TestedField): RequestDiff | undefined {
    const d: RequestDiff = {};

    if (req.method !== this.orig.method) d.method = req.method;
    if (req.url !== this.orig.url) {
      const query = this.diffQuery(req.url, tested?.location === 'query' ? tested : undefined);
      if (query === null) d.url = req.url;
      else if (query) d.query = query;
    }

    const headers: Record<string, string> = {};
    const present = new Set<string>();
    for (const [name, value] of Object.entries(req.headers ?? {})) {
      const key = name.toLowerCase();
      present.add(key);
      if (this.origHeaders.get(key)?.value !== value)
        headers[name] = truncateString(value, this.limits.inputs.maxString);
    }
    const removed = [...this.origHeaders].filter(([key]) => !present.has(key)).map(([, { name }]) => name);
    if (Object.keys(headers).length) d.headers = headers;
    if (removed.length) d.removedHeaders = removed;

    Object.assign(d, this.diffBody(body, tested?.location === 'body' ? tested : undefined));

    return Object.keys(d).length ? d : undefined;
  }

  /** Patch of query parameters, undefined when equivalent, null when only a full URL can express the change. */
  private diffQuery(url: string, tested?: TestedField): ObjectPatch | undefined | null {
    // String-based so it also works on redacted URLs such as "{{REDACTED_URL}}?page=1".
    const base = splitUrl(this.orig.url);
    const target = splitUrl(url);
    if (base.base !== target.base || base.hash !== target.hash) return null;

    const baseParams = singleValueParams(new URLSearchParams(base.query));
    const targetParams = singleValueParams(new URLSearchParams(target.query));
    if (!baseParams || !targetParams) return null;

    const patch: ObjectPatch = {};
    for (const [k, v] of targetParams) {
      if (baseParams.get(k) === v) continue;
      if (tested?.path === k && v === stringifyValue(tested.value)) continue;
      (patch.set ??= {})[k] = truncateString(v, this.limits.inputs.maxString);
    }
    for (const k of baseParams.keys()) if (!targetParams.has(k)) (patch.unset ??= []).push(k);

    return patch.set || patch.unset ? patch : undefined;
  }

  /** The smaller of a path patch and the full body; the tested data-driven field is implied by `value`. */
  private diffBody(target: unknown, tested?: TestedField): Pick<RequestDiff, 'body' | 'bodyPatch' | 'noBody'> {
    const base = this.origBody;
    if (target === undefined) return base === undefined ? {} : { noBody: true };

    const structured = (isObj(base) && isObj(target)) || (Array.isArray(base) && Array.isArray(target));
    if (!structured) return deepEqual(base, target) ? {} : { body: truncateJson(target, this.limits.inputs) };

    const set: Record<string, unknown> = {};
    const unset: string[] = [];
    diffJson(base, target, '', set, unset);
    if (tested && tested.path in set && deepEqual(set[tested.path], tested.value)) delete set[tested.path];

    const setEntries = Object.entries(set);
    if (!setEntries.length && !unset.length) return {};

    const body = truncateJson(target, this.limits.inputs);
    if ('' in set) return { body };

    const bodyPatch: ObjectPatch = {};
    if (setEntries.length)
      bodyPatch.set = Object.fromEntries(setEntries.map(([p, v]) => [p, truncateJson(v, this.limits.inputs)]));
    if (unset.length) bodyPatch.unset = unset;

    return JSON.stringify(bodyPatch).length < JSON.stringify(body).length ? { bodyPatch } : { body };
  }

  // ----- Responses (normalize + dedup) -----

  private addResponse(rawResponse: HttpResponse | null | undefined, req: HttpRequest): string | undefined {
    if (!rawResponse) return undefined;

    const res = this.redactResponse(rawResponse);
    const echoed = this.echoedValues(req);
    const norm: CompactResponse = { status: res.status, headers: this.normalizeHeaders(res.headers ?? {}, echoed) };
    if (res.body !== undefined) {
      const body = tryParseJsonObject(res.body);
      norm.body =
        typeof body === 'string'
          ? truncateString(body, this.limits.maxTextBody) // text / HTML
          : this.normalizeJson(body, echoed, '', '', 0);
    }

    const hash = stable(norm);
    let id = this.responseIds.get(hash);
    if (!id) {
      id = `r${this.responseIds.size + 1}`;
      this.responseIds.set(hash, id);
      this.responses[id] = norm;
    }
    return id;
  }

  /** Masks and truncates a JSON body in a single pass, so skipped array items are never visited. */
  private normalizeJson(v: unknown, echoed: Set<string>, path: string, key: string, depth: number): unknown {
    const limits = this.limits.response;

    if (Array.isArray(v)) {
      if (depth >= limits.maxDepth) return `<array(${v.length})>`;
      const kept = v
        .slice(0, limits.maxArrayItems)
        .map((x) => this.normalizeJson(x, echoed, `${path}[]`, key, depth + 1));
      return v.length > limits.maxArrayItems ? [...kept, `…[+${v.length - limits.maxArrayItems} more items]`] : kept;
    }
    if (isObj(v)) {
      if (depth >= limits.maxDepth) return `<object(${Object.keys(v).length} keys)>`;
      return Object.fromEntries(
        Object.entries(v).map(([k, x]) => [k, this.normalizeJson(x, echoed, joinKey(path, k), k, depth + 1)]),
      );
    }

    const masked = this.maskPrimitive(v, echoed, path, key);
    return typeof masked === 'string' ? truncateString(masked, limits.maxString) : masked;
  }

  private maskPrimitive(v: unknown, echoed: Set<string>, path: string, key: string): unknown {
    if (v === null || v === undefined || typeof v === 'boolean') return v;
    if (echoed.has(String(v))) return v; // echoed from the request: keep as-is

    if (this.vol.paths.has(path)) {
      if (typeof v !== 'string') return PLACEHOLDERS.varies;
      const masked = maskString(v);
      return masked.startsWith('<') ? masked : PLACEHOLDERS.varies;
    }
    if (typeof v === 'string') return maskString(v);
    if (typeof v === 'number' && isTimeKey(key) && isEpoch(v)) return PLACEHOLDERS.epoch;

    return v;
  }

  private normalizeHeaders(headers: Record<string, string>, echoed: Set<string>): Record<string, string> {
    const out: Record<string, string> = {};

    for (const [rawName, rawValue] of Object.entries(headers)) {
      const name = rawName.toLowerCase();
      if (this.dropHeaders.has(name)) continue;

      if (name === 'set-cookie') {
        // keep each cookie's name and security attributes, mask the value and per-call Expires date
        const cookies: unknown[] = Array.isArray(rawValue) ? rawValue : [rawValue];
        out[name] = cookies.map((cookie) => maskCookie(String(cookie))).join('\n');
        continue;
      }

      const value = headerText(rawValue);
      if (echoed.has(value)) {
        out[name] = value;
      } else if (this.maskHeaders.has(name) || this.vol.headers.has(name)) {
        out[name] = PLACEHOLDERS.varies;
      } else {
        out[name] = maskString(value);
      }
    }
    return out;
  }

  /** All primitive values in a request (URL parts, headers, body). Used for echo protection. */
  private echoedValues(req: HttpRequest): Set<string> {
    const cached = this.echoedCache.get(req);
    if (cached) return cached;

    const out = new Set<string>();
    try {
      const url = new URL(req.url);
      url.pathname
        .split('/')
        .filter(Boolean)
        .forEach((segment) => out.add(decodeURIComponent(segment)));
      url.searchParams.forEach((value) => out.add(value));
    } catch {
      /* relative or invalid URL */
    }
    Object.values(req.headers ?? {}).forEach((value) => out.add(value));

    const body = normalizeBody(req.body);
    if (typeof body === 'string') out.add(body);
    else collectPrimitives(body, out);

    this.echoedCache.set(req, out);
    return out;
  }
}

// ---------- Public API ----------

/** Turns a raw Rentgen report into a compact, deduplicated, masked report for the AI. */
export class AiReportCompactor {
  private redactor: RequestRedactor | null = null;

  constructor(private readonly options: CompactOptions = {}) {}

  compact(report: RawReport): CompactReport {
    const { normalize = {}, maxTextBody = DEFAULT_MAX_TEXT_BODY } = this.options;
    const response: Limits = { ...DEFAULT_TRUNCATE, ...this.options.truncate };
    const inputs: Limits = { ...response, ...this.options.truncateInputs };
    const suiteEntries = Object.entries(report.suites ?? {});
    const redactor = this.getRedactor(report);
    const originalRequest = redactor.redactRequest(report.originalRequest);

    const vol: Volatility =
      normalize.learnVolatile === false
        ? { paths: new Set(), headers: new Set() }
        : learnVolatility(suiteEntries.flatMap(([, tests]) => tests));
    normalize.volatilePaths?.forEach((path) => vol.paths.add(path));

    const builder = new ReportBuilder(originalRequest, vol, { response, inputs, maxTextBody }, normalize, redactor);
    const suites: Record<string, CompactTest[]> = {};

    for (const [suiteName, tests] of suiteEntries) {
      suites[suiteName] = tests.map((t) => {
        return this.options.onlyFailuresInDetail && t.status === TestStatus.Pass
          ? { name: t.name, s: 'pass' }
          : builder.compactTest(suiteName, t);
      });
    }

    return {
      originalRequest,
      fieldMappings: redactor.redactFieldMappings(report.fieldMappings),
      ...builder.finalize(),
      suites,
    };
  }

  /** Minified JSON ready to send to the model. */
  serialize(report: RawReport): string {
    try {
      return JSON.stringify(this.compact(report));
    } catch {
      // Never fall back to unmasked data.
      const redactor = this.getRedactor(report);
      return JSON.stringify({
        originalRequest: redactor.redactRequest(report.originalRequest),
        fieldMappings: redactor.redactFieldMappings(report.fieldMappings),
        suites: redactor.redactJson(report.suites),
      });
    }
  }

  /** Puts the real values of masked fields back into a request generated by the AI. */
  restoreRequest(request: HttpRequest): HttpRequest {
    return this.redactor?.restoreRequest(request) ?? request;
  }

  private getRedactor(report: RawReport): RequestRedactor {
    this.redactor = new RequestRedactor(report.originalRequest, this.options.maskedFields ?? []);
    return this.redactor;
  }
}
