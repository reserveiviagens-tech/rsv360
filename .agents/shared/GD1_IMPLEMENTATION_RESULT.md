# RSV360 — G-D.1 IMPLEMENTATION RESULT

**CODE GO:** G-D.1 — AUTHORIZED  
**Data:** 2026-10-06  
**HEAD (baseline):** `4a4be7577a1ad94903b57adcadfa1b9f42491889`  
**Branch:** `feat/c36dd-refund-request-domain`  
**Predecessor:** G-D.0 = PASS / CLOSED  

---

## A. Scope executed

| Item | Status |
|---|---|
| `agentAuth = staffAuth` (OD-GD-03 alias) | DONE |
| Approve/deny → `isPropostasAprovador` admin-only (OD-GD-04) | DONE |
| Matriz HTTP documentada no router | DONE |
| `staffAuth` export global | **UNTOUCHED** |
| Partner / enterprise authority / WS / AI | **NOT TOUCHED** |
| G-D.2+ | **NOT AUTHORIZED / NOT EXECUTED** |
| Contratos G-D.0 | **PRESERVED** (suite green) |

---

## B. Files

### Created
- `backend/src/__tests__/unit/gd1-matriz-http-contract.test.ts`
- `.agents/shared/GD1_IMPLEMENTATION_RESULT.md`

### Modified (AUTHORIZED)
- `server/modules/propostas/routes/index.ts` — alias agentAuth; wiring aprovar/negar
- `server/modules/propostas/rbac.ts` — `isPropostasAprovador` (OD-GD-04)
- `backend/src/__tests__/unit/gd0-foundation-contract.test.ts` — assert alias `agentAuth = staffAuth`

### Prohibited untouched
- `server/middleware/auth.middleware.ts`
- membership / agentes / WS / migrations / payments

---

## C. Semantic notes

- Allowlist explícita `admin` substitui `hasMinRole(..., 'supervisor')`.
- Equivalência sob staffAuth ∈ {admin, manager, user}: bit-a-bit efetivo preservado (só admin aprovava).
- `supervisor` **não** promovido (OD-GD-04).
- RANK adapter permanece local (OD-GD-01); não é gate de approve/deny.

---

## D. Tests

```text
npx jest --runInBand --testPathPattern='gd0-foundation-contract|gd1-matriz-http-contract|rbac-aprovacao|proposta-pr03b' --no-coverage

Test Suites: 4 passed, 4 total
Tests:       26 passed, 26 total
NEW FAILURES: 0
```

| Suite | Role |
|---|---|
| `gd1-matriz-http-contract` | dedicated G-D.1 |
| `gd0-foundation-contract` | regressão G-D.0 |
| `rbac-aprovacao` | family |
| `proposta-pr03b-idor` | family access/IDOR |

---

## E. Boundaries

```text
Migration / DB durable write = NOT EXECUTED
Commit / Push                = NOT EXECUTED
Staging / Production         = NOT EXECUTED
G-D.2+ CODE                  = NOT AUTHORIZED
```

---

## F. Result

```text
G-D.1 = PASS / CLOSED
CI Slice Gate (local dedicated+family) = PASS
Next CODE = NOT AUTHORIZED (aguarda CODE GO — G-D.8)
STOP
```
