# COMMIT_MANIFEST

**Status:** ACTIVE — protocolo install (pós-FASE 4)  
**Phase:** PROTOCOL_INSTALL  
**Risk:** LOW  
**Branch:** `chore/fase4-node24-runtime`  
**Base commit (FASE 4 tip):** `4827c575011e69f5bf99cc74d18f92f98e00c7fc`

## Allowed files

- `.agents/shared/AUTONOMOUS_EXECUTION_PROTOCOL.md`
- `.agents/shared/AUTONOMOUS_POLICY.md`
- `.agents/shared/COMMIT_MANIFEST.md`
- `.agents/shared/CURRENT_TASK.md`
- `.agents/shared/HANDOFF.md`
- `.agents/shared/EXECUTION_LOG.md`

## Forbidden files

- `Aruanda2.md`
- `docs/governance/PROTOCOLO-CONVIVENCIA-ANTIGRAVITY-CURSOR.md`
- `test-compose.yml`
- `apps/turismo/pages/reservei/**`
- auth / FASE 0 sources
- Dockerfiles / `engines` / app product code (não tocados neste commit)
- `.env` / secrets

## Validation

| Check | Result |
|-------|--------|
| FASE 4 CLOSED | PASS (`4827c575`) — sem reopen |
| SCOPE = protocol docs only | PASS |
| TYPECHECK/BUILD/DOCKER | N/A (docs only) |
| DIFF allowlist | pending Cursor gate |
| PROTECTED_UNTRACKED | must remain untracked |

## Dual review

| Review | Result |
|--------|--------|
| ANTIGRAVITY_REVIEW | PASS — instalar protocolo + policy + manifest; risco LOW; FASE 5 ainda bloqueada |
| CURSOR_REVIEW | PASS se staged ⊆ Allowed e git checks OK |

## Commit authorization

```text
AUTOMATICALLY_GRANTED
if CURSOR_REVIEW=PASS AND ANTIGRAVITY_REVIEW=PASS AND MANIFEST_MATCH
```

Mensagem sugerida:

```text
docs(agents): install autonomous Cursor↔Antigravity execution protocol
```

## Pós-push

Confirmar HEAD == `origin/chore/fase4-node24-runtime`.  
**Não** iniciar FASE 5.
