/**
 * PR-13e — shared LLM chat gateway unit tests.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { llmChatCompletion } from '@rsv360/shared';

describe('PR-13e — llmChatCompletion gateway', () => {
  it('fails closed without API key', async () => {
    const result = await llmChatCompletion(
      {
        surface: 'test',
        messages: [{ role: 'user', content: 'hello' }],
      },
      { apiKey: '', fetchImpl: jest.fn() as unknown as typeof fetch },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('missing_api_key');
  });

  it('rejects empty / invalid messages', async () => {
    const result = await llmChatCompletion(
      { surface: 'test', messages: [] },
      { apiKey: 'sk-test', fetchImpl: jest.fn() as unknown as typeof fetch },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid_request');
  });

  it('returns content on happy path and never logs prompt text', async () => {
    const logs: string[] = [];
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        model: 'gpt-4o-mini',
        choices: [{ message: { content: 'ok-response' } }],
        usage: { prompt_tokens: 3, completion_tokens: 2 },
      }),
    })) as unknown as typeof fetch;

    const result = await llmChatCompletion(
      {
        surface: 'tax-chat',
        messages: [
          { role: 'system', content: 'sys' },
          { role: 'user', content: 'secret-user-prompt-xyz' },
        ],
      },
      {
        apiKey: 'sk-test',
        fetchImpl,
        log: (event, meta) => {
          logs.push(`${event}:${JSON.stringify(meta)}`);
        },
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.content).toBe('ok-response');
      expect(result.tokensIn).toBe(3);
    }
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const joined = logs.join('\n');
    expect(joined).toContain('"surface":"tax-chat"');
    expect(joined).not.toContain('secret-user-prompt-xyz');
    expect(joined).not.toContain('sk-test');
  });

  it('maps AbortError to timeout', async () => {
    const fetchImpl = jest.fn(async () => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      throw err;
    }) as unknown as typeof fetch;

    const result = await llmChatCompletion(
      {
        surface: 'split-suggest',
        messages: [{ role: 'user', content: 'ctx' }],
        timeoutMs: 1000,
      },
      { apiKey: 'sk-test', fetchImpl },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('timeout');
  });

  it('maps non-OK HTTP to http_error', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: false,
      status: 429,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const result = await llmChatCompletion(
      {
        surface: 'comissoes-ia',
        messages: [{ role: 'user', content: 'obj=padrao' }],
      },
      { apiKey: 'sk-test', fetchImpl },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('http_error');
      expect(result.status).toBe(429);
    }
  });
});
