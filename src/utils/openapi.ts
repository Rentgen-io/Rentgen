import { RESPONSE_STATUS } from 'shared/responseStatus';
import { sendHttp } from 'src/api/network';
import { extractStatusCode } from './http';
import { isPlainObject, parseJsonObject } from './object';

export type OpenApiSchema = Record<string, unknown> & { info: Record<string, unknown> };

export function isOpenApiSchema(value: unknown): value is OpenApiSchema {
  if (!isPlainObject(value) || !isPlainObject(value.info)) return false;

  const isOpenApi3 = typeof value.openapi === 'string' && /^3\.\d+/.test(value.openapi);
  const isSwagger2 = value.swagger === '2.0';
  if (!isOpenApi3 && !isSwagger2) return false;

  // OpenAPI 3.1 allows documents without `paths` as long as `webhooks` or `components` exist
  return isPlainObject(value.paths) || isPlainObject(value.webhooks) || isPlainObject(value.components);
}

export async function fetchOpenApiSchema(url: string): Promise<OpenApiSchema | null> {
  try {
    const response = await sendHttp({ method: 'GET', url, headers: { Accept: 'application/json' } });
    const statusCode = extractStatusCode(response);
    if (statusCode < RESPONSE_STATUS.OK || statusCode >= RESPONSE_STATUS.REDIRECT) return null;

    const schema = parseJsonObject(response.body);
    return isOpenApiSchema(schema) ? schema : null;
  } catch {
    return null;
  }
}
