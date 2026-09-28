# C36-CP — Ledger Credit (atomic with earning)

**Status:** IN_PROGRESS (pre-CI)  
**Branch:** `feat/c36cp-ledger-credit`

## Change

`createDrizzlePartnerEarningWriterPorts().insertEarning` now runs in a DB transaction:

```text
INSERT partner_earnings
INSERT partner_ledger_entries (entry_type=credit, idempotency_key=booking_payment_credit:{paymentId})
```

If either fails → ROLLBACK (no partial state).

## Tests

`partner-earning-ledger-atomic.test.ts` — credit match + failure leaves zero earnings.

## Deferred

- C36-CQ functional staging ledger validation
- C36-CR refund/reversal
- Payout = BLOCKED
