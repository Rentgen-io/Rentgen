import parseCurl from 'parse-curl';
import { isFormDataBody, isUrlEncodedBody, toLocalFilePath } from 'shared/utils/http';
import { HttpRequest, PostmanBody, PostmanFormDataItem, PostmanUrlencodedItem, RequestBody } from 'src/types';
import { convertUrlEncodedToFormEntries, getHeaderKey, isUrlEncodedContentType } from './http';

/** What the untyped `parse-curl` package returns for a cURL command. */
interface ParseCurlResult {
  body?: string;
  header: Record<string, string>;
  method?: string;
  url?: string;
}

interface DataArgument {
  flag: string;
  value: string;
}

const DATA_FLAGS = new Set(['-d', '--data', '--data-ascii', '--data-binary', '--data-raw', '--data-urlencode']);
const FORM_FLAGS = new Set(['-F', '--form', '--form-string']);
const HEADER_FLAGS = new Set(['-H', '--header']);
// The header key parse-curl uses both for a `-H 'Content-Type: …'` and for the Content-Type it adds for -d itself
const PARSE_CURL_CONTENT_TYPE_KEY = 'Content-Type';
const COOKIE_FLAG_REGEXES = [
  /(?:^|\s)(?:-b|--cookie)\s+(['"])(?<value>[\s\S]*?)\1/,
  /(?:^|\s)(?:-b|--cookie)\s+(?<value>[^\s'"]\S*)/,
];
const FORM_PAIR_REGEX = /^[\w.\-[\]%]+=[^&]*$/;
const LINE_CONTINUATION_REGEX = /\\\r?\n/g;
const MULTIPART_CONTENT_TYPE_REGEX = /^\s*multipart\/form-data/i;
// curl reads a --form value starting with @ or < from a file and treats `;` as the start of field options
const UNSAFE_FORM_VALUE_REGEX = /^[@<]|;/;

/**
 * Parses a cURL command into a request whose body is in editor form (formdata, urlencoded or raw).
 * Throws when the text is not a cURL command.
 */
export function extractCurl(curl: string): HttpRequest<PostmanBody> {
  const command = curl.replace(LINE_CONTINUATION_REGEX, ' ').trim();
  const parsedCurl = parseCurl(command) as ParseCurlResult | undefined;
  if (!parsedCurl) throw new Error('Not a cURL command');

  const args = splitShellArgs(command);
  const dataArguments = extractDataArguments(args);
  const formDataItems = extractFormDataItems(args);
  const headers = extractHeaders(command, args, parsedCurl.header);

  const contentTypeKey = getHeaderKey(headers, 'content-type');
  const contentType = contentTypeKey ? headers[contentTypeKey] : '';
  const isMultipart = MULTIPART_CONTENT_TYPE_REGEX.test(contentType);
  // A multipart Content-Type with a raw body (e.g. the browser's "Copy as cURL") stays raw, so the body isn't lost
  const isFormData = formDataItems.length > 0 || (isMultipart && dataArguments.length === 0);

  // The boundary is generated when the request is sent (Postman exports a "<calculated when request is sent>" placeholder)
  if (isFormData && isMultipart && contentTypeKey) headers[contentTypeKey] = 'multipart/form-data';

  return {
    body: isFormData ? { mode: 'formdata', formdata: formDataItems } : buildDataBody(dataArguments, contentType),
    headers,
    method: resolveMethod(parsedCurl.method, formDataItems.length > 0 || dataArguments.length > 0),
    url: parsedCurl.url ?? '',
  };
}

/** Builds a cURL command for the request, with every argument single-quoted for POSIX shells. */
export function generateCurl(request: HttpRequest): string {
  const { body, headers = {}, method, url } = request;
  const lines = [`curl -X ${method || 'GET'} ${quoteShellArg(url)}`];

  for (const [name, value] of Object.entries(headers)) lines.push(`-H ${quoteShellArg(`${name}: ${value}`)}`);
  lines.push(...buildBodyArguments(body));

  return lines.join(' \\\n  ');
}

// ---------- Parsing ----------

/**
 * Splits a command line into arguments the way a POSIX shell would:
 * handles 'single quotes', "double quotes" and backslash escapes.
 */
function splitShellArgs(input: string): string[] {
  const args: string[] = [];
  let current = '';
  let hasToken = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (/\s/.test(char)) {
      if (hasToken) args.push(current);
      current = '';
      hasToken = false;
      continue;
    }

    hasToken = true;

    if (char === "'") {
      const end = input.indexOf("'", i + 1);
      current += input.slice(i + 1, end === -1 ? input.length : end);
      i = end === -1 ? input.length : end;
    } else if (char === '"') {
      for (i++; i < input.length && input[i] !== '"'; i++) {
        // Inside double quotes a backslash only escapes $ ` " \
        if (input[i] === '\\' && /[$`"\\]/.test(input[i + 1] ?? '')) i++;
        current += input[i];
      }
    } else if (char === '\\' && i + 1 < input.length) {
      current += input[++i];
    } else {
      current += char;
    }
  }

  if (hasToken) args.push(current);
  return args;
}

/** Values of the --data* flags, in command order (parse-curl only understands -d/--data). */
function extractDataArguments(args: string[]): DataArgument[] {
  const dataArguments: DataArgument[] = [];

  for (let i = 0; i < args.length - 1; i++)
    if (DATA_FLAGS.has(args[i])) dataArguments.push({ flag: args[i], value: args[++i] });

  return dataArguments;
}

function extractFormDataItems(args: string[]): PostmanFormDataItem[] {
  const items: PostmanFormDataItem[] = [];

  for (let i = 0; i < args.length - 1; i++) {
    if (!FORM_FLAGS.has(args[i])) continue;

    const item = parseFormArgument(args[i + 1], args[i] === '--form-string');
    if (item) items.push(item);
    i++;
  }

  return items;
}

/**
 * Parses a single -F/--form argument into a form-data item:
 *   name=value | name="value"   -> text
 *   name=@path | name=@"path"   -> file
 *   name=<path                  -> file (content read from the file)
 *   --form-string name=value    -> text, taken literally
 */
function parseFormArgument(argument: string, isLiteral: boolean): PostmanFormDataItem | null {
  const separatorIndex = argument.indexOf('=');
  if (separatorIndex <= 0) return null;

  const key = argument.slice(0, separatorIndex).trim();
  const rawValue = argument.slice(separatorIndex + 1);

  if (isLiteral) return { key, type: 'text', value: rawValue };
  if (rawValue.startsWith('@') || rawValue.startsWith('<'))
    return { key, type: 'file', src: [readFormValue(rawValue.slice(1))] };

  return { key, type: 'text', value: readFormValue(rawValue) };
}

/**
 * Reads a -F value: either a "quoted string" (supports \" and \\) or plain text up to the first `;`
 * (what follows `;` are curl part options like type= or filename=, which are ignored).
 */
function readFormValue(rawValue: string): string {
  if (!rawValue.startsWith('"')) return rawValue.split(';')[0];

  let value = '';
  for (let i = 1; i < rawValue.length && rawValue[i] !== '"'; i++) {
    if (rawValue[i] === '\\' && (rawValue[i + 1] === '"' || rawValue[i + 1] === '\\')) i++;
    value += rawValue[i];
  }
  return value;
}

/** Headers parsed by parse-curl, with cookies normalized to a "Cookie" header. */
function extractHeaders(
  command: string,
  args: string[],
  parsedHeaders: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {};
  const hasImplicitContentType = !hasExplicitContentTypeKey(args);

  for (const [name, rawValue] of Object.entries(parsedHeaders)) {
    // parse-curl adds `Content-Type: application/x-www-form-urlencoded` for -d unless a -H set that exact key.
    // Not kept: the body mode decides the Content-Type (a urlencoded body gets it when sent), and a JSON body
    // must not be sent as urlencoded
    if (hasImplicitContentType && name === PARSE_CURL_CONTENT_TYPE_KEY) continue;

    const value = String(rawValue ?? '');

    // parse-curl reports the -b/--cookie flag as "Set-Cookie"
    headers[name.toLowerCase() === 'set-cookie' ? 'Cookie' : name] = value;
  }

  // The -b/--cookie flag takes precedence over a Cookie header (Postman behavior)
  const cookie = extractCookie(command);
  if (cookie) headers['Cookie'] = cookie;

  return headers;
}

/** Whether a -H argument sets the exact `Content-Type` key (parse-curl takes the name up to the first ": "). */
function hasExplicitContentTypeKey(args: string[]): boolean {
  return args.some(
    (argument, index) => HEADER_FLAGS.has(args[index - 1]) && argument.startsWith(`${PARSE_CURL_CONTENT_TYPE_KEY}: `),
  );
}

function extractCookie(command: string): string | undefined {
  const value = COOKIE_FLAG_REGEXES.map((regex) => command.match(regex)?.groups?.value).find(
    (match) => match !== undefined,
  );

  return (
    value
      ?.replace(/^['"]|['"]$/g, '')
      .replace(/^(?:Set-)?Cookie:\s*/i, '')
      .trim() || undefined
  );
}

/**
 * Body of the --data* flags: urlencoded when every value is a form field list and no other Content-Type is set,
 * otherwise raw, joined with `&` as curl sends it.
 */
function buildDataBody(dataArguments: DataArgument[], contentType: string): PostmanBody {
  if (dataArguments.length === 0) return {};

  const isUrlencoded =
    (!contentType || isUrlEncodedContentType(contentType)) && dataArguments.every(isFormDataArgument);
  if (isUrlencoded) return { mode: 'urlencoded', urlencoded: dataArguments.flatMap(toUrlencodedItems) };

  const raw = dataArguments
    .map(({ value }) => value)
    .join('&')
    .trim();

  return raw ? { mode: 'raw', raw } : {};
}

function isFormDataArgument({ flag, value }: DataArgument): boolean {
  return flag === '--data-urlencode' || value.split('&').every((pair) => FORM_PAIR_REGEX.test(pair));
}

/**
 * --data-urlencode takes a single `name=content`; the other --data* flags take an encoded `a=1&b=2` list.
 * --data-urlencode content is often pasted already encoded (e.g. `a%40b.com`), so it is decoded as well,
 * but without turning `+` into a space, since curl sends a literal `+` there.
 */
function toUrlencodedItems({ flag, value }: DataArgument): PostmanUrlencodedItem[] {
  if (flag !== '--data-urlencode')
    return convertUrlEncodedToFormEntries(value).map(([key, entryValue]) => ({ key, value: entryValue }));

  const separatorIndex = value.indexOf('=');
  if (separatorIndex <= 0) return [{ key: safeDecodeURIComponent(value.slice(separatorIndex + 1)), value: '' }];

  return [
    {
      key: safeDecodeURIComponent(value.slice(0, separatorIndex)),
      value: safeDecodeURIComponent(value.slice(separatorIndex + 1)),
    },
  ];
}

/** decodeURIComponent that returns the text unchanged when it holds an invalid escape (e.g. a lone `%`). */
function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Like curl, a request with a body and no explicit method other than GET is sent as POST. */
function resolveMethod(method: string | undefined, hasBody: boolean): string {
  const normalizedMethod = (method ?? '').toUpperCase();

  return hasBody && (!normalizedMethod || normalizedMethod === 'GET') ? 'POST' : normalizedMethod;
}

// ---------- Generation ----------

function buildBodyArguments(body: RequestBody | undefined): string[] {
  if (isFormDataBody(body))
    return [
      // --form is what most importers (e.g. Postman) understand; unsafe values fall back to the literal --form-string
      ...body.entries.map(
        ([key, value]) =>
          `${UNSAFE_FORM_VALUE_REGEX.test(value) ? '--form-string' : '--form'} ${quoteShellArg(`${key}=${value}`)}`,
      ),
      ...(body.files ?? []).map(
        ([key, filePath]) =>
          `--form ${quoteShellArg(`${key}=@${quoteFormFilePath(toLocalFilePath(filePath))}`)}`,
      ),
    ];

  // curl encodes each value and sends the urlencoded Content-Type itself
  if (isUrlEncodedBody(body))
    return body.entries.map(([key, value]) => `--data-urlencode ${quoteShellArg(`${key}=${value}`)}`);

  if (!body || body === 'null' || body === '{}') return [];

  return [`--data ${quoteShellArg(typeof body === 'string' ? body : JSON.stringify(body))}`];
}

/**
 * A file path for `--form name=@path`: curl ends an unquoted path at `;` or `,` (field options or a file list),
 * so such a path is double-quoted with `"` and `\` escaped.
 */
function quoteFormFilePath(filePath: string): string {
  return /[;,"]/.test(filePath) ? `"${filePath.replace(/[\\"]/g, '\\$&')}"` : filePath;
}

/** Single-quotes a POSIX shell argument; an embedded `'` becomes `'\''`. */
function quoteShellArg(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
