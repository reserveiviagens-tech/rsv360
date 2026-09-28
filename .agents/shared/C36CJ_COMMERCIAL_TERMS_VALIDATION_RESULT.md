# C36-CJ — Commercial Terms Validation Result

**Date:** 2026-09-28 (America/Sao_Paulo)  
**Predecessor:** C36-CI PASS / 0061_APPLIED_STAGING  

## Status

```text
C36-CJ = PASS / TERMS_INVARIANTS_VALIDATED
UNIT = 20 util tests (PR #405 → a1917353)
STAGING_PROBE = SUCCESS run 36389304167
RESIDUAL = 0
EARNING = NOT_CREATED
```

## Staging evidence (run 36389304167)

- `rate_bps invalid rejected OK` (CHECK)
- `second active rejected OK` (unique partial)
- `C36-CJ VALIDATE = SUCCESS residual=0`

Fixes during gate: empreendimento seed (#406), trim docker/psql ids (#407).

## Next

```text
C36-CK = PASS (merged #406) → C36-CL earning writer
```
