import { FieldsBody, FormDataBody, UrlEncodedBody } from 'shared/types/http';
import { PostmanFormDataItem } from 'shared/types/postman';

/**
 * Wraps form fields in the IPC-safe form-data body; the main process turns it into a real `FormData`.
 * `files` are [field name, path on disk] pairs, left out when empty.
 */
export function createFormDataBody(
  entries: Array<[string, string]>,
  files: Array<[string, string]> = [],
): FormDataBody {
  return { __type: 'formdata', entries, ...(files.length > 0 && { files }) };
}

/** Paths of a file field's files; Postman stores one path as a string and several as an array. */
export function getFormDataFilePaths({ src }: PostmanFormDataItem): string[] {
  if (Array.isArray(src)) return src.filter(Boolean);

  return src ? [src] : [];
}

/**
 * Postman stores Windows paths POSIX-style with a leading slash (`/C:/Users/...`), which Node would resolve
 * to `C:\C:\Users\...`; this drops that slash. No platform check (the renderer has no `process`):
 * a real POSIX path never starts with a drive letter, so other paths are returned unchanged.
 */
export function toLocalFilePath(filePath: string): string {
  return /^\/[a-zA-Z]:[\\/]/.test(filePath) ? filePath.slice(1) : filePath;
}

/** Wraps form fields in the IPC-safe urlencoded body; the main process turns it into a real `URLSearchParams`. */
export function createUrlEncodedBody(entries: Array<[string, string]>): UrlEncodedBody {
  return { __type: 'urlencoded', entries };
}

export function isFormDataBody(body: unknown): body is FormDataBody {
  return isFieldsBody(body) && body.__type === 'formdata';
}

export function isUrlEncodedBody(body: unknown): body is UrlEncodedBody {
  return isFieldsBody(body) && body.__type === 'urlencoded';
}

/** A form-data or urlencoded body. */
export function isFieldsBody(body: unknown): body is FieldsBody {
  if (typeof body !== 'object' || body === null) return false;

  const { __type, entries } = body as Partial<FieldsBody>;

  return (__type === 'formdata' || __type === 'urlencoded') && Array.isArray(entries);
}
