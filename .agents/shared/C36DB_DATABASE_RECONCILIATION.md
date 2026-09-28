# C36DB — Database Reconciliation

| Moment | earn | credit | debit | earning.status | payment.status |
|--------|------|--------|-------|----------------|----------------|
| Before refund | 1 | 1 | 0 | pending | approved→(pre) |
| After refund | 1 | 1 | 1 | reversed | refunded |
| After retry | 1 | 1 | 1 | reversed | refunded |

Amount / snapshot preserved: `15000` cents, `rateBps=1500`.

Debit key: `booking_payment_debit:{paymentId}`  
Credit key: `booking_payment_credit:{paymentId}`

No orphans observed for happy path A.
