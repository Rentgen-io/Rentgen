import { Method } from 'axios';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectCurl } from 'src/store/selectors';
import { modalsActions } from 'src/store/slices/modalsSlice';
import { requestActions } from 'src/store/slices/requestSlice';
import { extractCurl } from 'src/utils';
import { notify } from 'src/utils/toast';
import { useReset } from './useReset';

const MAX_CURL_LENGTH = 200_000;

export function useCurlImport() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const curl = useAppSelector(selectCurl);

  const reset = useReset();

  return useCallback(() => {
    try {
      if (curl.length > MAX_CURL_LENGTH) throw new Error('cURL too large');

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

      dispatch(modalsActions.closeCurlModal());
    } catch (error) {
      console.error(error);
      notify.error(t('curl.invalidCurl'), { toastId: 'invalid-curl' });
    }
  }, [curl, reset, t, dispatch]);
}
