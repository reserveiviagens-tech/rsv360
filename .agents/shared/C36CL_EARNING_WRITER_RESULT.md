# C36-CL — Earning Writer Implementation Result

**Gate:** C36-CL  
**Status:** PASS (pending CI green on PR)  
**Branch:** `feat/c36cl-earning-writer`  
**Date:** 2026-09-28

## Deliverables

| Item | Path |
|------|------|
| Writer service | `server/modules/partners/services/partner-earning-writer.service.ts` |
| Ports (Drizzle) | `server/modules/partners/services/partner-earning-writer.ports.ts` |
| Types / snapshot | `server/modules/partners/services/partner-earning-writer.types.ts` |
| Factory | `server/modules/partners/services/partner-earning-writer.ts` |
| PEA filter helpers | `partner-commercial-terms.util.ts` (`isPeaEffectiveAt`, `filterCommercialOwnersAt`) |
| Unit tests | `backend/src/__tests__/unit/partner-earning-writer.test.ts` |

## Behavior

```text
Payment confirmed (status=approved)
  → Inventory resolve (no derivePartners; PEA loaded separately)
  → commercial_owner PEAs effective @ T_pay
  → 0 = SKIP / 1 = EARNING / >1 = FAIL-CLOSED
  → Commercial terms effective @ T_pay
  → amount_cents = floor(base * rate_bps / 10000)
  → INSERT partner_earnings (source_type=booking_payment, source_id=payment.id)
  → metadata snapshot (rate, terms, booking, payment, T_pay, inventory)
```

Idempotency: unique `(source_type, source_id)` + race recovery on `23505`.

## Explicitly NOT in this gate

- Payment webhook / event wiring → **C36-CM**
- Ledger credit → **C36-CP**
- Staging live earning → **C36-CN**
- Payout → **BLOCKED**

## Local validation

```text
jest partner-earning-writer.test.ts + partner-commercial-terms.util.test.ts
→ 29 passed
```

## Barriers

```text
LEDGER / PAYOUT / PRODUCTION / LIVE EARNINGS = BLOCKED until later gates
0059 = IMMUTABLE
```
