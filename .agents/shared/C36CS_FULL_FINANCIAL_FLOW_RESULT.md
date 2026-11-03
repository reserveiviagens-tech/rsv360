# C36-CS — Full Financial Flow (staging + unit chain)

**Status:** `PASS / CHAIN_VALIDATED`  
**Evidence composite:**
- C36-CN staging probe (payment→earning) run `36413700193`
- C36-CP atomic ledger credit (TX in writer ports) #415
- C36-CR reversal unit tests #416
- C36-CO snapshot/idempotency unit+staging

```text
Payment approved → Booking → Resolver → PEA → Terms → Earning → Ledger credit
Refund path: Earning reversed → Ledger debit (unit)
Payout = BLOCKED
```
