# HANDOFF — FASE 0 Auth Refresh (+ REWORK)

**Status:** VALIDATED  
**Executor:** Cursor  
**Orchestrator:** Antigravity  
**Branch:** `fix/auth-refresh-contract`  
**Base / HEAD commit:** `8c9efe9d` (== `origin/main`; FASE 0 still uncommitted)  
**Commit/push:** NOT DONE

## Latest gate history

1. Implementation → VALIDATION_REQUESTED  
2. Antigravity → **NEEDS_REWORK** (direct `window.location.href` in service)  
3. Cursor REWORK → **VALIDATION_REQUESTED** (this handoff)
4. Antigravity → **VALIDATED** (Router decoupled, event bridge validated)

## Diagnosis (final after REWORK)

- Onion `api.ts` no longer navigates; on failed refresh after 401 it calls `notifySessionExpired()` → `CustomEvent('auth:expired')` with **no detail**.
- `AuthContext` listens (client-only), `clearAuth()`, `router.replace('/login?reason=session_expired')` via `next/router`, with attach/detach cleanup.
- Prior FASE 0 contract preserved: v1 path, cookie-first, `credentials: 'include'`, no `refresh_token: undefined`.

## Files touched (REWORK + prior FASE 0)

| Path | Role |
|------|------|
| `apps/turismo/src/services/api.ts` | refresh + notifySessionExpired (no location.href) |
| `apps/turismo/src/context/AuthContext.tsx` | auth:expired listener + Router |
| `apps/turismo/src/lib/auth-refresh-request.cjs` | helpers + event bridge |
| `apps/turismo/src/lib/auth-refresh-request.ts` | TS re-exports |
| `apps/turismo/src/lib/auth-refresh-request.test.cjs` | 11 tests |
| `.agents/shared/*` | operational state |

## Tests

```text
node --test apps/turismo/src/lib/auth-refresh-request.test.cjs
→ 11/11 PASS
```

Covers: v1 path; cookie-first `{}`; legacy string body; no `/api/core/refresh`; no `window.location.href='/login'`; event without PII; listener cleanup; AuthContext source wiring.

## Validation

| Check | Result |
|-------|--------|
| Unit (node:test) | PASS 11/11 |
| type-check turismo | PASS |
| lint turismo | FAIL (setup): missing `next/dist/compiled/babel/eslint-parser` — **pre-existing tooling**, unchanged by REWORK |

## Preserved untracked (not part of this slice)

- `Aruanda2.md`
- `docs/governance/PROTOCOLO-CONVIVENCIA-ANTIGRAVITY-CURSOR.md`
- `test-compose.yml`

## Blockers

- ESLint tooling gap remains environment-only; do not bump deps in this phase.

## Next step

**STOP.** FASE 0 is VALIDATED and complete.  
Do **not** start FASE 1. Await Owner instruction for commit/push.
