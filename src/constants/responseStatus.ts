import { snakeCaseToTitleCase } from 'src/utils';

export const RESPONSE_STATUS = {
  NETWORK_ERROR: 0,
  OK: 200,
  NO_CONTENT: 204,
  REDIRECT: 300,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
} as const;

// Pseudo-statuses written into the response slice while a request is in flight or failed before a status existed.
export const RESPONSE_STATUS_LABEL = {
  SENDING: 'Sending...',
  NETWORK_ERROR: 'Network Error',
} as const;

type ResponseStatusValue = (typeof RESPONSE_STATUS)[keyof typeof RESPONSE_STATUS];

const STATUS_TO_STRING: Record<ResponseStatusValue, string> = Object.fromEntries(
  Object.entries(RESPONSE_STATUS).map(([key, value]) => [value, key]),
) as Record<ResponseStatusValue, string>;

export function getResponseStatusTitle(code: ResponseStatusValue): string {
  const key = STATUS_TO_STRING[code];
  const title = key ? snakeCaseToTitleCase(key) : 'Unknown Status';

  return code === RESPONSE_STATUS.OK ? title.toUpperCase() : title;
}
