# C36-CL — Earning Writer Result (final)

**Status:** `PASS / EARNING_WRITER_IMPLEMENTED`  
**PR:** https://github.com/reserveiviagens-tech/rsv360/pull/408  
**Merged:** `a4751294` @ 2026-09-28T07:49:52Z  
**CI:** all required checks GREEN (incl. route-smoke 33m, monorepo-build, backend-tests, typecheck, CodeQL, gitleaks)

## Scope delivered
- `PartnerEarningWriterService` + Drizzle ports + factory
- Idempotent `booking_payment` / `payment.id`
- Multi-PEA fail-closed; snapshot metadata
- Unit tests (memory ports)

## Explicitly deferred
- Payment event wiring → **C36-CM**
- Ledger → **C36-CP**
- Staging live → **C36-CN**
- Payout → **BLOCKED**
