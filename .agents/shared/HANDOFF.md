# HANDOFF — FASE 1 Safe Bumps

**Status:** VALIDATION_REQUESTED  
**Executor:** Cursor  
**Orchestrator:** Antigravity  
**Branch:** `chore/fase1-safe-bumps`  
**HEAD (no FASE 1 commit yet):** `8c9efe9d` (== origin/main base)  
**FASE 0 checkpoint (untouched):** `fix/auth-refresh-contract` @ `c42222848bf27bfcb38e50faecbf979d5fe5c240`

## Impact analysis (before implement)

| Item | Evidence | Action |
|------|----------|--------|
| `google-auth-library` | `apps/site-publico/package.json` was `^10.5.0`; used by `google-calendar-service.ts` / `google-calendar-sync.ts` via `OAuth2Client` | Bump to `^10.6.0` |
| `docker/login-action` / `metadata-action` | Root `.github/workflows/cd-*.yml` **already** `@v4` / `@v6` | No change |
| Same actions in apps | `apps/site-publico/.github/workflows/ci-cd.yml` and `apps/turismo/.github/workflows/ci-cd-pipeline.yml` still `@v3` / `@v5` | Bump to `@v4` / `@v6` |
| Changelog 10.6.0 | Internal gtoken; no public API break noted for OAuth2Client usage | Safe |

## Files changed (working tree only — not committed)

- `apps/site-publico/package.json` — `google-auth-library`: `^10.5.0` → `^10.6.0`
- `package-lock.json` — resolved `google-auth-library@10.9.1` (satisfies `^10.6.0`)
- `apps/site-publico/.github/workflows/ci-cd.yml` — login `@v4`, metadata `@v6`
- `apps/turismo/.github/workflows/ci-cd-pipeline.yml` — login `@v4`, metadata `@v6`

## Baseline type-check (Orchestrator gate)

| Ambiente | Comando | Exit | Erros TS |
|----------|---------|------|----------|
| Worktree `origin/main` @ `8c9efe9d` + `npm ci --ignore-scripts` (sem `.next`) | `npm run type-check --workspace=apps/site-publico` | **0** | **0** |
| Branch `chore/fase1-safe-bumps` **com** `.next` (pós-build) | mesmo comando | **≠0** | **36** (inclui `.next/types/*` + fontes) |
| Branch `chore/fase1-safe-bumps` **sem** `.next` (rename temporário do artefato) | mesmo comando | **0** | **0** |

**Classificação:** falha observada na FASE 1 **não** é regressão dos bumps. É artefato de typecheck com `.next/types` gerado pelo `next build`. Em condições equivalentes ao baseline (sem `.next`), FASE 1 **passa**.

**Status permanece:** `VALIDATION_REQUESTED` — decisão de commit/push fica com o Orquestrador.

## Next step

**STOP.** Aguardar decisão do Orquestrador (VALIDATED vs outro). Não FASE 2. Não commit/push sem autorização.
