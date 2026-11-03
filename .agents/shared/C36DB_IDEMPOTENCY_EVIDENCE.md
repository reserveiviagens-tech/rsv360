# C36DB — Idempotency Evidence

| Case | Call | Result | Counts after |
|------|------|--------|--------------|
| A1 | first `applyEarningReversalOnPaymentRefund` | `reversed` | earn/credit/debit = 1/1/1 |
| A2 | retry same payment | `idempotent` | 1/1/1 stable |
| F final after atomic probe | reverse | `reversed` | debit created once |

Key: `booking_payment_debit:{paymentId}` (D-CR1 unchanged).

```text
IDEMPOTENCY = PASS
```
