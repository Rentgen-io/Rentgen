import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { connectWebSocket, disconnectWebSocket, onWebSocketEvent, sendWebSocketMessage } from 'src/api/network';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import {
  selectBody,
  selectDynamicVariables,
  selectHeaders,
  selectSelectedEnvironment,
  selectUrl,
} from 'src/store/selectors';
import { websocketActions } from 'src/store/slices/websocketSlice';
import { substituteRequestVariables } from 'src/utils';

export function useWssEventBridge() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const listener = (event: any) => {
      if (event.type === 'open') dispatch(websocketActions.handleWssOpen(event.data));
      else if (event.type === 'close') dispatch(websocketActions.handleWssClose(event.data));
      else if (event.type === 'message') dispatch(websocketActions.handleWssMessage({ data: String(event.data) }));
      else if (event.type === 'error') dispatch(websocketActions.handleWssError(event.error));
    };

    return onWebSocketEvent(listener) ?? undefined;
  }, [dispatch]);
}

export function useWssActions() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const body = useAppSelector(selectBody);
  const dynamicVariables = useAppSelector(selectDynamicVariables);
  const headers = useAppSelector(selectHeaders);
  const selectedEnvironment = useAppSelector(selectSelectedEnvironment);
  const url = useAppSelector(selectUrl);

  const {
    url: memoizedUrl,
    headers: memoizedHeaders,
    body: memoizedBody,
  } = useMemo(
    () => substituteRequestVariables(url, headers, body, selectedEnvironment, dynamicVariables),
    [url, headers, body, selectedEnvironment, dynamicVariables],
  );

  const connect = useCallback(() => {
    if (!memoizedUrl.startsWith('ws')) {
      dispatch(websocketActions.addMessage({ direction: 'system', data: t('request.wssUrlRequired') }));
      return;
    }

    connectWebSocket({ url: memoizedUrl, headers: memoizedHeaders });
  }, [memoizedUrl, memoizedHeaders, t, dispatch]);

  const disconnect = useCallback(() => disconnectWebSocket(), []);

  const send = useCallback(() => {
    const message = typeof memoizedBody === 'string' ? memoizedBody : JSON.stringify(memoizedBody, null, 2);

    dispatch(websocketActions.handleWssSent({ data: message }));
    sendWebSocketMessage(message);
  }, [memoizedBody, dispatch]);

  return { connect, disconnect, send };
}
