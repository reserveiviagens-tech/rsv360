# C36-CO — Earning Snapshot + Idempotency Result

**Status:** `PASS / SNAPSHOT_AND_IDEMPOTENCY_PROVEN`  
**Evidence:**
- Unit: `partner-earning-snapshot-idempotency.test.ts` (merged #410)
- Staging: run 36413700193 — retry idempotent + `snapshotRateBps=1500` frozen on earning A

## Proven

```text
1 payment → 1 earning (retry → idempotent)
Terms rate change after T_pay does not rewrite historical snapshot (unit)
Concurrent unique race → single earning (unit)
```

## Barriers remain

```text
LEDGER = next (C36-CP)
PAYOUT / PRODUCTION = BLOCKED
```
