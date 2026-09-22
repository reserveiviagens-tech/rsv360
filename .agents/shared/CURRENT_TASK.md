# CURRENT_TASK — FASE 1 Safe Dependency Bumps

**Task ID:** FASE-1-SAFE-BUMPS  
**Status:** VALIDATION_REQUESTED  
**Executor:** Cursor  
**Authorized by Owner:** Gate FASE 0 → FASE 1 APPROVED

## Objective

Safe bumps only:
- `google-auth-library` 10.5 → ^10.6 (site-publico)
- `docker/login-action` v3 → v4 (app workflows still on v3)
- `docker/metadata-action` v5 → v6 (app workflows still on v5)
- Validate site-publico build

## Out of scope

FASE 2+; FASE 0 reopen; untracked preserve list; Enterprise Rules; migrations; production; secret files; opportunistic refactors.

## Checkpoint preserved

FASE 0 tip `fix/auth-refresh-contract` @ `c42222848bf27bfcb38e50faecbf979d5fe5c240` — not modified.
