/**
 * PR-13e — shared LLM chat gateway (OpenAI chat.completions).
 * Centralizes: API key fail-closed, timeout, user-message sanitize, safe logs.
 * Does not log prompts, completions, or secrets.
 */
export declare const LLM_GATEWAY_DEFAULT_MODEL = "gpt-4o-mini";
export declare const LLM_GATEWAY_DEFAULT_TIMEOUT_MS = 20000;
export declare const LLM_GATEWAY_DEFAULT_MAX_TOKENS = 500;
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
    error: 'missing_api_key' | 'invalid_request' | 'timeout' | 'http_error' | 'empty' | 'network';
    status?: number;
};
export type LlmChatGatewayResult = LlmChatGatewayOk | LlmChatGatewayErr;
export type LlmChatGatewayDeps = {
    apiKey?: string | null;
    fetchImpl?: typeof fetch;
    now?: () => number;
    log?: (event: string, meta: Record<string, string | number | boolean | null>) => void;
};
/**
 * Call OpenAI chat.completions through the shared gateway.
 */
export declare function llmChatCompletion(req: LlmChatGatewayRequest, deps?: LlmChatGatewayDeps): Promise<LlmChatGatewayResult>;
