"use strict";
/**
 * PR-13e — shared LLM chat gateway (OpenAI chat.completions).
 * Centralizes: API key fail-closed, timeout, user-message sanitize, safe logs.
 * Does not log prompts, completions, or secrets.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLM_GATEWAY_DEFAULT_MAX_TOKENS = exports.LLM_GATEWAY_DEFAULT_TIMEOUT_MS = exports.LLM_GATEWAY_DEFAULT_MODEL = void 0;
exports.llmChatCompletion = llmChatCompletion;
const prompt_sanitize_js_1 = require("./prompt-sanitize.js");
exports.LLM_GATEWAY_DEFAULT_MODEL = 'gpt-4o-mini';
exports.LLM_GATEWAY_DEFAULT_TIMEOUT_MS = 20_000;
exports.LLM_GATEWAY_DEFAULT_MAX_TOKENS = 500;
function defaultLog(event, meta) {
    console.info(`[llm-gateway] ${event} ${JSON.stringify(meta)}`);
}
function resolveApiKey(deps) {
    const fromDeps = (deps?.apiKey ?? '').trim();
    if (fromDeps)
        return fromDeps;
    return (process.env.OPENAI_API_KEY || '').trim();
}
function prepareMessages(messages, sanitizeUser) {
    if (!Array.isArray(messages) || messages.length === 0)
        return null;
    const out = [];
    for (const msg of messages) {
        if (!msg || (msg.role !== 'system' && msg.role !== 'user' && msg.role !== 'assistant')) {
            return null;
        }
        let content = typeof msg.content === 'string' ? msg.content : '';
        if (msg.role === 'user' && sanitizeUser) {
            content = (0, prompt_sanitize_js_1.sanitizeLlmText)(content, prompt_sanitize_js_1.LLM_MAX_MESSAGE_CHARS);
        }
        else if (msg.role === 'system') {
            // Cap system prompts to avoid accidental huge dumps (still allow longer than user).
            content = content.slice(0, 12_000);
        }
        if (!content.trim() && msg.role === 'user')
            return null;
        out.push({ role: msg.role, content });
    }
    return out;
}
/**
 * Call OpenAI chat.completions through the shared gateway.
 */
async function llmChatCompletion(req, deps = {}) {
    const log = deps.log ?? defaultLog;
    const surface = (0, prompt_sanitize_js_1.sanitizeLlmText)(req.surface, 64) || 'unknown';
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
    const model = (req.model || process.env.OPENAI_MODEL || exports.LLM_GATEWAY_DEFAULT_MODEL).trim() ||
        exports.LLM_GATEWAY_DEFAULT_MODEL;
    const timeoutMs = Math.max(1_000, req.timeoutMs ?? exports.LLM_GATEWAY_DEFAULT_TIMEOUT_MS);
    const maxTokens = Math.min(4_000, Math.max(1, req.maxTokens ?? exports.LLM_GATEWAY_DEFAULT_MAX_TOKENS));
    const temperature = typeof req.temperature === 'number' && Number.isFinite(req.temperature)
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
        const payload = (await response.json());
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
    }
    catch (err) {
        const name = err?.name || '';
        if (name === 'AbortError') {
            log('timeout', { surface, model, timeoutMs });
            return { ok: false, error: 'timeout' };
        }
        log('network', { surface, model, errName: name || 'Error' });
        return { ok: false, error: 'network' };
    }
    finally {
        clearTimeout(timer);
    }
}
