import { Method } from 'axios';

export type ResponseBody = string | number | boolean | Record<string, unknown> | unknown[] | null;

/**
 * multipart/form-data body in a structured-clone-safe shape: a DOM `FormData` cannot cross Electron IPC,
 * so the renderer sends the entries and the main process builds the real `FormData`.
 */
export interface FormDataBody {
  __type: 'formdata';
  /** Text fields as [name, value]. */
  entries: Array<[string, string]>;
  /** File fields as [name, path on disk]; the main process reads the files when sending, after the text fields. */
  files?: Array<[string, string]>;
}

/**
 * application/x-www-form-urlencoded body in a structured-clone-safe shape: a `URLSearchParams` cannot cross
 * Electron IPC, so the renderer sends the entries and the main process builds the real `URLSearchParams`.
 */
export interface UrlEncodedBody {
  __type: 'urlencoded';
  entries: Array<[string, string]>;
}

/** A body made of key/value fields. */
export type FieldsBody = FormDataBody | UrlEncodedBody;

export type RequestBody = ResponseBody | FieldsBody;

/** `TBody`: the body sent over the wire by default; e.g. `PostmanBody` for a request still in editor form. */
export interface HttpRequest<TBody = RequestBody> {
  body?: TBody;
  headers: Record<string, string>;
  method: Method | string;
  url: string;
}

export interface HttpResponse {
  body: ResponseBody;
  headers: Record<string, string>;
  status: string;
  time: number;
}
