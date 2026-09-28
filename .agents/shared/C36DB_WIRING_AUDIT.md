# C36DB — Wiring Audit

**Gate:** C36-DB  
**Date:** 2026-09-28

## Symbol

```text
reverseEarningForPaymentRefund(paymentId)
```

**Defined in:** `server/modules/partners/services/partner-earning-reversal.service.ts`

## Callers (pre-DB)

| Location | Type |
|----------|------|
| `backend/src/__tests__/unit/partner-earning-reversal.test.ts` | unit only |

**No** controller, webhook, job, or `RefundService` call.

## Adjacent refund paths

| Path | Gateway? | Earning reversal? |
|------|----------|-------------------|
| `RefundService.createRefund` | YES (`getPaymentProvider().createRefund`) | NO (pre-DB) |
| `RefundService.processRefund` | status approve only | NO |
| `payment-confirmation.service` | N/A (confirm only) | earning create only |

## Gap (INV-05)

```text
Service exists + unit idempotency proven
Runtime wiring to payment refund lifecycle = MISSING
```

## Planned minimal wiring (C36-DB)

1. New orchestrator `applyEarningReversalOnPaymentRefund(paymentId)` — local payment→`refunded` (no gateway) + `reverseEarningForPaymentRefund`.
2. Hook after payment status update inside `RefundService.createRefund` (when that path runs; still gateway-gated — staging E2E uses orchestrator directly).
3. Staging probe `c36db_*` calls orchestrator only (GATEWAY_REAL blocked).

## Transaction boundary

```text
reverseAtomic: db.transaction { UPDATE earning reversed; INSERT debit key booking_payment_debit:{paymentId} }
```

## Writers after wiring (expected)

```text
INSERT earning / credit  → partner-earning-writer.ports (unchanged)
UPDATE reversed + INSERT debit → partner-earning-reversal.service (unchanged core)
Orchestrator            → status payment + call reverse (no second writer)
```
