import parseCurl from 'parse-curl';
import { HttpRequest, ParsedCurlResult, PostmanFormDataItem } from 'src/types';
import {
  convertUrlEncodedToFormEntries,
  getHeaderKey,
  isUrlEncodedContentType,
  isUrlEncodedContentTypeString,
} from './http';

const FORM_FLAGS = new Set(['-F', '--form', '--form-string']);
const MULTIPART_CONTENT_TYPE_REGEX = /^\s*multipart\/form-data/i;

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

/**
 * Reads a curl -F value: either a "quoted string" (supports \" and \\) or plain text up to the first ';'
 * (anything after ';' are curl part options like type= or filename=, which are ignored).
 */
function readFormValue(raw: string): string {
  if (!raw.startsWith('"')) return raw.split(';')[0];

  let value = '';
  for (let i = 1; i < raw.length && raw[i] !== '"'; i++) {
    if (raw[i] === '\\' && (raw[i + 1] === '"' || raw[i + 1] === '\\')) i++;
    value += raw[i];
  }
  return value;
}

/**
 * Parses a single -F/--form argument into a Postman-compatible form-data item.
 *   name=value | name="value"         -> text
 *   name=@path | name=@"path"         -> file
 *   name=<path                        -> file (content read from file)
 *   --form-string name=value          -> text, taken literally
 */
function parseFormArg(arg: string, isLiteral: boolean): PostmanFormDataItem | null {
  const separatorIndex = arg.indexOf('=');
  if (separatorIndex <= 0) return null;

  const key = arg.slice(0, separatorIndex).trim();
  const rawValue = arg.slice(separatorIndex + 1);

  if (isLiteral) return { key, type: 'text', value: rawValue };

  if (rawValue.startsWith('@') || rawValue.startsWith('<'))
    return { key, type: 'file', src: readFormValue(rawValue.slice(1)) };

  return { key, type: 'text', value: readFormValue(rawValue) };
}

function extractFormData(curl: string): PostmanFormDataItem[] {
  const args = splitShellArgs(curl);
  const items: PostmanFormDataItem[] = [];

  for (let i = 0; i < args.length - 1; i++) {
    if (!FORM_FLAGS.has(args[i])) continue;

    const item = parseFormArg(args[i + 1], args[i] === '--form-string');
    if (item) items.push(item);
    i++;
  }

  return items;
}

export function extractCurl(curl: string): ParsedCurlResult {
  const trimmedCurl = curl.replace(/\\\r?\n/g, ' ').trim();
  const parsedCurl = parseCurl(trimmedCurl);
  const formData = extractFormData(trimmedCurl);
  const dataFlagRegex = /(?:^|\s)(?:-d|--data(?:-raw|-binary)?|--data-urlencode)\s+(?:'([^']*)'|"([^"]*)"|([^\s]+))/g;
  const extractedDataLines: string[] = [];
  let dataFlagMatch: RegExpExecArray | null;

  while ((dataFlagMatch = dataFlagRegex.exec(trimmedCurl)) !== null) {
    const extractedValue = (dataFlagMatch[1] ?? dataFlagMatch[2] ?? dataFlagMatch[3] ?? '').trim();
    if (extractedValue) extractedDataLines.push(extractedValue);
  }

  // Skip form-data parsing if the body is valid JSON
  const isJsonBody =
    extractedDataLines.length === 1 &&
    (() => {
      try {
        JSON.parse(extractedDataLines[0]);
        return true;
      } catch {
        return false;
      }
    })();

  // Parse key=value pairs from all extracted data lines
  const parsedFormPairs: string[] = [];
  if (!isJsonBody) {
    for (const dataLine of extractedDataLines) {
      const keyValuePairRegex = /([\w.\-[\]]+)=["']?([^"']+)["']?/g;
      let pairMatch: RegExpExecArray | null;

      while ((pairMatch = keyValuePairRegex.exec(dataLine)) !== null) {
        const key = pairMatch[1].trim();
        const value = pairMatch[2].trim();
        parsedFormPairs.push(`${key}=${value}`);
      }
    }
  }

  // Apply URL decoding for --data-urlencode values
  const decodedLines = parsedFormPairs.map((formPair) => {
    try {
      return decodeURIComponent(formPair);
    } catch {
      return formPair;
    }
  });

  // Body fallback - handle --data* flags even if parse-curl doesn't catch them
  if (!parsedCurl.body) {
    const match =
      trimmedCurl.match(/--data-raw\s+(['"])([\s\S]*?)\1/) ||
      trimmedCurl.match(/--data\s+(['"])([\s\S]*?)\1/) ||
      trimmedCurl.match(/--data-binary\s+(['"])([\s\S]*?)\1/) ||
      trimmedCurl.match(/--data-urlencode\s+(['"])([\s\S]*?)\1/);
    if (match) parsedCurl.body = match[2];
  }

  // Smart HTTP method detection: if there's a body, --data* or --form flag, default to POST
  let method = (parsedCurl.method || '').toString().toUpperCase();
  if (
    (!method || method === 'GET') &&
    (formData.length > 0 || (/--data(?:-raw|-binary|-urlencode)?|-d/i.test(trimmedCurl) && parsedCurl.body?.trim()))
  )
    method = 'POST';

  // Normalize headers: always use "Cookie", never "Set-Cookie"
  const headers: Record<string, string> = {};
  if (parsedCurl.header) {
    for (const [headerKey, headerValue] of Object.entries(parsedCurl.header as Record<string, string>)) {
      const key = String(headerKey);
      const value = String(headerValue ?? '');

      if (
        !isUrlEncodedContentTypeString(trimmedCurl) &&
        value.toLocaleLowerCase() === 'application/x-www-form-urlencoded'
      )
        continue;

      if (key.toLowerCase() === 'set-cookie') headers['Cookie'] = value;
      else headers[key] = value;
    }
  }

  // Extract -b/--cookie flag (takes precedence over header-based cookies - Postman behavior)
  const cookieFlagMatch =
    trimmedCurl.match(/(?:^|\s)(?:-b|--cookie)\s+(['"])([\s\S]*?)\1/) ||
    trimmedCurl.match(/(?:^|\s)(?:-b|--cookie)\s+([^\s'"][^\s]*)/);
  if (cookieFlagMatch) {
    const rawValue = String(cookieFlagMatch[2] ?? cookieFlagMatch[1] ?? cookieFlagMatch[0] ?? '');
    const value = rawValue
      .replace(/^['"]|['"]$/g, '')
      .replace(/^Cookie:\s*/i, '')
      .replace(/^Set-Cookie:\s*/i, '')
      .trim();
    if (value) headers['Cookie'] = value;
  }

  // Form-data: any --form flag, or a multipart Content-Type without a raw body
  // (a raw multipart body, e.g. from browser "Copy as cURL", stays in raw mode so it isn't lost)
  const contentTypeKey = getHeaderKey(headers, 'content-type');
  const isMultipart = !!contentTypeKey && MULTIPART_CONTENT_TYPE_REGEX.test(headers[contentTypeKey]);
  const isFormData = formData.length > 0 || (isMultipart && !parsedCurl.body);

  // The boundary must be generated when the request is sent (Postman exports a
  // "<calculated when request is sent>" placeholder), so drop it from the header
  if (isFormData && isMultipart && contentTypeKey) headers[contentTypeKey] = 'multipart/form-data';

  return {
    body: isFormData ? null : parsedCurl.body || null,
    bodyMode: isFormData ? 'formdata' : parsedCurl.body ? 'raw' : 'none',
    decodedLines: isFormData ? [] : decodedLines,
    formData,
    headers,
    method,
    url: parsedCurl.url || '',
  };
}

export function generateCurl(request: HttpRequest): string {
  const { body, headers, method, url } = request;
  let curl = `curl -X ${method || 'GET'} '${url}'`;

  if (headers)
    for (const [headerName, headerValue] of Object.entries(headers))
      curl += ` \\\n  -H '${headerName}: ${headerValue}'`;

  if (body && body !== 'null' && body !== '{}') {
    if (isUrlEncodedContentType(headers)) {
      const formEntries = convertUrlEncodedToFormEntries(body as string);
      for (const [key, value] of formEntries)
        curl += ` \\\n  --data-urlencode '${key.replace(/'/g, "'\\''")}=${value.replace(/'/g, "'\\''")}'`;
    } else {
      let serializedBody: string;

      if (typeof body === 'string') serializedBody = body;
      else serializedBody = JSON.stringify(body);

      curl += ` \\\n  --data '${serializedBody.replace(/'/g, "'\\''")}'`;
    }
  }

  return curl;
}
