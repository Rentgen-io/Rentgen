import { Method } from 'axios';
import { RESPONSE_STATUS_LABEL } from 'shared/responseStatus';
import { FormEntry, HttpRequest, HttpResponse, RequestBody } from 'shared/types/http';
import { PostmanBody } from 'shared/types/postman';
import { getHeaderValue } from 'shared/utils/headers';
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

// Same media types the HTTP handler parses as JSON or keeps as XML text, also with parameters such as `; charset=utf-8`
const JSON_CONTENT_TYPE_REGEX = /\bapplication\/([\w.-]+\+)?json\b/i;
const XML_CONTENT_TYPE_REGEX = /\b(text\/xml|application\/([\w.-]+\+)?xml)\b/i;

export type ResponseFormatWarning = 'missingContentType' | 'invalidJson' | 'invalidXml';

function isValidJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function isValidXml(text: string): boolean {
  return !new DOMParser().parseFromString(text, 'application/xml').getElementsByTagName('parsererror').length;
}

/**
 * The first problem with how a response declares its body: no Content-Type, then a body that doesn't match a JSON or
 * XML Content-Type. Responses without a body (e.g. 204) or without a status (network error, aborted) have none.
 */
export function getResponseFormatWarning(response: HttpResponse | null | undefined): ResponseFormatWarning | null {
  if (!response || !extractStatusCode(response)) return null;

  const { body } = response;
  if (body === null || body === undefined || body === '') return null;

  const contentType = getHeaderValue(response.headers ?? {}, 'content-type').trim();
  if (!contentType) return 'missingContentType';

  // The HTTP handler parses JSON bodies, so a JSON one still left as text didn't parse
  if (JSON_CONTENT_TYPE_REGEX.test(contentType) && typeof body === 'string' && !isValidJson(body)) return 'invalidJson';
  if (XML_CONTENT_TYPE_REGEX.test(contentType) && (typeof body !== 'string' || !isValidXml(body))) return 'invalidXml';

  return null;
}
