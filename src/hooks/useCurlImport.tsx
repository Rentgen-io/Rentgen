import { Method } from 'axios';
import { useCallback } from 'react';
import { useAppDispatch } from 'src/store/hooks';
import { requestActions } from 'src/store/slices/requestSlice';
import { extractCurl } from 'src/utils';
import { useReset } from './useReset';

const MAX_CURL_LENGTH = 200_000;

export function useCurlImport() {
  const dispatch = useAppDispatch();
  const reset = useReset();

  return useCallback(
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
    [reset, dispatch],
  );
}
