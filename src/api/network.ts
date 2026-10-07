import { HttpRequest, HttpResponse } from 'src/types';

export const sendHttp = (request: HttpRequest): Promise<HttpResponse> => window.electronAPI.sendHttp(request);

export const pingHost = (host: string): Promise<number> => window.electronAPI.pingHost(host);

export const connectWebSocket = (payload: { url: string; headers: Record<string, string> }): void =>
  window.electronAPI.connectWss(payload);

export const disconnectWebSocket = (): void => window.electronAPI.disconnectWss();

export const sendWebSocketMessage = (message: string): void => window.electronAPI.sendWss(message);

export const onWebSocketEvent = (listener: (event: any) => void): (() => void) | null =>
  window.electronAPI.onWssEvent ? window.electronAPI.onWssEvent(listener) : null;
