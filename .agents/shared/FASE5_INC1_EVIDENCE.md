# FASE 5 Inc1 — Evidence Pack

**Status:** `INC1_HUMAN_REVIEW_APPROVED` → commit/PR authorized; staging **NOT** authorized  
**Date:** 2026-09-22  
**Risk:** HIGH  
**INC1_AUTHORIZED:** YES  
**INC1_HUMAN_REVIEW_APPROVED:** YES (Orquestrador)  
**Spec baseline:** `6d320174`  
**Pre-flight commit:** `32312409`  
**Branch:** `feat/fase5-partners-inc1` (target)  
**Shared DB `rsv360-postgres`:** **NOT migrated**  
**Staging DB:** **NOT migrated**  
**Production:** **BLOCKED**

---

## Files (allowlist)

| File | Action |
|------|--------|
| `backend/drizzle/0059_partner_domain.sql` | CREATE |
| `backend/drizzle/meta/_journal.json` | entry idx 59 |
| `backend/drizzle/meta/0059_snapshot.json` | CREATE (stub) |
| `backend/src/db/schema/partners.ts` | CREATE |
| `backend/src/db/schema/index.ts` | export |
| `backend/src/__tests__/unit/partner-domain-migration.test.ts` | CREATE |
| `backend/scripts/validate-partner-domain-0059.mjs` | CREATE |
| `.agents/shared/*` evidence/manifest/handoff | UPDATE |

**Not touched:** API, FE, comissões, split, affiliates, marketplace, inventário, payments, `.env`, FASE 0

---

## Commands + results

```text
npm run db:validate-journal
→ PASS (60 migrations, 60 snapshots)

npm test -- --testPathPattern=partner-domain-migration
→ PASS (6/6)

node scripts/validate-partner-domain-0059.mjs
→ INC1_EPHEMERAL_PASS
  PASS stub users table
  PASS migration apply (UP)
  PASS seven Partner* tables present
  PASS partner insert + UUID (06d9cc30-a97e-4cf3-a18b-ca154966ea7d)
  PASS default status draft
  PASS membership FK users+partners
  PASS status CHECK rejects invalid
  PASS UNIQUE code enforced
  PASS legacy tables absent on ephemeral
  PASS no enterprise_id column
  PASS migration rollback (DOWN)
  PASS migration re-apply (UP again)
  PASS insert after re-apply
```

Ephemeral container destroyed after run. **No** `npm run migrate` against shared stack.

---

## Dual gate

| Review | Result |
|--------|--------|
| ANTIGRAVITY_REVIEW | **PASS** — escopo CREATE-only; DDL=pre-flight; zero ALTER legado |
| CURSOR_REVIEW | **PASS** — allowlist only; tests green; no push |

---

## Git

- **INC1_HUMAN_REVIEW_APPROVED:** YES  
- Commit/PR: authorized; staging migrate: **gate separado**  
- Suggested message: `feat(db): FASE5 Inc1 Partner domain CREATE-only (0059)`

---

## Next human gates

1. ~~Review diff + evidence~~ → APPROVED  
2. Commit + PR (esta etapa)  
3. `INC1_STAGING_MIGRATION_AUTHORIZED` — **ainda não**  
4. Inc 2 — **NOT STARTED**

**Produção:** BLOQUEADA.
