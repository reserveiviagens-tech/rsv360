# C36DB — Pre-Execution Reconciliation

**Gate:** C36-DB Controlled Staging Refund E2E  
**GO:** explicit owner token `GO → C36-DB`  
**Date:** 2026-09-28 (America/Sao_Paulo)  
**Mode:** read-only reconciliation before any code change

## Barriers (confirmed intact at start)

```text
PAYOUT_REAL = BLOCKED
PRODUCTION = BLOCKED
GATEWAY_REAL = BLOCKED
0059 = BLOCKED / IMMUTABLE
FORCE_PUSH = BLOCKED
CI_BYPASS = BLOCKED
C36-DC = NOT AUTHORIZED
```

## Git / remote

| Item | Value |
|------|-------|
| Local branch (at recon) | `docs/c36da-staging-ledger-result` @ `32941fb0` (docs PR #419) |
| `origin/main` HEAD | `8ed3a91a` — C36-DA probe (#418) |
| Working tree | unclean with **unrelated** untracked `.agents` / ops files — **not** part of C36-DB branch work |
| Financial tip on main | `def187b0` CQ/CR #416; ledger TX `c7598017` #415; DA probe `8ed3a91a` #418 |

## PRs

| PR | State | Relevance |
|----|-------|-----------|
| #418 | MERGED | C36-DA probe/workflow |
| #419 | OPEN | DA evidence docs only |
| Others open | unrelated | ignore for DB |

## C36-DA representation

| Check | Evidence |
|-------|----------|
| Code on main | `8ed3a91a` includes `c36da-ledger-reconcile-probe.ts` + WF |
| Staging run | `36450487471` SUCCESS residual=0 |
| INV-04 / INV-08 | PASS per `C36DA_STAGING_LEDGER_RECONCILE_RESULT.md` |

## Migrations (repo @ origin/main)

| idx | tag | Last SQL touch |
|-----|-----|----------------|
| 58 | `0058_payments_tables` | journal present |
| 59 | `0059_partner_domain` | `f0c94681` — **no booking_payment** |
| 60 | `0060_partner_empreendimento_associations` | `19e19c56` |
| 61 | `0061_partner_earnings_booking_payment_and_terms` | `89e19336` |

Staging tip at DA: migration rows = **62**.

## Pre-wiring scan (preview)

```text
reverseEarningForPaymentRefund
  → defined: server/modules/partners/services/partner-earning-reversal.service.ts
  → callers: partner-earning-reversal.test.ts ONLY
  → NOT wired to refund.service / payment-confirmation / webhooks
```

## Decision

```text
C36DB_PRE_EXECUTION = RECONCILED
NEXT = wiring audit + minimal hook + staging c36db_* E2E
NO_MIGRATION_PLANNED
NO_0059_EDIT
NO_PAYOUT
```
