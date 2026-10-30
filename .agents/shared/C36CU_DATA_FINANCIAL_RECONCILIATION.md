# C36-CU — Data + Financial Reconciliation

**Status:** `PASS / RECONCILED_BY_DESIGN`

| Link | Rule | Evidence |
|------|------|----------|
| Payment → Earning | `source_type=booking_payment`, `source_id=payment.id` | writer + CM orchestrator |
| Amount | `floor(baseCents * rateBps / 10000)` | util + CN staging |
| Snapshot | metadata rate/terms/booking/payment/T_pay | CO tests + CN probe |
| Ledger credit | same TX as earning; key `booking_payment_credit:{paymentId}` | CP |
| Reversal debit | key `booking_payment_debit:{paymentId}`; earning status reversed | CR |
| Idempotency | unique source + unique ledger keys | CL/CM/CP/CR |

No unexplained discrepancy in validated scenarios.
