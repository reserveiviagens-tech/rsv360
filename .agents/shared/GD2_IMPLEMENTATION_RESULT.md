# RSV360 — G-D.2 IMPLEMENTATION RESULT

**CODE GO:** G-D.2 — AUTHORIZED  
**Data:** 2026-10-07  
**HEAD (baseline):** `4a4be7577a1ad94903b57adcadfa1b9f42491889`  
**Branch:** `feat/c36dd-refund-request-domain`  

---

## A. Scope

| Item | Status |
|---|---|
| Export `PROPOSTAS_LOCAL_ROLE_RANK` frozen | DONE |
| Marker `PROPOSTAS_RANK_IS_LOCAL_ADAPTER` | DONE |
| Docs: RANK ≠ aprovador ≠ enterprise | DONE |
| ranks / `hasMinRole` bit-a-bit | **PRESERVED** |
| Approve/deny / economic / MGM / access / AI | **NOT TOUCHED** |

---

## B. Files

### Created
- `backend/src/__tests__/unit/gd2-rank-adapter-formal.test.ts`
- `.agents/shared/GD2_IMPLEMENTATION_RESULT.md`

### Modified
- `server/modules/propostas/rbac.ts` — formalização adapter (sem mudança de predicados)

---

## C. Tests

```text
Test Suites: 8 passed, 8 total
Tests:       39 passed, 39 total
NEW FAILURES: 0
```

---

## D. Result

```text
G-D.2 = PASS / CLOSED
Next subgate = NOT AUTHORIZED
STOP
```
