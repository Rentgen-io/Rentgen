import { Method } from 'axios';
import { useCallback } from 'react';
import { useAppDispatch } from 'src/store/hooks';
import { collectionActions } from 'src/store/slices/collectionSlice';
import { requestActions } from 'src/store/slices/requestSlice';
import { OpenApiDocument } from 'src/types';
import {
  extractCurl,
  fetchOpenApiSchema,
  isHttpUrl,
  isOpenApiSchema,
  openApiToFolder,
  parseJsonObject,
} from 'src/utils';
import { useReset } from './useReset';

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

        const {
          body: curlBody,
          decodedLines,
          headers: curlHeaders,
          method: curlMethod,
          url: curlUrl,
        } = extractCurl(curl);

        reset();
        dispatch(requestActions.setUrl(curlUrl));
        dispatch(requestActions.setMethod(curlMethod as Method));
        dispatch(
          requestActions.setHeaders(
            Object.entries(curlHeaders)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n'),
          ),
        );

        if (decodedLines.length > 0) dispatch(requestActions.setBody(decodedLines.join('\n')));
        else dispatch(requestActions.setBody(curlBody ? String(curlBody).trim() : ''));

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
