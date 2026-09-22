# FASE 5 — Incremento 1 Pre-flight

**Status:** `INC1_PREFLIGHT_PASS`  
**Date:** 2026-09-22  
**Spec baseline:** `6d320174`  
**SPEC_APPROVED:** YES (Orquestrador)  
**INC1_AUTHORIZED:** **NO** — Cursor IDLE  
**Risk:** HIGH  

---

## 0. Escopo do pre-flight

Validar, contra o repositório real, que o Incremento 1 (CREATE-only Partner\*) é **implementável sem ruptura**, sem emitir autorização de schema.

**Não feito:** SQL, migration file, schema TS, API, commit de produto.

---

## 1. Evidências do repositório

| Check | Resultado |
|-------|-----------|
| Tabela `partners` existe? | **NÃO** (grep SQL/TS: zero `CREATE TABLE partners` / `pgTable('partners')`) |
| Última migration Drizzle | `0058_payments_tables` (journal idx 58) |
| Próximo tag sugerido | `0059_partner_domain` |
| Runner | `backend/scripts/migrate.mjs` → drizzle-orm migrator **forward-only** |
| UUID `gen_random_uuid()` | Em uso (0013, 0017, 0037, 0058, …) — **OK** PG |
| `users.id` | **serial/integer** (`existing.ts`) |
| `enterprises.id` | **serial/integer** |
| `empreendimentos` / `acomodacoes` | serial; **não tocar** no Inc 1 |
| `/api/v1/comissoes` | `server/modules/comissoes` → tabela `comissoes_lancamento` — **não tocar** |
| Affiliate/Marketplace/Split SQL | 007/008/011 legado + BFF split — **não tocar** |
| Nome `partners` colide? | Não no schema; UI mocks/docs usam “partners” só no FE |

### Atenção (débito pré-existente — não bloquear Inc 1)
`0058_payments_tables` usa `enterprise_id uuid`, enquanto `enterprises.id` é **serial**. Inc 1 **não** copia esse padrão: nenhum `enterprise_id` UUID em `partners`. Ligação a enterprise via `partner_links(kind='enterprise', external_id)`.

---

## 2. Definição exata Inc 1 (DDL proposta — **não executada**)

Todas as tabelas: `CREATE TABLE IF NOT EXISTS` + constraints; **zero ALTER** em tabelas existentes; **zero DROP** de legado.

### 2.1 `partners`
| Coluna | Tipo | Null | Default | Notas |
|--------|------|------|---------|-------|
| `id` | `uuid` PK | NO | `gen_random_uuid()` | Fechado |
| `code` | `varchar(64)` | NO | — | UNIQUE |
| `display_name` | `varchar(255)` | NO | — | |
| `status` | `text` | NO | `'draft'` | CHECK: `draft\|active\|suspended\|closed` |
| `primary_user_id` | `integer` | YES | NULL | FK → `users(id)` ON DELETE SET NULL |
| `metadata` | `jsonb` | YES | NULL | sem PII obrigatório |
| `created_at` | `timestamptz` | NO | `now()` | |
| `updated_at` | `timestamptz` | NO | `now()` | |

**Índices:** UNIQUE(`code`); INDEX(`status`); INDEX(`primary_user_id`)  
**Não incluir:** `enterprise_id` coluna (usar `partner_links`)

### 2.2 `partner_memberships`
| Coluna | Tipo | Null | Default |
|--------|------|------|---------|
| `id` | `uuid` PK | NO | `gen_random_uuid()` |
| `partner_id` | `uuid` | NO | — FK → `partners(id)` ON DELETE CASCADE |
| `user_id` | `integer` | NO | — FK → `users(id)` ON DELETE CASCADE |
| `role` | `text` | NO | — CHECK: `owner\|partner_admin\|ops\|finance\|member` |
| `created_at` | `timestamptz` | NO | `now()` |

**Constraints:** UNIQUE(`partner_id`,`user_id`)  
**Índices:** INDEX(`user_id`); INDEX(`partner_id`,`role`)

### 2.3 `partner_links`
| Coluna | Tipo | Null | Default |
|--------|------|------|---------|
| `id` | `uuid` PK | NO | `gen_random_uuid()` |
| `partner_id` | `uuid` | NO | FK → `partners` CASCADE |
| `kind` | `text` | NO | CHECK: `affiliate\|owner\|empreendimento\|enterprise\|receiver` |
| `external_id` | `text` | NO | legado int/serial como texto |
| `created_at` | `timestamptz` | NO | `now()` |

**Constraints:** UNIQUE(`kind`,`external_id`)  
**Índices:** INDEX(`partner_id`)

### 2.4 `partner_earnings` (vazia — sem writers no Inc 1)
| Coluna | Tipo | Null | Default |
|--------|------|------|---------|
| `id` | `uuid` PK | NO | `gen_random_uuid()` |
| `partner_id` | `uuid` | NO | FK → `partners` RESTRICT |
| `source_type` | `text` | NO | CHECK: `comissao_lancamento\|affiliate\|marketplace_order\|manual\|adjust` |
| `source_id` | `text` | NO | |
| `amount_cents` | `bigint` | NO | |
| `currency` | `varchar(3)` | NO | `'BRL'` |
| `status` | `text` | NO | `'pending'` CHECK: `pending\|confirmed\|paid\|reversed\|cancelled` |
| `created_at` | `timestamptz` | NO | `now()` |

**Constraints:** UNIQUE(`source_type`,`source_id`)  
**Índices:** INDEX(`partner_id`,`created_at` DESC)

### 2.5 `partner_ledger_entries` (append-only schema)
| Coluna | Tipo | Null | Default |
|--------|------|------|---------|
| `id` | `uuid` PK | NO | `gen_random_uuid()` |
| `partner_id` | `uuid` | NO | FK RESTRICT |
| `entry_type` | `text` | NO | CHECK: `credit\|debit\|hold\|release\|adjust` |
| `amount_cents` | `bigint` | NO | |
| `currency` | `varchar(3)` | NO | `'BRL'` |
| `earning_id` | `uuid` | YES | FK → `partner_earnings` SET NULL |
| `payout_id` | `uuid` | YES | FK → `partner_payouts` SET NULL (criar após payouts ou defer FK circular — ver §2.8) |
| `idempotency_key` | `varchar(128)` | NO | UNIQUE |
| `actor_user_id` | `integer` | YES | FK → `users` SET NULL |
| `created_at` | `timestamptz` | NO | `now()` |

**Índices:** INDEX(`partner_id`,`created_at` DESC)

### 2.6 `partner_payouts`
| Coluna | Tipo | Null | Default |
|--------|------|------|---------|
| `id` | `uuid` PK | NO | `gen_random_uuid()` |
| `partner_id` | `uuid` | NO | FK RESTRICT |
| `amount_cents` | `bigint` | NO | |
| `currency` | `varchar(3)` | NO | `'BRL'` |
| `status` | `text` | NO | `'pending'` CHECK: `pending\|approved\|paid\|failed\|cancelled` |
| `idempotency_key` | `varchar(128)` | NO | UNIQUE |
| `created_at` | `timestamptz` | NO | `now()` |
| `updated_at` | `timestamptz` | NO | `now()` |

### 2.7 `partner_payout_items`
| Coluna | Tipo | Null | Default |
|--------|------|------|---------|
| `id` | `uuid` PK | NO | `gen_random_uuid()` |
| `payout_id` | `uuid` | NO | FK → `partner_payouts` CASCADE |
| `earning_id` | `uuid` | NO | FK → `partner_earnings` RESTRICT |
| `amount_cents` | `bigint` | NO | |
| UNIQUE(`payout_id`,`earning_id`) |

### 2.8 Ordem CREATE (FK)
1. `partners`  
2. `partner_memberships`  
3. `partner_links`  
4. `partner_earnings`  
5. `partner_payouts`  
6. `partner_payout_items`  
7. `partner_ledger_entries` (FKs earning + payout já existem)

### 2.9 Ordem DROP (rollback formal — só Partner\*)
Reverse of §2.8. Documentar no header da migration (padrão `0058`). Executar **apenas** em DB efêmero/staging ou via revert de PR — **nunca** DROP ad-hoc em produção.

---

## 3. Checklist Orquestrador (validação)

| Item | Status |
|------|--------|
| Entidade/tabela Partner definida | PASS (§2.1) |
| UUID + `gen_random_uuid()` | PASS |
| Colunas obrigatórias / null / defaults | PASS |
| UNIQUE / índices / FK | PASS |
| Nomenclatura snake_case + prefixo `partner_` | PASS |
| Convenção migration = próximo `0059_*` + journal | PASS |
| Rollback = down documentado / revert PR | PASS (forward-only runner; header reverse DROP) |
| Compatibilidade PostgreSQL | PASS |
| Segurança: sem secrets; FKs users integer | PASS |
| Tenant isolation | PASS schema-ready (`partner_id` em filhas); enforcement na API = Inc 2+ |
| Auditoria | PASS mínima (`actor_user_id` ledger; `primary_user_id`; timestamps) |
| Zero ALTER tabelas vivas | PASS (plano) |
| Zero DROP legado | PASS (plano) |
| Zero Property/Accommodation | PASS |
| Zero Affiliate/Marketplace/Split | PASS |
| Zero impacto `/api/v1/comissoes` | PASS |

---

## 4. Artefatos futuros (só após `INC1_AUTHORIZED`)

Allowlist sugerida:
- `backend/drizzle/0059_partner_domain.sql`
- `backend/drizzle/meta/_journal.json` (entrada idx 59)
- `backend/src/db/schema/partners.ts` (e export em `index.ts`)
- Teste migration up/down em DB efêmero
- Docs/evidência Inc 1

**Fora:** API, facades, backfill, UI, `.env`, FASE 0, alter comissões/split/inventário.

---

## 5. Veredito

```text
INC1_PREFLIGHT_PASS
```

Plano de migration Inc 1 é **consistente** com o repo e com as condições `SPEC_APPROVED`.

**PARAR.** Aguardar gate humano explícito:

```text
INC1_AUTHORIZED
```

Até lá: **Cursor IDLE** — sem SQL, sem schema, sem push de implementação.
