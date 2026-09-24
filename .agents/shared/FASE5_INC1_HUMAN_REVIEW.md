# FASE 5 Inc1 — Human Review Pack (pre–commit)

**Status:** `INC1_HUMAN_REVIEW_APPROVED` — commit/PR liberado; staging **não**  
**Dual gate:** PASS ≠ substituição da aprovação humana (aprovação emitida pelo Orquestrador)  
**Commit/push:** authorized sob esta emissão  
**Staging migrate / produção / Inc 2:** **BLOCKED**  

---

## Checklist para o Orquestrador

### Diff staged (13 arquivos, +700/−57)

**Produto / schema**
- [ ] `backend/drizzle/0059_partner_domain.sql` — só CREATE Partner\*; header com rollback DROP Partner\*
- [ ] `backend/src/db/schema/partners.ts` — espelha DDL; sem `enterprise_id`
- [ ] `backend/src/db/schema/index.ts` — 1 linha export
- [ ] `backend/drizzle/meta/_journal.json` + `0059_snapshot.json`

**Testes / validação**
- [ ] `partner-domain-migration.test.ts` (6/6)
- [ ] `validate-partner-domain-0059.mjs` (efêmero)

**Governança**
- [ ] Evidence / HANDOFF / MANIFEST

**Scope guard automático:** `NO_FORBIDDEN_PATHS`

### Critérios de aceite (banco HIGH)

| Critério | Esperado no artefato |
|----------|----------------------|
| CREATE-only | Sem `ALTER TABLE` no SQL ativo |
| UUID | `gen_random_uuid()` / `uuid().defaultRandom()` |
| users FK | `integer` → `users(id)` |
| Sem enterprise_id UUID | Ausente em SQL e TS |
| Sem inventário/legado | Sem ALTER/CREATE dessas tabelas |
| Rollback formal | Comentário DROP Partner\* no header |
| Shared/staging | Ainda **não** migrados |

### Gates após aprovação

```text
INC1_HUMAN_REVIEW_APPROVED  →  libera commit (+ PR se pedido)
INC1_STAGING_MIGRATE_AUTHORIZED  →  gate SEPARADO (depois do commit/PR)
```

**Não implícito:** dual gate PASS, SPEC_APPROVED, INC1_AUTHORIZED ≠ commit.

---

## Pontos de atenção (não bloqueiam, mas revisar)

1. CHECKs usam literais `affiliate` / `empreendimento` / `comissao_lancamento` como **enums de domínio** — não alteram tabelas legadas.  
2. Snapshot Drizzle `0059` é stub vazio (padrão igual `0058`) — journal validator OK.  
3. Tabelas `partner_earnings` / `payouts` / `ledger` criadas **vazias** (sem writers) — Intencional Inc 1; risco de schema “morto” até Inc 5/6.  
4. Branch atual: `chore/fase4-node24-runtime` — considerar `feat/fase5-partners-inc1` no commit/PR se política de branch exigir.

---

## Comando para liberar commit/PR

Quando a revisão humana estiver OK, emitir literalmente:

```text
INC1_HUMAN_REVIEW_APPROVED
```

Até lá: staged permanece; **sem** commit, **sem** push, **sem** migrate staging.
