# FASE 5 Inc1 — CI Gate Report (PR #389)

**Status:** `INC1_CI_PASS` (humano) → staging preflight COMPLETE; migrate **NOT** authorized  

See: `FASE5_INC1_CI_PASS.md` · `FASE5_INC1_STAGING_PREFLIGHT.md`  

**Date:** 2026-09-22  
**PR:** https://github.com/reserveiviagens-tech/rsv360/pull/389  
**Tip:** `1edc2bfb` (CodeQL fix `21f13260` + docs)  
**Staging:** **NOT AUTHORIZED**  
**Production:** **BLOCKED**  
**Inc 2:** NOT STARTED  

---

## Resultados efetivos (pós-fix — todos COMPLETED)

| Check | Result |
|-------|--------|
| **CodeQL** | **PASS** |
| **Playwright E2E — propostas** | **PASS** |
| **route-smoke** | **PASS** |
| monorepo-build | PASS |
| backend-tests (×2) | PASS |
| backend-typecheck | PASS |
| frontend-typecheck | PASS |
| turismo-eslint-gate | PASS |
| migrate:db-json (dry-run) | PASS |
| Analyze (javascript-typescript) | PASS |
| Docker prod build | PASS |
| Jest — módulos + WebSocket | PASS |
| infra-smoke | PASS |
| gitleaks / dependency-review / NPM Audit / Trivy | PASS |
| Validar vars produção | PASS |

**PENDING:** nenhum  
**FAIL:** nenhum  

---

## Repo identity (reminder)

PR/CI em `reserveiviagens-tech/rsv360`. Staging migrate só após `INC1_STAGING_MIGRATION_AUTHORIZED` + confirmação de que staging aponta para este repo/pipeline.

---

## Gates seguintes (humano)

1. Revisão humana do gate CI → emitir `INC1_CI_PASS` se OK  
2. Separado: `INC1_STAGING_MIGRATION_AUTHORIZED`  
3. Produção / Inc 2: bloqueados  

**PARAR** — sem staging, sem Inc2, sem alterações adicionais.
