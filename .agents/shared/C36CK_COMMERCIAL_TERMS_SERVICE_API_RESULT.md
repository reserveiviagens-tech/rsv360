# C36-CK — Commercial Terms Service/API Result

**Date:** 2026-09-28 (America/Sao_Paulo)  
**Predecessor:** C36-CJ PASS  

## Status

```text
C36-CK = PASS / TERMS_SERVICE_API_MERGED
PR = #406 → merge 90992b58
CI = GREEN
EARNING/LEDGER/PAYOUT = NOT_WRITTEN
```

## Delivered

| Item | Detail |
|------|--------|
| Service | `partner-commercial-terms.service.ts` — list, createDraft, activate (TX supersede), resolveEffectiveAt |
| API | `/api/v1/partners/associations/:peaId/commercial-terms*` staff-only |
| AuthZ | JWT + admin/manager; no `partner_links` |
| Tests | 401/403/400/201/404 + source scan |

## Next

```text
C36-CL = GO / EARNING WRITER
```
