# RSV360 — G-D.9 IMPLEMENTATION RESULT

**CODE GO:** G-D.9 — AUTHORIZED  
**Data:** 2026-10-07  
**HEAD (baseline):** `4a4be7577a1ad94903b57adcadfa1b9f42491889`  
**Branch:** `feat/c36dd-refund-request-domain`  

---

## A. Scope

| Item | Status |
|---|---|
| Boundary contract cotacao-publica × propostas | DONE |
| C1 accept público vs staff `:id` | DOCUMENTED + TESTED |
| C3/C4 service deps without staffAuth on public | DOCUMENTED + TESTED |
| C5 no reopen economic/MGM staff/RANK/AI | VERIFIED |
| C6 dual indicação (público ≠ G-D.10) | DOCUMENTED |
| Merge de módulos | **NOT DONE** |
| Migration / WS / staffAuth change | **NOT EXECUTED** |

---

## B. Files

### Created
- `.agents/shared/GD9_BOUNDARY_CONTRACT.md`
- `backend/src/__tests__/unit/gd9-cotacao-propostas-boundary.test.ts`
- `.agents/shared/GD9_IMPLEMENTATION_RESULT.md`

### Modified (comments only)
- `server/modules/propostas/routes/index.ts` — G-D.9 C1 marker
- `server/modules/cotacao-publica/routes/index.ts` — G-D.9 C1/C6 markers

---

## C. Tests

```text
Test Suites: 9 passed, 9 total
Tests:       47 passed, 47 total
NEW FAILURES: 0
```

Family: gd9 + cotacao-publica-indicacao + gd0–gd3 + gd6 + gd8 + gd10.

---

## D. Residual (documentado, não implementado)

Hardening do path público  
`POST /cotacao-publica/proposta/:token/indicacao`  
para eliminar body-as-ref → **gate/OD futuro** (fora de G-D.9).

---

## E. Result

```text
G-D.9 = PASS / CLOSED

G-D sequência principal (ordem #1–#9):
  D.0–D.6, D.8, D.10 = PASS/CLOSED
  D.7 = N/A/CLOSED
  D.9 = PASS/CLOSED

Next subgate (dentro de G-D principal) = NONE
G-D.4 DEFER · WS gate separado · commit policy SEPARADA
STOP
```
