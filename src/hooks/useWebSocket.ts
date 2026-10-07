import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { selectBody, selectHeaders, selectUrl } from 'src/store/selectors';
import { websocketActions } from 'src/store/slices/websocketSlice';
import { parseHeaders } from 'src/utils';

export function useWssEventBridge() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!window.electronAPI.onWssEvent) return;

    const listener = (event: any) => {
      if (event.type === 'open') dispatch(websocketActions.handleWssOpen(event.data));
      else if (event.type === 'close') dispatch(websocketActions.handleWssClose(event.data));
      else if (event.type === 'message') dispatch(websocketActions.handleWssMessage({ data: String(event.data) }));
      else if (event.type === 'error') dispatch(websocketActions.handleWssError(event.error));
    };

    return window.electronAPI.onWssEvent(listener);
  }, [dispatch]);
}

export function useWssActions() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const url = useAppSelector(selectUrl);
  const headers = useAppSelector(selectHeaders);
  const body = useAppSelector(selectBody);

  const connect = useCallback(() => {
    if (!url.startsWith('ws')) {
      dispatch(websocketActions.addMessage({ direction: 'system', data: t('request.wssUrlRequired') }));
      return;
    }

    window.electronAPI.connectWss({ url, headers: parseHeaders(headers) });
  }, [url, headers, t, dispatch]);

  const disconnect = useCallback(() => window.electronAPI.disconnectWss(), []);

  const send = useCallback(() => {
    dispatch(websocketActions.handleWssSent({ data: body }));
    window.electronAPI.sendWss(body);
  }, [body, dispatch]);

  return { connect, disconnect, send };
}
