# ADR — Affiliate / Marketplace / Split → Partner Domain

**ID:** ADR-FASE5-PARTNER-DOMAIN  
**Status:** Proposed — condições §Addendum fechadas; aguarda `SPEC_APPROVED` humano  
**Date:** 2026-09-22  
**Deciders:** Orquestrador + Antigravity (Tech Lead)  
**Phase:** FASE 5.0 Partners Spec-first  
**Baseline Spec:** `bacf9ecb` (+ patch condições)  

## Context

O RSV360 possui artefatos legados e paralelos para monetização e distribuição:

- **Affiliate** (SQL `008`) — indicação / comissão / payout (API ausente)
- **Marketplace listings** (SQL `007`) — inventário multi-hotel (API ausente)
- **Marketplace Split** (SQL `011` + BFF) — settlement Mercado Pago (vivo)
- **Comissões de proposta** (`/api/v1/comissoes` + `comissoes_lancamento`) — vivo
- **Anfitrião/Corretor** — RBAC e inventário Drizzle (`empreendimentos` / `acomodacoes`)

Não existe entidade **`partners`**. O produto deseja unificar sob:

`PARTNER → PROPERTIES/ACCOMMODATIONS/ROLES → BOOKINGS → EARNINGS → LEDGER → PAYOUTS`

sem apagar prematuramente Affiliate, Marketplace ou Split.

## Decision

1. Introduzir o domínio canônico **Partner** (tabelas + API `/api/v1/partners`) de forma **aditiva**.  
2. Tratar Affiliate, Marketplace listing e Split como **canais/programas/adapters** ligados via `partner_links` e `source_type` em earnings — **não** como drop-in replace no dia 1.  
3. Manter `/api/v1/comissoes` e Split BFF estáveis; dual-write para ledger/earnings sob feature flag.  
4. Preferir stack Drizzle (`empreendimentos`/`acomodacoes`) como SoT de inventário de produto *quando* inventário for ligado; legado EN = read-adapter até cutover explícito. **Inc 1 não toca inventário** — SoT pode permanecer aberto até Inc ≥2.  
5. **Nenhuma** migration destrutiva, payout real em produção ou remoção de módulos legados sem gate HIGH humano.

## Addendum — condições pre–SPEC_APPROVED (2026-09-22)

| Decisão | Valor fechado |
|---------|---------------|
| `partners.id` | **UUID** (`gen_random_uuid()`), alinhado a payments/auditoria Drizzle |
| Affiliate | **Programa sob Partner** (`partner_links.kind=affiliate`) |
| Incremento 1 | **CREATE ONLY** tabelas Partner\*; **zero** ALTER em tabelas vivas |
| Split tables | **Não** receber `partner_id` no Inc 1 |
| Rollback M1 | Migration **down** / revert de PR; **proibido** DROP ad-hoc em produção |
| Liberação Cursor | Só `SPEC_APPROVED` **+** `INC1_AUTHORIZED` |

## Consequences

### Positive
- Source of truth única para identidade comercial e financeiro interno  
- UIs órfãs podem ser desbloqueadas via facades sem reescrever domínio três vezes  
- Compatibilidade e rastreabilidade preservadas  
- Inc 1 com blast radius mínimo (schema novo isolado)

### Negative / Risks
- Complexidade de coexistência (dois stacks de property; três “comissões”) — mitigada adiando ALTER de inventário  
- Backfill e dual-write exigem disciplina de flags e testes  
- Blast radius HIGH — Spec e increments obrigatórios  

### Neutral
- “Parceiro” no middleware atual continua significando roles anfitrião/corretor até `partner_memberships` existir  

## Alternatives considered

| Alternativa | Por que rejeitada |
|-------------|-------------------|
| Apagar Affiliate/Marketplace e reescrever | Perda de dados/contratos; viola mandato do Orquestrador |
| Só consertar UIs apontando para SQL legado sem Partner | Consolida fragmentação; sem ledger/earnings unificados |
| Usar apenas `comissoes_lancamento` como Partner | Não cobre referral affiliate nem marketplace orders |
| bigserial para `partners.id` | Rejeitado: domínio financeiro recente no monorepo usa UUID; links legados via `external_id` TEXT |

## References

- `.agents/shared/FASE5_PARTNERS_SPEC.md` (§15)  
- `.agents/shared/FASE5_PARTNERS_SPEC_REVIEW.md`  
- `database/migrations/007_*.sql`, `008_*.sql`, `011_*.sql`  
- `server/modules/comissoes/**`  
- `apps/site-publico/lib/marketplace-split/**`  
- `backend/drizzle/0022_empreendimentos_parceiros.sql`, `0031_comissoes_lancamento.sql`, `0058_payments_tables.sql`  
