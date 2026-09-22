# FASE 5 Inc1 — CI Gate Report (PR #389)

**Status:** `INC1_CI_FIX_COMPLETE_PENDING_REVIEW`  
**Fix commit:** `21f13260`  
**PR tip:** `21f13260`  
**Date:** 2026-09-22  

## Fix applied (authorized)

| Finding | Resolution |
|---------|------------|
| L38 log injection | `record(name, ok)` only — no DB detail logged |
| L117/L124 untrusted→query | `FIXED_PARTNER_ID` constant for INSERT + membership + UPDATE params |

Local: Jest 6/6 PASS · `INC1_EPHEMERAL_PASS`

## CI after push

Re-run **in progress** at time of this note — **PENDING ≠ PASS**.  
Do **not** emit `INC1_CI_PASS` until CodeQL + route-smoke + Playwright + críticos all PASS.

Staging: **NOT AUTHORIZED**  
Inc2: NOT STARTED  

**PARAR** — revisão humana após CI completo.  

---

## 1. Repo / deployment identity (gate)

| Item | Valor |
|------|-------|
| Local `origin` | `https://github.com/reserveiviagens-tech/rsv360.git` |
| PR repo | `reserveiviagens-tech/rsv360` |
| Base | `main` |
| Outro repo na org | `reserveiviagens-tech/RSV360-Versao-Oficial-definitivo` (private) — **não** é o destino deste PR |
| Conclusão | PR/CI corretos para `reserveiviagens-tech/rsv360`. Antes de staging: confirmar que o **ambiente de staging** aponta para este mesmo repositório/pipeline (não assumir `rsv360-versao-oficial` / Versao-Oficial-definitivo). |

---

## 2. Checks (não tratar PENDING como PASS)

### PASS (amostra crítica)

| Check | Result |
|-------|--------|
| monorepo-build | PASS |
| backend-tests (CI + Fase4) | PASS |
| backend-typecheck | PASS |
| frontend-typecheck | PASS |
| turismo-eslint-gate | PASS |
| migrate:db-json (dry-run) | PASS |
| gitleaks / dependency-review / NPM Audit | PASS |
| Analyze (javascript-typescript) CodeQL workflow | PASS |
| Docker prod build | PASS |
| infra-smoke | PASS |

### FAIL

| Check | Result | Relação Inc1 |
|-------|--------|--------------|
| **CodeQL** (GHAS new alerts) | **FAIL** | **RELATED** — 3 high em `backend/scripts/validate-partner-domain-0059.mjs` |

Evidência ([ci-investigator](5af4d168-4d30-4230-bed6-469ee9f7e52a)):
- Log injection (~L38)
- Untrusted data → `pool.query` (~L117, ~L124)

### PENDING (ainda em execução no momento do report)

| Check | Status |
|-------|--------|
| route-smoke | IN_PROGRESS |
| Playwright E2E — propostas | IN_PROGRESS |

**PENDING ≠ PASS.**

---

## 3. Diff / manifest

- Scope guard: `NO_FORBIDDEN_PRODUCT_LEAK`
- Files vs main: 20 (docs + Partner* CREATE-only + validation script)
- Sem ALTER legado / API / FE / payments

---

## 4. Classificação

```text
INC1_CI_BLOCKED
```

**Causa-raiz:** CodeQL GHAS — 3 alertas high no script de validação efêmera da Inc1 (não no SQL `0059` nem em `partners.ts`).  
**Não é:** falha do job Analyze workflow (esse passou).  
**Não aplicado:** patch automático (escopo/correção sob gate; sem force push; sem oportunismo).

### Fix mínimo sugerido (aguardar OK humano para push)

No `validate-partner-domain-0059.mjs` apenas:
- não logar `detail`/IDs crus;
- queries já parametrizadas — remover taint (constantes / asserts sem interpolar valores de DB em logs).

Sem alterar migration/schema/API.

---

## 5. Staging pre-flight — **NÃO iniciado**

Motivo: falta `INC1_CI_PASS` + falta `INC1_STAGING_MIGRATION_AUTHORIZED`.  
Cursor IDLE para migration.

---

## 6. Próximos gates

1. Humano autoriza fix CodeQL no script **ou** dispensa CodeQL com racional escrito  
2. Re-check CI → `INC1_CI_PASS` só com obrigatórios verdes e **zero PENDING**  
3. Separado: `INC1_STAGING_MIGRATION_AUTHORIZED` (+ confirmação de que staging = este repo)  
4. Produção continua BLOQUEADA  
5. Inc 2 = NOT STARTED  

**PARAR.**
