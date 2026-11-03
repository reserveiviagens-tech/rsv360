# C36DB — E2E Execution Report

**Status:** PASS  
**Run:** https://github.com/reserveiviagens-tech/rsv360/actions/runs/36460958563  
**NS:** `c36db_1790617836`  
**HEAD:** `95cccf10` (#420)  
**Migrations:** 62  

## Probe literals

```text
C36DB_BEFORE_REFUND {"earnCount":1,"creditCount":1,"debitCount":0,"earning":{"status":"pending","amountCents":15000,"rateBps":1500}}
C36DB_AFTER_REFUND  {"earnCount":1,"creditCount":1,"debitCount":1,"earning":{"status":"reversed","amountCents":15000,"rateBps":1500},"paymentStatus":"refunded"}
C36DB_RETRY_RESULT  {"earnCount":1,"creditCount":1,"debitCount":1}
C36DB_PROBE_OK {
  "earnA1":"created",
  "refundA1":"reversed",
  "refundA2":"idempotent",
  "retryStable":true,
  "atomicThrew":true,
  "earnFStatusAfterFail":"pending",
  "debitFAfterFail":0,
  "refundFFinal":"reversed"
}
C36-DB VALIDATE = SUCCESS residual=0
```

## Gateway / payout

```text
GATEWAY_REAL = NOT CALLED (orchestrator local path)
PAYOUT = NOT CALLED
PRODUCTION = UNTOUCHED
```
