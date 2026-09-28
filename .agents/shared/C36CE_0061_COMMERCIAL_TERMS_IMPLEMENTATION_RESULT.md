# C36-CE â€” 0061 + Commercial Terms Implementation Result

**Date:** 2026-09-28 (America/Sao_Paulo)  
**Predecessors:** C36-CC PASS / POLICY_ADR_ACCEPTED Â· C36-CD PASS / TERMS_AND_CHECK_DESIGNED  
**Spec base:** `.agents/shared/C36CD_TERMS_AND_ADDITIVE_CHECK_DESIGN.md`  
**Mode:** Data foundation only â€” **no apply** Â· **no earning writer** Â· **no ledger** Â· **0059 immutable**

## Status

```text
C36-CE = PASS / 0061_COMMERCIAL_TERMS_IMPLEMENTED
0061_APPLY        = BLOCKED
EARNING_WRITER    = BLOCKED
LIVE_EARNINGS     = BLOCKED
LIVE_LEDGER       = BLOCKED
PAYOUT            = BLOCKED
0059_IMMUTABLE    = YES
NEXT              = Owner GO â†’ push/PR (CI) Â· apply staging only with explicit APPLY gate
```

---

## Baseline

| Field | Value |
|-------|--------|
| **base SHA** | `f8b29835` (`origin/main` @ PR #400 BookingInventoryResolver) |
| **branch** | `feat/c36ce-0061-commercial-terms` |
| **tip SHA** | `89e19336` |
| **commit** | `feat(partners): add 0061 commercial terms foundation (C36-CE)` |
| **journal tip (prÃ©)** | `0060_partner_empreendimento_associations` |
| **journal tip (pÃ³s)** | `0061_partner_earnings_booking_payment_and_terms` (idx 61, when `1788570000000`) |

---

## Arquivos

| Path | Role |
|------|------|
| `backend/drizzle/0061_partner_earnings_booking_payment_and_terms.sql` | CREATE terms + ALTER CHECK/metadata |
| `backend/drizzle/meta/_journal.json` | idx 61 entry |
| `backend/drizzle/meta/0061_snapshot.json` | Drizzle snapshot stub |
| `backend/src/db/schema/partners.ts` | `partnerCommercialTerms` + `partner_earnings.metadata` |
| `server/modules/partners/services/partner-commercial-terms.util.ts` | Pure helpers (window / cents / attribution) â€” **no DB writes** |
| `backend/src/__tests__/unit/partner-commercial-terms-migration.test.ts` | SQL/journal integrity |
| `backend/src/__tests__/unit/partner-commercial-terms.util.test.ts` | VigÃªncia + math + multi-PEA |

**NÃ£o tocados:** `0059_partner_domain.sql`, earning/ledger writers, booking routes, affiliates, marketplace, payout.

---

## Migration 0061 (additive)

### CREATE `partner_commercial_terms`

- FK `pea_id` â†’ `partner_empreendimento_associations(id)` **ON DELETE RESTRICT**
- v1: `rate_kind='percent_bps'`, `basis='booking_total'`, `fixed_amount_cents IS NULL`
- `rate_bps` âˆˆ `[0, 10000]`
- VigÃªncia half-open: `effective_to > effective_from` quando ambos setados
- Status: `draft | active | superseded`
- Unique parcial: **mÃ¡x. 1 `active` por `pea_id`**
- Indexes: `(pea_id, status)`, `(pea_id, effective_from, effective_to)`

### ALTER `partner_earnings` (aditivo)

- CHECK `source_type` expandido com **`booking_payment`** (mantÃ©m 5 valores legados)
- Coluna **`metadata jsonb`** (snapshot mÃ­nimo no writer futuro)

### Rollback (formal only)

Documentado no SQL header â€” ephemeral/staging ou PR revert; nunca ad-hoc em prod.

---

## Util (foundation helpers â€” writer blocked)

```ts
isCommercialTermsEffectiveAt(terms, tPay)   // [from, to) + status=active
computeEarningCents(baseCents, rateBps)     // floor(base * bps / 10000)
resolveExclusiveCommercialOwner(candidates) // 0 skip Â· 1 ok Â· >1 fail-closed
```

Sem INSERT em `partner_earnings` / `partner_ledger_*`.

---

## Validation

```text
node scripts/validate-drizzle-journal.mjs
â†’ âœ… Drizzle journal consistent: 62 migrations, 62 snapshots
EXIT=0

npx jest --runInBand \
  src/__tests__/unit/partner-commercial-terms-migration.test.ts \
  src/__tests__/unit/partner-commercial-terms.util.test.ts
â†’ 2 suites, 20 tests PASSED
EXIT=0

npx tsc --noEmit
â†’ EXIT=0
```

### Cobertura CE

| Caso | EvidÃªncia |
|------|-----------|
| CREATE terms + FK PEA RESTRICT | migration test |
| rate_bps / window / v1 percent-only | migration test |
| unique one active per PEA | migration test |
| CHECK + `booking_payment` aditivo | migration test |
| metadata jsonb | migration test |
| 0059 sem `booking_payment` | migration test (imutable) |
| journal idx 61 | migration test |
| vigÃªncia `[from,to)` | util test |
| floor cents | util test |
| multi-PEA fail-closed | util test |

---

## Bloqueios mantidos

| Gate | Estado |
|------|--------|
| 0061 APPLY (staging/prod) | **BLOCKED** â€” exige GO explÃ­cito |
| Partner Earning writer | **BLOCKED** |
| Live ledger / payout | **BLOCKED** |
| Edit 0059 | **IMMUTABLE** |

---

## Official chain

```text
C36-CC  PASS / POLICY_ADR_ACCEPTED
C36-CD  PASS / TERMS_AND_CHECK_DESIGNED
C36-CE  PASS / 0061_COMMERCIAL_TERMS_IMPLEMENTED
```

---

## Next recommended step

1. Owner GO â†’ push branch + PR (CI slice gate).
2. Review humano do SQL 0061 + schema.
3. SÃ³ apÃ³s merge + **APPLY gate explÃ­cito** â†’ migrate staging.
4. Writer / live earnings permanece bloqueado atÃ© fundaÃ§Ã£o aplicada e gate de writer aberto.
