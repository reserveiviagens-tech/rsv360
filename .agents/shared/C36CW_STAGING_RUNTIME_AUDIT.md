# C36-CW — Staging Final Runtime Audit (read-only)

**Status:** `PASS / STAGING_HEALTHY_AT_LAST_PROBE`

| Item | Evidence |
|------|----------|
| Migration tip | 0061 applied (C36-CI run 36382807020); journal rows=62 at CN probe |
| CN probe health | backend `npx tsx` probe executed inside staging container |
| Residual test data | `c36cn_* residual=0` after CN |
| CD | develop FF to `def187b0` after CQ/CR |

Production environment never used.
