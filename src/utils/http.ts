import { Method } from 'axios';
import { RESPONSE_STATUS_LABEL } from 'shared/responseStatus';
import { FormEntry, HttpRequest, HttpResponse, RequestBody } from 'shared/types/http';
import { PostmanBody } from 'shared/types/postman';
import { buildFieldsBody } from 'shared/utils/http';
import { tryParseJsonObject } from './object';

const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD']);

// ---------- Requests ----------

/** Builds the request to send; GET and HEAD requests never get a body. */
export function createHttpRequest(
  body: RequestBody,
  headers: Record<string, string>,
  method: Method | (string & {}),
  url: string,
): HttpRequest {
  const request: HttpRequest = { url, method, headers };
  if (body && !METHODS_WITHOUT_BODY.has(method.toUpperCase())) request.body = body;

  return request;
}

// ---------- Bodies ----------

/** Builds the body that is sent from the editor body: form-data or urlencoded fields, or the parsed raw text. */
export function buildRequestBody(body: PostmanBody): RequestBody {
  return buildFieldsBody(body) ?? (tryParseJsonObject(body.raw ?? null) as RequestBody);
}

/** Beautifies the raw body editor text: indents JSON, leaves any other text unchanged (it is sent as typed). */
export function formatBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

export function convertUrlEncodedToFormEntries(encoded: string): FormEntry[] {
  return Array.from(new URLSearchParams(encoded).entries());
}

// ---------- Responses ----------

/** The numeric status code from a status like "200 OK"; 0 when there is none (e.g. a network error). */
export function extractStatusCode(response: HttpResponse | null): number {
  const statusCode = parseInt(String(response?.status || '').split(' ')[0] || '0', 10);

  return Number.isFinite(statusCode) ? statusCode : 0;
}

/** Whether the request was cancelled by the user (the HTTP handler resolves it with this status, it doesn't throw). */
export function isAbortedResponse(response: HttpResponse | null | undefined): boolean {
  return response?.status === RESPONSE_STATUS_LABEL.ABORTED;
}
