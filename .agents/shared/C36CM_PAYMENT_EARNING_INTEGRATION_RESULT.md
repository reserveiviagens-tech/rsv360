# C36-CM — Payment → Earning Integration

**Status:** IN_PROGRESS (pre-CI)  
**Branch:** `feat/c36cm-payment-earning-hook`  
**Predecessor:** C36-CL PASS / `a4751294` (#408)

## Deliverables

| Item | Path |
|------|------|
| Orchestrator | `server/modules/partners/services/partner-earning-on-payment.service.ts` |
| Confirm service | `backend/server/modules/payments/services/payment-confirmation.service.ts` |
| Webhook hook | `webhook.service.ts` → confirm when payload `status=approved` |
| Tests | `partner-earning-on-payment.test.ts` |

## Rules enforced

- Authorizing event = payment **approved** (not booking create)
- `source_type=booking_payment`, `source_id=payment.id`
- Idempotent retry
- Earning errors do not roll back payment confirmation
- Ledger / payout still **BLOCKED**

## Local tests

```text
14 passed (CM + CL writer suites)
```
