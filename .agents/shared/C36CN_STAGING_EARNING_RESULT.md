# C36-CN — Controlled Staging Earning Result

**Status:** `PASS / STAGING_EARNING_VALIDATED`  
**Run:** https://github.com/reserveiviagens-tech/rsv360/actions/runs/36413700193  
**SHA tip:** `ec63f779`  
**Date:** 2026-09-28

## Probe output

```text
C36CN_PROBE_OK {
  "A1":"created",
  "B":"idempotent",
  "C":"skipped:ATTR_NO_OWNER",
  "D":"fail_closed:ATTR_AMBIGUOUS_OWNERS",
  "E":"skipped:NO_EFFECTIVE_TERMS",
  "snapshotRateBps":"1500"
}
C36-CN VALIDATE = SUCCESS residual=0
```

## Scenarios

| Case | Expected | Result |
|------|----------|--------|
| 1 PEA + terms | CREATE | created |
| Retry same payment | IDEMPOTENT | idempotent |
| Agency only | SKIP ATTR_NO_OWNER | skipped |
| 2 commercial_owners | FAIL-CLOSED | fail_closed |
| Owner without terms | SKIP NO_EFFECTIVE_TERMS | skipped |
| Cleanup c36cn_* | residual=0 | PASS |

## Workflow fixes during gate

- #411 seed user when users empty
- #412 bash quoting
- #413 YAML heredoc broke workflow_dispatch
- #414 linearize SSH script (no nested functions)
