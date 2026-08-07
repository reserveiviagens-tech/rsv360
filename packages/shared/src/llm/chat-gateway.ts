/**
 * PR-13e — shared LLM chat gateway (OpenAI chat.completions).
 * Centralizes: API key fail-closed, timeout, user-message sanitize, safe logs.
 * Does not log prompts, completions, or secrets.
 */

import { LLM_MAX_MESSAGE_CHARS, sanitizeLlmText } from './prompt-sanitize.js';

export const LLM_GATEWAY_DEFAULT_MODEL = 'gpt-4o-mini';
export const LLM_GATEWAY_DEFAULT_TIMEOUT_MS = 20_000;
export const LLM_GATEWAY_DEFAULT_MAX_TOKENS = 500;

export type LlmChatRole = 'system' | 'user' | 'assistant';

export type LlmChatMessage = {
  role: LlmChatRole;
  content: string;
};

export type LlmChatGatewayRequest = {
  /** Logical surface id for safe telemetry (e.g. tax-chat). */
  surface: string;
  messages: LlmChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** When true, ask OpenAI for JSON object responses. */
  jsonObject?: boolean;
  /** Sanitize user-role messages (default true). */
  sanitizeUser?: boolean;
};

export type LlmChatGatewayOk = {
  ok: true;
  content: string;
  model: string;
  tokensIn?: number;
  tokensOut?: number;
};

export type LlmChatGatewayErr = {
  ok: false;
  error:
    | 'missing_api_key'
    | 'invalid_request'
    | 'timeout'
    | 'http_error'
    | 'empty'
    | 'network';
  status?: number;
};

export type LlmChatGatewayResult = LlmChatGatewayOk | LlmChatGatewayErr;

export type LlmChatGatewayDeps = {
  apiKey?: string | null;
  fetchImpl?: typeof fetch;
  now?: () => number;
  log?: (event: string, meta: Record<string, string | number | boolean | null>) => void;
};

function defaultLog(
  event: string,
  meta: Record<string, string | number | boolean | null>,
): void {
  console.info(`[llm-gateway] ${event} ${JSON.stringify(meta)}`);
}

function resolveApiKey(deps?: LlmChatGatewayDeps): string {
  const fromDeps = (deps?.apiKey ?? '').trim();
  if (fromDeps) return fromDeps;
  return (process.env.OPENAI_API_KEY || '').trim();
}

function prepareMessages(
  messages: LlmChatMessage[],
  sanitizeUser: boolean,
): LlmChatMessage[] | null {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const out: LlmChatMessage[] = [];
  for (const msg of messages) {
    if (!msg || (msg.role !== 'system' && msg.role !== 'user' && msg.role !== 'assistant')) {
      return null;
    }
    let content = typeof msg.content === 'string' ? msg.content : '';
    if (msg.role === 'user' && sanitizeUser) {
      content = sanitizeLlmText(content, LLM_MAX_MESSAGE_CHARS);
    } else if (msg.role === 'system') {
      // Cap system prompts to avoid accidental huge dumps (still allow longer than user).
      content = content.slice(0, 12_000);
    }
    if (!content.trim() && msg.role === 'user') return null;
    out.push({ role: msg.role, content });
  }
  return out;
}

/**
 * Call OpenAI chat.completions through the shared gateway.
 */
export async function llmChatCompletion(
  req: LlmChatGatewayRequest,
  deps: LlmChatGatewayDeps = {},
): Promise<LlmChatGatewayResult> {
  const log = deps.log ?? defaultLog;
  const surface = sanitizeLlmText(req.surface, 64) || 'unknown';
  const apiKey = resolveApiKey(deps);

  if (!apiKey) {
    log('reject', { surface, error: 'missing_api_key' });
    return { ok: false, error: 'missing_api_key' };
  }

  const sanitizeUser = req.sanitizeUser !== false;
  const messages = prepareMessages(req.messages, sanitizeUser);
  if (!messages) {
    log('reject', { surface, error: 'invalid_request' });
    return { ok: false, error: 'invalid_request' };
  }

  const model =
    (req.model || process.env.OPENAI_MODEL || LLM_GATEWAY_DEFAULT_MODEL).trim() ||
    LLM_GATEWAY_DEFAULT_MODEL;
  const timeoutMs = Math.max(
    1_000,
    req.timeoutMs ?? LLM_GATEWAY_DEFAULT_TIMEOUT_MS,
  );
  const maxTokens = Math.min(
    4_000,
    Math.max(1, req.maxTokens ?? LLM_GATEWAY_DEFAULT_MAX_TOKENS),
  );
  const temperature =
    typeof req.temperature === 'number' && Number.isFinite(req.temperature)
      ? Math.min(2, Math.max(0, req.temperature))
      : 0.3;

  const fetchImpl = deps.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = (deps.now ?? Date.now)();

  try {
    const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        ...(req.jsonObject ? { response_format: { type: 'json_object' } } : {}),
        messages,
      }),
    });

    if (!response.ok) {
      log('http_error', {
        surface,
        status: response.status,
        model,
        durationMs: (deps.now ?? Date.now)() - started,
      });
      return { ok: false, error: 'http_error', status: response.status };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      model?: string;
    };
    const content = payload.choices?.[0]?.message?.content?.trim() || '';
    if (!content) {
      log('empty', {
        surface,
        model,
        durationMs: (deps.now ?? Date.now)() - started,
      });
      return { ok: false, error: 'empty' };
    }

    log('ok', {
      surface,
      model: payload.model || model,
      durationMs: (deps.now ?? Date.now)() - started,
      tokensIn: payload.usage?.prompt_tokens ?? null,
      tokensOut: payload.usage?.completion_tokens ?? null,
    });

    return {
      ok: true,
      content,
      model: payload.model || model,
      tokensIn: payload.usage?.prompt_tokens,
      tokensOut: payload.usage?.completion_tokens,
    };
  } catch (err) {
    const name = (err as Error)?.name || '';
    if (name === 'AbortError') {
      log('timeout', { surface, model, timeoutMs });
      return { ok: false, error: 'timeout' };
    }
    log('network', { surface, model, errName: name || 'Error' });
    return { ok: false, error: 'network' };
  } finally {
    clearTimeout(timer);
  }
}
