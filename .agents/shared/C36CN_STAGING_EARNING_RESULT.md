# C36-CN / C36-CO — Staging earning + snapshot

**Branch:** `feat/c36cn-staging-earning-probe`  
**Predecessor:** C36-CM PASS / `7617a030` (#409)

## C36-CN

| Item | Status |
|------|--------|
| Unit scenarios (writer/CM) | covered |
| Staging WF | `.github/workflows/c36-staging-earning-validate.yml` |
| Probe script | `backend/scripts/c36cn-earning-probe.ts` |
| Namespace | `c36cn_*` + cleanup residual=0 |

Dispatch: `VALIDATE_EARNING_C36CN` after staging CD includes CL/CM SHA.

## C36-CO

| Item | Path |
|------|------|
| Snapshot immutability + concurrency tests | `partner-earning-snapshot-idempotency.test.ts` |

## Barriers

```text
LEDGER / PAYOUT / PRODUCTION = BLOCKED
```
