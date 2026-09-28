# C36-CJ — Commercial Terms Validation Result

**Date:** 2026-09-28 (America/Sao_Paulo)  
**Predecessor:** C36-CI PASS / 0061_APPLIED_STAGING  
**Mode:** Unit + staging constraint probe — **no earning writer**

## Status

```text
C36-CJ = PASS / TERMS_INVARIANTS_VALIDATED
UNIT = 20 util tests PASS
STAGING_PROBE = workflow VALIDATE_TERMS_C36CJ (run after merge #405)
EARNING = NOT_CREATED
```

---

## Unit coverage (util)

| Area | Cases |
|------|-------|
| Vigência `[from,to)` | unbounded, draft/superseded, from inclusive, to exclusive, expired, invalid tPay |
| rate_bps | 0, 10000, floor, out-of-range, non-int, bad base |
| Multi-PEA | 0 skip / 1 single / >1 fail-closed |

PR: https://github.com/reserveiviagens-tech/rsv360/pull/405 → merge `a1917353`

## Staging probe

Workflow: `C36 Staging Terms Validate`  
Confirm: `VALIDATE_TERMS_C36CJ`  
Namespace: `c36cj_*` with mandatory cleanup to residual 0.

Proves: rate_bps CHECK, window CHECK, one-active unique, cleanup.

## Next

```text
C36-CK = GO / COMMERCIAL TERMS SERVICE+API
```
