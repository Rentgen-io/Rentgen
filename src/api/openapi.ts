import { isSuccessStatus } from 'shared/responseStatus';
import { isOpenApiSchema } from 'src/converters/openapi';
import { OpenApiDocument } from 'src/types/openapi';
import { extractStatusCode } from 'src/utils/http';
import { parseJsonObject } from 'src/utils/object';
import { sendHttp } from './network';

export async function fetchOpenApiSchema(url: string): Promise<OpenApiDocument | null> {
  try {
    const response = await sendHttp({ method: 'GET', url, headers: { Accept: 'application/json' } });
    const statusCode = extractStatusCode(response);
    if (!isSuccessStatus(statusCode)) return null;

    const schema = parseJsonObject(response.body);
    return isOpenApiSchema(schema) ? schema : null;
  } catch {
    return null;
  }
}
