import { HttpRequest, HttpResponse } from 'src/types';
import { v4 as uuidv4 } from 'uuid';

export const sendHttp = async (request: HttpRequest, signal?: AbortSignal): Promise<HttpResponse> => {
  if (!signal) return window.electronAPI.sendHttp(request);

  signal.throwIfAborted();

  const requestId = `http_req_${uuidv4()}`;
  const onAbort = () => window.electronAPI.abortHttp(requestId);

  signal.addEventListener('abort', onAbort, { once: true });

  try {
    return await window.electronAPI.sendHttp(request, requestId);
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
};

export const pingHost = (host: string): Promise<number> => window.electronAPI.pingHost(host);

export const connectWebSocket = (payload: { url: string; headers: Record<string, string> }): void =>
  window.electronAPI.connectWss(payload);

export const disconnectWebSocket = (): void => window.electronAPI.disconnectWss();

export const sendWebSocketMessage = (message: string): void => window.electronAPI.sendWss(message);

export const onWebSocketEvent = (listener: (event: any) => void): (() => void) | null =>
  window.electronAPI.onWssEvent ? window.electronAPI.onWssEvent(listener) : null;
