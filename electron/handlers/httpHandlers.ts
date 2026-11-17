import axios from 'axios';
import { exec } from 'child_process';
import { ipcMain } from 'electron';
import { toRequestData } from 'shared/node/requestData';
import { RESPONSE_STATUS_LABEL } from 'shared/responseStatus';
import { HttpRequest, HttpResponse, ResponseBody } from 'shared/types/http';

function decodeToText(data: unknown): string | null {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(data));
  if (ArrayBuffer.isView(data))
    return new TextDecoder().decode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));

  return null;
}

function parseJsonOrText(text: string): ResponseBody {
  try {
    return JSON.parse(text) as ResponseBody;
  } catch {
    return text;
  }
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trim();

  return (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
}

function toBody(data: unknown, contentType: string): ResponseBody {
  if (data === null || data === undefined) return null;

  const text = decodeToText(data);

  if (text === null) {
    if (Array.isArray(data)) return data;
    if (typeof data === 'object') return data as Record<string, unknown>;
    if (typeof data === 'number' || typeof data === 'boolean') return data;

    return String(data);
  }
  if (text === '') return null;

  if (/\bapplication\/([\w.-]+\+)?json\b/i.test(contentType)) return parseJsonOrText(text);
  if (
    !/\b(text\/(html|xml|css|javascript|csv)|application\/([\w.-]+\+)?xml)\b/i.test(contentType) &&
    looksLikeJson(text)
  )
    return parseJsonOrText(text);

  return text;
}

const activeRequests = new Map<string, AbortController>();

export function registerHttpHandlers(): void {
  ipcMain.on('http-abort', (_event, requestId: string) => {
    activeRequests.get(requestId)?.abort();
  });

  ipcMain.handle(
    'http-request',
    async (_event, { url, method, headers, body }: HttpRequest, requestId?: string): Promise<HttpResponse> => {
      const requestStartTime = performance.now();
      const controller = requestId ? new AbortController() : undefined;

      if (requestId && controller) activeRequests.set(requestId, controller);

      try {
        const response = await axios({
          url,
          method,
          headers,
          data: await toRequestData(body),
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          responseType: 'arraybuffer',
          validateStatus: () => true,
          signal: controller?.signal,
        });
        const responseTime = performance.now() - requestStartTime;
        const contentTypeRaw =
          response.headers && (response.headers['content-type'] || response.headers['Content-Type']);
        const contentType = typeof contentTypeRaw === 'string' ? contentTypeRaw : '';

        let responseBody: ResponseBody;

        try {
          responseBody = toBody(response.data, contentType);
        } catch {
          responseBody = '[unprintable response]';
        }

        return {
          status: `${response.status} ${response.statusText}`,
          time: responseTime,
          headers: response.headers as Record<string, string>,
          body: responseBody,
        };
      } catch (error) {
        const responseTime = performance.now() - requestStartTime;

        if (axios.isCancel(error))
          return { status: RESPONSE_STATUS_LABEL.ABORTED, time: responseTime, headers: {}, body: null };

        if ((error as NodeJS.ErrnoException)?.code === 'EPIPE')
          return {
            status: '413 Payload Too Large (EPIPE)',
            time: responseTime,
            headers: {},
            body: null,
          };

        return { status: 'Error', time: responseTime, headers: {}, body: String(error) };
      } finally {
        if (requestId) activeRequests.delete(requestId);
      }
    },
  );

  ipcMain.handle('ping-host', async (_, host: string) => {
    return new Promise<number>((resolve, reject) => {
      const platform = process.platform;
      const cmd = platform === 'win32' ? `ping -n 1 ${host}` : `ping -c 1 ${host}`;
      const start = Date.now();

      exec(cmd, (error) => {
        if (error) return reject(error);

        const time = Date.now() - start;
        resolve(time);
      });
    });
  });
}
