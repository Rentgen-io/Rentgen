import { FieldsBody, FormDataBody, UrlEncodedBody } from 'shared/types/http';
import { PostmanBody, PostmanBodyMode, PostmanFormDataItem } from 'shared/types/postman';

// Raw bodies are left out: their content type depends on the text (JSON, XML, ...), so the user sets it
const BODY_MODE_CONTENT_TYPES: Partial<Record<PostmanBodyMode, string>> = {
  formdata: 'multipart/form-data',
  urlencoded: 'application/x-www-form-urlencoded',
};

/**
 * The form-data or urlencoded body to send for the editor body; `undefined` for any other mode (the raw text is sent).
 * Form-data file fields are sent as file paths (a File/Blob cannot cross IPC); a field with several files becomes one
 * part per file.
 */
export function buildFieldsBody(body: PostmanBody): FieldsBody | undefined {
  if (body.mode === 'formdata') {
    const fields = (body.formdata ?? []).filter(({ disabled }) => !disabled);

    return createFormDataBody(
      fields.filter(({ type }) => type !== 'file').map(({ key, value }) => [key, value ?? '']),
      fields
        .filter(({ type }) => type === 'file')
        .flatMap((field) => getFormDataFilePaths(field).map((filePath): [string, string] => [field.key, filePath])),
    );
  }
  if (body.mode === 'urlencoded')
    return createUrlEncodedBody(
      (body.urlencoded ?? []).filter(({ disabled }) => !disabled).map(({ key, value }) => [key, value ?? '']),
    );

  return undefined;
}

/** Substitutes variables in the raw body and in the keys and values of form-data and urlencoded fields. */
export function substituteBodyVariables(body: PostmanBody, substitute: (text: string) => string): PostmanBody {
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
 * Axios would set it anyway (with the multipart boundary), but this way it appears in test results, reports,
 * cURL exports and the CLI's verbose output, and the AI copies it into the requests it writes.
 */
export function withBodyContentType(headers: Record<string, string>, body: PostmanBody): Record<string, string> {
  const contentType = body.mode && BODY_MODE_CONTENT_TYPES[body.mode];
  const hasContentType = Object.keys(headers).some((name) => name.toLowerCase() === 'content-type');
  if (!contentType || hasContentType) return headers;

  return { ...headers, 'Content-Type': contentType };
}

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

/**
 * A local path as Postman stores it in `src`: forward slashes, and a Windows path with a leading slash
 * (`C:\Users\...` → `/C:/Users/...`). The reverse of `toLocalFilePath`; POSIX paths are returned unchanged.
 */
export function toPostmanFilePath(filePath: string): string {
  return /^[a-zA-Z]:[\\/]/.test(filePath) ? `/${filePath.replace(/\\/g, '/')}` : filePath;
}

/**
 * The form-data file parts as [field, path]: the field is the part's name, indexed when that name has several files
 * (e.g. "avatar", or "videos[0]" and "videos[1]"), so each file is tested and masked on its own.
 */
export function getFormDataFileFields(files: Array<[string, string]> = []): Array<[string, string]> {
  const counts = new Map<string, number>();
  for (const [name] of files) counts.set(name, (counts.get(name) ?? 0) + 1);

  const indexes = new Map<string, number>();
  return files.map(([name, path]) => {
    const index = indexes.get(name) ?? 0;
    indexes.set(name, index + 1);

    return [counts.get(name)! > 1 ? `${name}[${index}]` : name, path];
  });
}

/** The name of a file from its path, Windows or POSIX style. */
export function getFileName(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath;
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
