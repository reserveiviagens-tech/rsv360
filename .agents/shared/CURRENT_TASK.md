# CURRENT_TASK — FASE 0 Auth Refresh

**Task ID:** FASE-0-AUTH-REFRESH  
**Status:** VALIDATION_REQUESTED (post-REWORK)  
**Executor:** Cursor  
**Authorized by Owner:** APROVADO — REWORK FASE 0 only (Antigravity NEEDS_REWORK)

## Objective

Align Turismo onion `apps/turismo/src/services/api.ts` refresh with canonical `POST /api/v1/auth/refresh` (cookie-first, `credentials: 'include'`, never `refresh_token: undefined`).

## Allowed files

- `apps/turismo/src/services/api.ts`
- `apps/turismo/src/lib/auth-refresh-request.cjs`
- `apps/turismo/src/lib/auth-refresh-request.ts`
- `apps/turismo/src/lib/auth-refresh-request.test.cjs`
- `.agents/shared/*` (bootstrap / handoff)

## Forbidden

FASE 1+; dependency bumps; migrations; Enterprise Rules; Partner 2.0; production; `.env`; commit; push.

## Acceptance

- No `/api/core/refresh` in active `api.ts`
- Cookie-first body `{}` without non-string token
- Tests fail-before / pass-after
- lint + typecheck (document failures)
- HANDOFF + EXECUTION_LOG updated; stop for Antigravity
