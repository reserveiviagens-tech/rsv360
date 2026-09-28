# C36-DA — Staging Ledger Reconciliation

**Status:** `PASS / STAGING_LEDGER_RECONCILED`  
**Date:** 2026-09-28  
**PR:** https://github.com/reserveiviagens-tech/rsv360/pull/418 → merge `8ed3a91a`  
**Run:** https://github.com/reserveiviagens-tech/rsv360/actions/runs/36450487471  
**Namespace:** `c36da_1790612542`  
**Migration rows:** 62  

## Probe output (literal)

```text
C36DA_PROBE_OK {
  "ns":"c36da_1790612542",
  "beforeEarnA":0,
  "beforeCredA":0,
  "A1":"created",
  "earningAmount":15000,
  "creditAmount":15000,
  "amountMatch":true,
  "creditLinked":true,
  "entryType":"credit",
  "A2":"idempotent",
  "earnCountAfterRetry":1,
  "credCountAfterRetry":1,
  "poisonCredit":true,
  "atomicThrew":true,
  "earnFAfterFail":0,
  "credFAfterFail":1,
  "orphanCreditsA":0
}
C36-DA VALIDATE = SUCCESS residual=0
```

## Assertions proven on staging

| Assert | Result |
|--------|--------|
| earning.amount == ledger.credit | 15000 == 15000 |
| credit belongs to payment (key + earning_id) | `creditLinked=true`, entryType=credit |
| retry → no 2nd earning | earnCountAfterRetry=1 |
| retry → no 2nd credit | credCountAfterRetry=1 |
| TX fails atomically (poison credit unique) | atomicThrew=true, earnFAfterFail=0 |
| no orphan credit for happy path | orphanCreditsA=0 |
| before/after reconcile + cleanup | before 0/0; residual=0 |

## Barriers (unchanged)

```text
C36-DB            = NOT STARTED (needs separate GO)
C36-DC            = BLOCKED
PAYOUT REAL       = BLOCKED
PRODUCTION        = BLOCKED
GATEWAY REAL      = BLOCKED
```

## INV update

| ID | Was | Now |
|----|-----|-----|
| INV-04 Earning→Ledger atômico | ⚠️ | ✅ PROVADO (staging) |
| INV-08 staging limpo | ⚠️ pós-CP | ✅ residual=0 (c36da_*) |

## Next (human GO required)

```text
C36-DB — CONTROLLED STAGING REFUND E2E
```
