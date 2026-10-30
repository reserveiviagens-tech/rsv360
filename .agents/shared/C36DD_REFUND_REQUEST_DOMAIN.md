# C36-DD — Refund Request Domain

## 1. Gate Metadata

| Field | Value |
|-------|-------|
| Gate | C36-DD |
| Name | Refund Request Domain |
| Date | 2026-09-28 |

## 2. Authorization Token

```text
GO → C36-DD
```

## 3. Executor

Cursor Agent — Agent Mode

## 4. Orchestrator

Antigravity

## 5. Base Commit

`95cccf10` (C36-DB on main)

## 6. Repository Reconciliation

| Item | Value |
|------|-------|
| Start branch | feat/c36dd-refund-request-domain from main |
| C36-DC PR #422 | OPEN (docs); findings consumed |
| Unrelated untracked | preserved |

## 7. Existing Architecture

```text
ADMIN|MANAGER → RefundService.createRefund → gateway + earning reverse (C36-DB)
```

## 8. C36-DC Findings Consumed

- No RefundRequest domain → **addressed**
- Role-only auth retained on new routes (granular = DE + POLICY_REQUIRED)
- site-publico unauth path **unchanged** (documented; not expanded)
- createRefund idempotency **not** altered (execution idempotency ≠ request idempotency)

## 9. RefundRequest Domain

Table `refund_requests` + service `createRefundRequest` / `getRefundRequestById`.

## 10. Domain Fields

id, payment_id, booking_id, amount, currency, reason, requested_by, status, request_version, idempotency_key, metadata (snapshot), timestamps.

## 11. Domain States

Writable in v1: `draft` | `pending`.  
CHECK also reserves future statuses for DK without implementing transitions.

## 12. API Contract

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/v1/payments/refund-requests` | JWT + admin\|manager |
| GET | `/api/v1/payments/refund-requests/:id` | same |

No approve / reject / execute endpoints.

## 13. Request/Execution Separation

**PASS** — service/routes do not import execution writers; tests assert separation.

## 14. Idempotency

- Unique open request per payment (`draft|pending`)
- Optional `idempotency_key` unique

## 15. Security

- Binding: payment must exist; bookingId must match payment.bookingId when both set
- Coarse RBAC unchanged (admin\|manager) — **POLICY_REQUIRED** for finer roles
- Does not worsen site-publico finding

## 16. Tenant Scope

**POLICY_REQUIRED** — JWT enterpriseId not enforced on request create yet (same gap class as DC).

## 17. IDOR Considerations

Staff can still target any paymentId they know — **FINDING unchanged** (mitigation = future DI + scope policy). Binding prevents mismatched bookingId.

## 18. Financial Invariants

On request create: payment / earning / ledger **unchanged**; gateway **not called**.

## 19. Tests

- `refund-request.domain.test.ts`
- `refund-request-migration.test.ts`
- `refund-request-separation.test.ts`
- Regression: partner-earning-on-refund + reversal PASS

## 20. Staging Evidence

`NOT_REQUIRED` for live probe in this gate — migration **published** (0062) but **not applied** to staging/production here (controlled APPLY = future ops GO). Domain proven via unit tests.

## 21. Migration Analysis

| File | Action |
|------|--------|
| `0062_refund_requests.sql` | NEW additive |
| 0059 / 0060 / 0061 | UNCHANGED |

## 22. Files Changed

- drizzle 0062 + journal
- schema payments (+ duplicate module schema)
- refund-request.service.ts
- refund-request.routes.ts
- payments routes index mount
- unit tests + this artifact

## 23–25. Commit / PR / CI

Filled at close.

## 26. Known Gaps

- No human approval (DF)
- No permission matrix (DE)
- No SoD/limits (DG/DH)
- site-publico dual stack (security follow-up)
- 0062 not applied to staging yet

## 27. POLICY_REQUIRED

roles request/approve/execute; thresholds; SoD; tenant scope; site-publico destiny; when to APPLY 0062.

## 28. HARD_BLOCKS

NONE

## 29. Final Gate Result

```text
C36-DD = PASS (pending CI)
PASS ≠ GO for C36-DE
```
