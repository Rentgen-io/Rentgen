import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { connectWebSocket, disconnectWebSocket, onWebSocketEvent, sendWebSocketMessage } from 'src/api/network';
import { store } from 'src/store';
import { useAppDispatch } from 'src/store/hooks';
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

/**
 * Returned callbacks are stable and don't subscribe the calling component to the request, so typing in the URL /
 * message doesn't re-run the variable substitution on every keystroke.
 */
export function useWssActions() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const connect = useCallback(() => {
    const { url, headers } = substituteCurrentRequest();

    if (!url.startsWith('ws')) {
      dispatch(websocketActions.addMessage({ direction: 'system', data: t('request.wssUrlRequired') }));
      return;
    }

    connectWebSocket({ url, headers });
  }, [t, dispatch]);

  const disconnect = useCallback(() => disconnectWebSocket(), []);

  const send = useCallback(() => {
    const { body } = substituteCurrentRequest();
    const message = body == null ? '' : typeof body === 'string' ? body : JSON.stringify(body);

    dispatch(websocketActions.handleWssSent({ data: message }));
    sendWebSocketMessage(message);
  }, [dispatch]);

  return { connect, disconnect, send };
}

// Variables are substituted when connecting / sending, from the current store state
function substituteCurrentRequest() {
  const state = store.getState();

  return substituteRequestVariables(
    selectBody(state),
    selectSelectedEnvironment(state),
    selectDynamicVariables(state),
    selectHeaders(state),
    selectUrl(state),
  );
}
