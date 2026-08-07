# PR-13e — Shared LLM chat gateway

**Branch:** `security/pr-13e-llm-gateway`  
**Baseline:** `fe0394323eb83786da775eb8a8b1a9e513c37ffe` (pós-13d / #227)

## Escopo

- Novo `@rsv360/shared` `llm/chat-gateway` (`llmChatCompletion`):
  - fail-closed sem `OPENAI_API_KEY`
  - timeout (`AbortController`, default 20s)
  - sanitize de mensagens `user` (PR-13b)
  - logs estruturados **sem** prompt/completion/secret
- Migrados para o gateway (fetch direto removido):
  - `tax-chat-service`
  - `split-suggestion-service` (AI path)
  - `comissoes-ia-suggest`

## OUT (follow-up)

- Migrar restantes: ai-search, onboarding SDK, Instrutor SDK, expense-classifier, acomodações import  
- Rate limit / quota central no gateway  
- Redis / circuit breaker  

## Test plan

```bash
cd packages/shared && npm run build
cd apps/site-publico && npx jest __tests__/lib/llm-chat-gateway.test.ts __tests__/lib/llm-prompt-sanitize.test.ts --forceExit
cd backend && npx jest src/__tests__/unit/comissoes-ia-suggest.test.ts --forceExit
```

Resultado: **14 + 2 passed**.

## Risco

- Blast radius: shared + 3 superfícies já sanitizadas (13b).  
- Comportamento de fallback preservado (tax/split/comissões).  
- Superfícies fora do wiring continuam com fetch/SDK próprios até follow-up.

## Rollback

Revert do squash merge desta PR.
