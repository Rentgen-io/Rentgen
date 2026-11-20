import { Method } from 'axios';
import { useCallback } from 'react';
import { headersToPostmanFormat } from 'shared/utils/headers';
import { fetchOpenApiSchema } from 'src/api/openapi';
import { extractCurl } from 'src/converters/curl';
import { isOpenApiSchema, openApiToFolder } from 'src/converters/openapi';
import { useReset } from 'src/hooks/useReset';
import { useAppDispatch } from 'src/store/hooks';
import { collectionActions } from 'src/store/slices/collectionSlice';
import { requestActions } from 'src/store/slices/requestSlice';
import { OpenApiDocument } from 'src/types/openapi';
import { parseJsonObject } from 'src/utils/object';
import { isHttpUrl } from 'src/utils/url';

const MAX_CURL_LENGTH = 200_000;

export function useResourceImport() {
  const dispatch = useAppDispatch();
  const reset = useReset();

  const importOpenApi = useCallback(
    (document: OpenApiDocument, sourceUrl?: string): boolean => {
      try {
        const folder = openApiToFolder(document, sourceUrl);
        if (folder.item.length === 0) return false;

        reset();
        dispatch(collectionActions.importFolder(folder));

        return true;
      } catch {
        return false;
      }
    },
    [dispatch, reset],
  );

  const importUrl = useCallback(
    (url: string): boolean => {
      reset();
      dispatch(requestActions.setUrl(url));

      return true;
    },
    [dispatch, reset],
  );

  const importCurl = useCallback(
    (curl: string): boolean => {
      try {
        if (curl.length > MAX_CURL_LENGTH) return false;

        const { body, headers, method, url } = extractCurl(curl);

        reset();
        dispatch(requestActions.setUrl(url));
        dispatch(requestActions.setMethod(method as Method));
        dispatch(requestActions.setHeaders(headersToPostmanFormat(headers)));
        dispatch(requestActions.setBody(body ?? {}));

        return true;
      } catch {
        return false;
      }
    },
    [dispatch, reset],
  );

  return useCallback(
    async (resource: string): Promise<boolean> => {
      const trimmed = resource.trim();
      if (!trimmed) return false;

      if (isHttpUrl(trimmed)) {
        const schema = await fetchOpenApiSchema(trimmed);
        return schema ? importOpenApi(schema, trimmed) : importUrl(trimmed);
      }

      const schema = parseJsonObject(trimmed);
      if (isOpenApiSchema(schema)) return importOpenApi(schema);

      return importCurl(trimmed);
    },
    [importOpenApi, importUrl, importCurl],
  );
}
