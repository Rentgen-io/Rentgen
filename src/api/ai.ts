import i18n from 'src/i18n';
import { AIProvider, HttpBody } from 'src/types';
import { sendHttp } from './network';
import { extractStatusCode, isObject } from 'src/utils';

const CHAT_COMPLETIONS_PATH = '/chat/completions';

export type AiRole = 'system' | 'user' | 'assistant';

export interface AiMessage {
  role: AiRole;
  content: string;
}

export type AiProviderConfig = Pick<AIProvider, 'baseUrl' | 'model' | 'apiKey'>;

export type AiChatResult =
  | { ok: true; content: string; body: HttpBody }
  | { ok: false; error: string; body?: HttpBody };

export const normalizeAiBaseUrl = (baseUrl: string): string => baseUrl.trim().replace(/\/+$/, '');

function asRecord(value: unknown): Record<string, unknown> | null {
  return isObject(value) && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

// Supports both the OpenAI-compatible shape (choices[].message.content) and Ollama's native shape (message.content).
function extractContent(body: HttpBody): string | null {
  const root = asRecord(body);
  if (!root) return null;

  const choices = Array.isArray(root.choices) ? root.choices : null;
  const message = asRecord(choices?.[0]) ? asRecord(asRecord(choices?.[0])?.message) : asRecord(root.message);
  const content = message?.content;

  return typeof content === 'string' ? content : null;
}

function extractError(body: HttpBody, status: string): string {
  const root = asRecord(body);
  const error = root?.error;

  if (typeof error === 'string') return error;

  const message = asRecord(error)?.message;
  if (typeof message === 'string') return message;

  return body && typeof body === 'string' ? body.replace(/^(?:[A-Z][A-Za-z]*)?Error:\s*/, '').trim() : status;
}

export async function sendAiChatRequest(provider: AiProviderConfig, messages: AiMessage[]): Promise<AiChatResult> {
  const baseUrl = normalizeAiBaseUrl(provider.baseUrl);
  if (!baseUrl || !provider.model) return { ok: false, error: i18n.t('ai.baseUrlAndModelRequired') };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (provider.apiKey) headers.Authorization = `Bearer ${provider.apiKey}`;

  try {
    const response = await sendHttp({
      method: 'POST',
      url: `${baseUrl}${CHAT_COMPLETIONS_PATH}`,
      headers,
      body: { model: provider.model, messages, stream: false },
    });
    const statusCode = extractStatusCode(response);

    if (statusCode < 200 || statusCode >= 300)
      return { ok: false, error: extractError(response.body, response.status), body: response.body };

    const content = extractContent(response.body);
    if (content === null) return { ok: false, error: i18n.t('ai.unexpectedResponse'), body: response.body };

    return { ok: true, content, body: response.body };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export const testAiConnection = (provider: AiProviderConfig): Promise<AiChatResult> =>
  sendAiChatRequest(provider, [{ role: 'user', content: 'Reply with "ok" if you can read this.' }]);
