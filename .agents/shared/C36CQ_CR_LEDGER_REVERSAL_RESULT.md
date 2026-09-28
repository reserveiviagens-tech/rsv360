# C36-CQ / C36-CR — Ledger validation + Refund reversal

**Branch:** `feat/c36cq-cr-ledger-reversal`

## C36-CQ
- Unit: earning amount = ledger credit (paired)
- Atomic credit already in C36-CP ports TX

## C36-CR
- `reverseEarningForPaymentRefund(paymentId)`
- Sets earning `status=reversed`
- Inserts ledger `debit` with `idempotency_key=booking_payment_debit:{paymentId}`
- Atomic TX; duplicate refund → idempotent (one debit)

## Barriers
```text
PAYOUT / PRODUCTION = BLOCKED
```
