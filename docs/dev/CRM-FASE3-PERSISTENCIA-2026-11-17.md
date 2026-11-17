# CRM Fase 3 — Persistência Lintel (Drizzle / PostgreSQL)

> **Nota:** o monorepo usa **Drizzle**, não Prisma. Tabelas equivalentes ao pedido “Prisma”:

| Tabela | Função |
|--------|--------|
| `crm_leads` | Leads do funil Lintel (parceiro) |
| `crm_deals` | Pipeline de negócios |
| `crm_deal_events` | Histórico (criação, mudança de estágio) |

## Migração

- SQL: `backend/drizzle/0066_crm_lintel_deals.sql`
- Aplicar: `npm run migrate` na raiz (workspace backend)

## Runtime

- `DEALS_PERSISTENCE=postgres` (default em Docker via `docker-compose.yml`)
- Jest força `memory` em `backend/src/test/env-defaults.ts`
- Demo seed opcional em dev: tabela vazia → seed cards; desligar com `CRM_DEALS_DEMO_SEED=0`

## Rollback

```sql
DROP TABLE IF EXISTS crm_deal_events;
DROP TABLE IF EXISTS crm_deals;
DROP TABLE IF EXISTS crm_leads;
```

Reverter `DEALS_PERSISTENCE=memory` no container se necessário.