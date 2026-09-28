# C36-CI — Controlled 0061 APPLY (Staging)

**Date:** 2026-09-28 (America/Sao_Paulo)  
**Predecessors:** C36-CG MERGED · C36-CH CHAIN_RECONCILED  
**Mode:** Staging DB migrate only — **no earning writer · no payout · no production**

## Status

```text
C36-CI = PASS / 0061_APPLIED_STAGING
ENVIRONMENT = staging (GitHub Environment + SSH)
RUN = https://github.com/reserveiviagens-tech/rsv360/actions/runs/36382807020
CONFIRM = APPLY_0061_STAGING
PRODUCTION = NOT_TOUCHED
EARNING_WRITER = STILL_BLOCKED
```

---

## Preflight

| Check | Result |
|-------|--------|
| CD Staging @ `092de2ee` | **success** (run 36380492763) |
| HAS_PEA | **1** |
| HAS_TERMS (before) | **0** |
| Tip hashes (before) | id 99 `when=1788569000000` (=0060 window) |

## Backup

`backups/postgres_staging/staging_pre_0061_20260928_023854.sql.gz` (~40K) — non-empty.

## Apply

```text
[migrate] applying Drizzle migrations from /workspace/backend/drizzle
[migrate] migrations applied successfully
```

## Post-check

| Check | Result |
|-------|--------|
| `partner_commercial_terms` | **present** |
| indexes | pea_status, pea_window, **one_active_per_pea**, pkey |
| `partner_earnings.metadata` | **present** |
| `source_type` CHECK | includes **`booking_payment`** (+ 5 legacy) |
| `/health` | **OK** |
| Marker | `C36-CI APPLY_0061 = SUCCESS` |

## Corrections during gate

| Error | Cause | Fix | PR |
|-------|-------|-----|-----|
| job.environment empty | GHA context | remove brittle check | #403 |
| `$'\r' command not found` | staging `.env` CRLF | `sed 's/\r$//'` before source | #404 |

## Barriers still closed

```text
EARNING WRITER / LIVE EARNINGS / LIVE LEDGER / PAYOUT / PRODUCTION = BLOCKED
0059 = IMMUTABLE
```

## Next

```text
C36-CJ = GO / COMMERCIAL TERMS VALIDATION
```
