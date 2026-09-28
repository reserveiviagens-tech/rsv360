# C36-CG — Merge PR #401 Result

**Date:** 2026-09-28 (America/Sao_Paulo)  
**Predecessor:** C36-CF PASS / MERGE_READY  
**Authorization:** Autonomous protocol §10 (C36-CG MERGE)  
**Mode:** Merge + post-merge CI — **no 0061 APPLY · no deploy · no writer**

## Status

```text
C36-CG = PASS / MERGED
PR     = #401 MERGED
HEAD_FEATURE = 01410d73 (ancestor of origin/main)
MERGE_SHA    = 092de2ee
POST_MERGE_CI = ALL_GREEN
0061_APPLY / DEPLOY / WRITER / PAYOUT = NOT_EXECUTED
0059_IMMUTABLE = YES
```

---

## Merge

| Field | Value |
|-------|--------|
| **PR** | https://github.com/reserveiviagens-tech/rsv360/pull/401 |
| **Method** | `gh pr merge 401 --merge` |
| **mergedAt** | 2026-09-28T04:31:50Z |
| **mergeCommit** | `092de2ee4b2ede836864a40bdf4ae72a44e12979` |
| **origin/main tip** | `092de2ee` |
| **ancestry** | `01410d73` is ancestor of `origin/main` (exit 0) |

---

## Post-merge CI (`headSha=092de2ee`)

| Workflow | Conclusion |
|----------|------------|
| CI (typecheck/tests/build/eslint) | **success** |
| Fase 4 - Tests and Hardening | **success** |
| Fase 5 — Testes + Deploy readiness | **success** |
| route-smoke | **success** |
| E2E Infra Smoke | **success** |
| CodeQL Analysis | **success** |
| Gitleaks | **success** |
| Security Scan | **success** |

---

## Recovery note

Local `main` briefly diverged via accidental `git pull` merge (`ccfce54f`). Reconciled with `git reset --hard origin/main` → `092de2ee`. **Not pushed.**

---

## Next

```text
C36-CH = GO / POST-MERGE AUDIT (read-only)
```
