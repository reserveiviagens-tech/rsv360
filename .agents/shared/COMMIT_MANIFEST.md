# COMMIT_MANIFEST — FASE 5 Inc 1 Partner Domain

**Risk:** HIGH  
**Gate:** INC1_HUMAN_REVIEW_APPROVED  
**Spec baseline:** `6d320174`  
**Pre-flight:** `32312409`

## Allowlist (commit)

- `backend/drizzle/0059_partner_domain.sql`
- `backend/drizzle/meta/_journal.json`
- `backend/drizzle/meta/0059_snapshot.json`
- `backend/src/db/schema/partners.ts`
- `backend/src/db/schema/index.ts`
- `backend/src/__tests__/unit/partner-domain-migration.test.ts`
- `backend/scripts/validate-partner-domain-0059.mjs`
- `.agents/shared/FASE5_INC1_EVIDENCE.md`
- `.agents/shared/FASE5_INC1_PREFLIGHT.md`
- `.agents/shared/FASE5_INC1_HUMAN_REVIEW.md`
- `.agents/shared/CURRENT_TASK.md`
- `.agents/shared/HANDOFF.md`
- `.agents/shared/EXECUTION_LOG.md`
- `.agents/shared/COMMIT_MANIFEST.md`

## Forbidden in this commit

Staging/prod migrate, Inc 2, API, FE, legado, `.env`, untracked protegidos

## Dual + Human

| Gate | Result |
|------|--------|
| ANTIGRAVITY_REVIEW | PASS |
| CURSOR_REVIEW | PASS |
| INC1_HUMAN_REVIEW_APPROVED | YES |

Message: `feat(db): FASE5 Inc1 Partner domain CREATE-only (0059)`
