import { PostmanHeader } from 'shared/types/postman';

const URLENCODED_CONTENT_TYPE_REGEX = /application\/x-www-form-urlencoded/i;

// ---------- Headers as sent (a record) ----------

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

// ---------- Editor headers (Postman format) ----------

export function headersToPostmanFormat(headers: Record<string, string>): PostmanHeader[] {
  return Object.entries(headers).map(([key, value]) => ({ key, value }));
}

/**
 * The headers as sent (a record), names and values trimmed: headers without a name are left out, and when a header
 * repeats, the last value wins.
 */
export function postmanHeadersToRecord(headers: PostmanHeader[]): Record<string, string> {
  return Object.fromEntries(
    headers.filter(({ key }) => key.trim()).map(({ key, value }) => [key.trim(), value.trim()]),
  );
}

/** Headers as text, one `Name: value` per line (the bulk edit format). */
export function formatHeaderText(headers: PostmanHeader[]): string {
  return headers.map(({ key, value }) => `${key}:${value}`).join('\n');
}

export function isSameHeaders(a: PostmanHeader[], b: PostmanHeader[]): boolean {
  return (
    a === b ||
    (a.length === b.length &&
      a.every((header, index) => header.key === b[index].key && header.value === b[index].value))
  );
}

/**
 * Parses headers written as text, one `Name: value` per line (bulk edit). A line without a colon is taken as a cookie,
 * also when pasted with curl's `-b` flag.
 */
export function parseHeaderText(text: string): PostmanHeader[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex === -1) return { key: 'Cookie', value: line.startsWith('-b ') ? line.slice(2).trim() : line };

      return { key: line.slice(0, separatorIndex).trim(), value: line.slice(separatorIndex + 1).trim() };
    });
}
