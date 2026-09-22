# FASE 5.0 — PARTNERS SPEC (Architecture-First)

**Status:** `FASE5_PARTNERS_SPEC_CONDITIONS_CLOSED` → aguarda **`SPEC_APPROVED` humano** (risco **HIGH**)  
**Agente:** Antigravity (Tech Lead / Architect)  
**Data:** 2026-09-22  
**Baseline Spec original:** `bacf9ecb`  
**Review:** `.agents/shared/FASE5_PARTNERS_SPEC_REVIEW.md` (§C aplicado abaixo)  
**Implementação Cursor:** **PROIBIDA** até `SPEC_APPROVED` **e** `INC1_AUTHORIZED`  

**Direção de produto (Orquestrador):**  
`PARTNER → PROPERTIES / ACCOMMODATIONS / ROLES → BOOKINGS → EARNINGS → LEDGER → PAYOUTS`  
Preservar Affiliate, Marketplace, Marketplace Split, commissions, earnings/payouts legados.

---

## 0. Resumo executivo

| Pergunta | Resposta comprovada |
|----------|---------------------|
| Existe tabela/entidade `partners`? | **NÃO** |
| Affiliate SQL existe? | **SIM** (`008`) — **API ausente**; UI órfã |
| Marketplace listings SQL? | **SIM** (`007`) — **API ausente**; UI órfã |
| Marketplace Split vivo? | **SIM** (BFF site-publico + SQL `011`) |
| Comissões canônicas vivas? | **SIM** `/api/v1/comissoes` + `comissoes_lancamento` |
| Dois stacks de “propriedade”? | **SIM** — legado EN (`enterprises/properties/accommodations`) vs Drizzle (`empreendimentos/acomodacoes`) |
| Role `partner` no JWT? | **NÃO** — “parceiro” = alias anfitrião/corretor |

A Spec define a **ponte canônica** sem apagar legados; implementação fica em incrementos posteriores pós-aprovação.

---

## 1. PARTNER DOMAIN MAP (estado atual comprovado)

### 1.1 User-centric (comprovado)

```text
User (users.id, users.role varchar/enum)
 ├── Enterprise?     → enterprises.owner_id → users  [legado SQL 001 / Drizzle mirror]
 ├── Partner?        → AUSENTE (sem tabela partners)
 ├── Property?       → properties.enterprise_id; variantes owner_id [legado]
 ├── Accommodation?  → accommodations.property_id [legado]
 │                    OR acomodacoes.proprietario_id → users [Drizzle 0022]
 ├── Empreendimento? → empreendimentos.criado_por → users [Drizzle 0022]
 ├── Owner profile?  → owners.user_id → users [site-publico script]
 ├── Affiliate?      → affiliates.user_id INTEGER sem FK [008]
 └── Carteira?       → carteira_corretor(corretor_id, proprietario_id) → users [0023]
```

### 1.2 Partner-centric (alvo vs realidade)

```text
ALVO (produto):
Partner
 ├── Properties / Accommodations / Roles
 ├── Bookings
 ├── Earnings
 ├── Ledger
 └── Payouts

REALIDADE:
[sem Partner]
 ├── empreendimentos + acomodacoes.proprietario_id     [stack ativo]
 ├── enterprises → properties → accommodations         [stack legado]
 ├── bookings (+ enterprise/property/accommodation_id) [legado ALTER]
 ├── marketplace_listings → orders → commissions       [SQL órfão]
 ├── affiliates → commissions / referrals / payouts    [SQL órfão]
 ├── marketplace_receivers + split_transactions        [Split vivo]
 ├── comissoes_lancamento (plataforma|proprietario|corretor) [vivo, soft]
 └── owners / politica_desconto_parceiro              [parcial]
```

**Relações NÃO comprovadas:** `partner_id` em qualquer tabela; `earnings`; `ledger`; tabela `roles`; `property_owners` (código referencia, tabela não encontrada).

---

## 2. LEGACY COMPATIBILITY MAP

| Conceito produto | Artefato atual | Source of truth hoje | Sobreposição / gap |
|------------------|----------------|----------------------|--------------------|
| **AFFILIATE** | `affiliates`, `affiliate_*` (008); UI `dashboard/affiliates.tsx` | SQL legado | UI chama `/api/v1/affiliates` **inexistente**; ID hardcoded=1 (risco IDOR futuro) |
| **MARKETPLACE** (listings) | `marketplace_listings/orders/commissions` (007); UIs turismo + site-publico | SQL legado | Sem BE; docs prometem paths inexistentes |
| **SPLIT** | `marketplace_receivers`, `split_config_rules`, `marketplace_split_transactions` (011); BFF `split-marketplace` | BFF + SQL | Vivo; `partner_pct` é % não FK |
| **COMMISSION** (taxas proposta) | `/api/v1/comissoes` + `comissoes_lancamento` | Módulo server | Diferente de affiliate_commissions / marketplace_commissions |
| **EARNINGS** | — | AUSENTE | Commission rows ≈ proxy frágil |
| **PAYOUTS** | `affiliate_payouts` (SQL); UI affiliates | SQL órfão | Sem pipeline BE; anfitrião UI estima % client-side |
| **PARTNER** | mocks / middleware nome | AUSENTE | Não confundir com `parceiroAuth` |

### Duplicações conceituais
- “Comissão” em **3 lugares**: affiliate_commissions, marketplace_commissions, comissoes_lancamento  
- “Propriedade” em **2 stacks**: EN legado vs empreendimentos/acomodacoes  
- “Parceiro” = marketing/UI vs entidade de domínio  

### Dependências que não podem quebrar
- `/api/v1/comissoes` (admin + anfitrião)  
- Split BFF (pagamentos MP)  
- Auth JWT / roles anfitriao|corretor|admin  
- FASE 0 auth (paralela) — **fora** desta Spec  

---

## 3. CANONICAL DOMAIN PROPOSAL

### 3.1 Princípio
Introduzir **Partner** como identidade comercial **canônica**, com **adapters** para Affiliate / Marketplace listing / Split receivers / Anfitrião-Corretor — **sem DROP** inicial.

### 3.2 Domínios

| Domínio | Responsabilidade | Entidade canônica (proposta) | SoT inicial | Compatibilidade |
|---------|------------------|------------------------------|-------------|-----------------|
| **Partner** | Identidade comercial (quem recebe/governa oferta) | `partners` (+ link `user_id` / `enterprise_id` opcional) | Nova tabela + backfill | Mapear `affiliates`, `owners`, `empreendimentos.criado_por`, receivers |
| **Property / Accommodation** | Inventário hospedável | Preferir stack **Drizzle** `empreendimentos`/`acomodacoes` como SoT de produto; legado EN = read-adapter até cutover | Drizzle ativo | FK `partner_id` nova (nullable) + backfill |
| **Roles** | Papéis no contexto Partner | `partner_memberships (partner_id, user_id, role)` | Nova | Não substitui `users.role` global de imediato |
| **Booking** | Reserva/proposta confirmável | `bookings` / `propostas` (já existentes) | Existente | Evento → earning |
| **Earning** | Direito econômico gerado | `partner_earnings` | Nova | Espelha/liga `comissoes_lancamento`, affiliate_commissions, marketplace_commissions |
| **Ledger** | Livro imutável de movimentos | `partner_ledger_entries` | Nova | Append-only; fontes = earning/payout/adjust |
| **Payout** | Liquidação | `partner_payouts` | Nova | Adapter de `affiliate_payouts`; MP split permanece canal de settlement |

### 3.3 Regras de negócio (alvo)
1. Todo earning tem `partner_id` + `source_type` + `source_id` (polimórfico controlado).  
2. Ledger entry nunca UPDATE de valor (só storno via nova linha).  
3. Payout referencia earning_ids / ledger_ids; status machine: `pending|approved|paid|failed|cancelled`.  
4. Affiliate continua válido como **programa de indicação** (`source_type=affiliate`) sob um Partner.  
5. Marketplace listing = **canal de distribuição** (`source_type=marketplace_order`).  
6. Split = **mecanismo de settlement** MP, não substitui ledger interno.

### 3.4 Identificadores (**fechado**)
- `partners.id` — **UUID** `gen_random_uuid()` (alinha domínio financeiro Drizzle `0058_payments_*`, agentes, auditoria)  
- FKs internas Partner\* → UUID  
- `partners.code` UNIQUE (público, string estável)  
- Soft link: `partner_links(kind, external_id TEXT)` — `external_id` guarda IDs legados (int/serial) como texto; **não** exige unificar tipos no dia 1

---

## 4. API CONTRACT (proposta — OpenAPI/Zod antes do código)

Base path sugerido: `/api/v1/partners`

| Método | Path | Auth (proposta) | Notas |
|--------|------|-----------------|-------|
| POST | `/partners` | admin / onboarding autorizado | Cria Partner + membership owner |
| GET | `/partners/:id` | member do partner \| admin | |
| PATCH | `/partners/:id` | partner_admin \| admin | |
| GET | `/partners/:id/properties` | member | Adapter empreendimentos/properties |
| GET | `/partners/:id/accommodations` | member | |
| GET | `/partners/:id/memberships` | partner_admin \| admin | |
| POST | `/partners/:id/memberships` | partner_admin \| admin | roles |
| GET | `/partners/:id/bookings` | member scoped | |
| GET | `/partners/:id/earnings` | member finance \| admin | `{ data, pagination }` |
| GET | `/partners/:id/ledger` | finance \| admin | append-only view |
| GET | `/partners/:id/payouts` | finance \| admin | |
| POST | `/partners/:id/payouts` | finance \| admin | idempotency-key |
| GET | `/partners/me` | JWT | resolve partner(s) do user |

**Adapters legados (fase de coexistência):**
- Manter `/api/v1/comissoes` (sem breaking)  
- Implementar `/api/v1/affiliates` e `/api/v1/marketplace` como **facades** thin → Partner domain **ou** marcar deprecated com 501 documentado até cutover (escolher no Incremento 2 — recomendação: facade read-only primeiro)

**Erros padrão:** 400 validation, 401, 403 tenant, 404, 409 conflict, 422 business, 501 se facade não pronta.

**Paginação:** `{ data: T[], pagination: { page, pageSize, total } }` (alinhar plano E).

**Idempotência:** header `Idempotency-Key` em POST payouts e POST earnings manuais.

**Auditoria:** `actor_user_id`, `request_id`, append ledger.

Contratos Zod/OpenAPI: a produzir no Incremento 0 (este pacote Spec) como arquivos `docs/openapi/partners.yaml` + schemas TS — **não** nesta entrega (texto da Spec apenas); implementação gera artefatos.

---

## 5. DATABASE / DER (proposta — NÃO executar)

### 5.1 Novas tabelas (mínimo)
- `partners`  
- `partner_memberships`  
- `partner_links` (kind: affiliate|owner|empreendimento|enterprise|receiver)  
- `partner_earnings`  
- `partner_ledger_entries`  
- `partner_payouts` (+ `partner_payout_items`)

### 5.2 Alterações em tabelas existentes (**fora do Inc 1**)
Adiadas para incrementos posteriores (com gate próprio), **somente** quando SoT/produto autorizar:
- nullable `partner_id` em inventário (`empreendimentos` / eventualmente legado) — **após** decisão SoT  
- nullable `partner_id` em `comissoes_lancamento` — Inc 5 (dual-write)  
- **Proibido** alterar `marketplace_split_transactions` / receivers no Inc 1 (Split vivo)  
- **Sem DROP** de 007/008/011 em qualquer incremento sem OK humano dedicado  

### 5.3 Índices / constraints (tabelas novas)
- UNIQUE `partners.code`  
- UNIQUE `partner_memberships(partner_id, user_id)`  
- UNIQUE `partner_links(kind, external_id)`  
- CHECK status enums  
- FK RESTRICT em payout→earning pagos  

### 5.4 Ledger
- `entry_type`: credit|debit|hold|release|adjust  
- `amount_cents` bigint  
- `currency`  
- `idempotency_key` UNIQUE  

---

## 6. MIGRATION STRATEGY

| Fase | Ação | Rollback |
|------|------|----------|
| M0 | Spec/ADR + condições fechadas + `SPEC_APPROVED` | N/A |
| M1 | **CREATE ONLY** tabelas Partner\* (additive); sem ALTER em tabelas vivas | Migration **down** Drizzle em DB efêmero/staging; **proibido** DROP ad-hoc em produção |
| M2 | Backfill `partners` + `partner_links` (staging first) | Reverter script; DELETE partners sem earnings/ledger |
| M3 | Facades affiliates/marketplace read | Remover rotas facade |
| M4 | Dual-write earnings←comissoes_lancamento (flag) | Desligar flag |
| M5 | UI aponta Partner APIs | Reverter UI |
| M6 | Deprecated docs; **não** DROP legado até ≥1 ciclo + OK humano | — |

**Preservar:** Affiliate/Marketplace/Split operacionais durante M1–M5.  
**Proibido nesta Spec:** migration destrutiva, payout real em produção, alteração MP credentials, DROP ad-hoc em prod.

---

## 7. SECURITY / RBAC

| Capacidade | Quem (proposta) |
|------------|-----------------|
| Criar Partner | `admin` / fluxo onboarding controlado |
| Admin Properties/Accommodations | `partner_admin`, `anfitriao` membership, `admin` |
| Ver Bookings | membership `ops|finance|admin` scoped |
| Ver Earnings / Ledger | `finance`, `partner_admin`, `admin` |
| Solicitar/gerenciar Payouts | `finance`, `admin` (+ maker-checker futuro) |
| Isolamento | sempre `partner_id` no WHERE; proibir ID hardcoded |
| Auditoria | toda mutação financeira → ledger + audit log |

Corrigir **antes** de expor `/api/v1/affiliates`: remover `id=1` hardcoded na UI.

---

## 8. TEST PLAN

| Camada | Foco |
|--------|------|
| Unit | membership resolution; earning→ledger rules; idempotency |
| Integration | CRUD Partner; scope 403 cross-tenant; facade affiliates/marketplace |
| Contract | OpenAPI/Zod snapshot |
| DB | migration up/down em DB efêmero; backfill invariants |
| Authz | matriz RBAC |
| Regression | `/api/v1/comissoes`, split-marketplace, auth refresh (FASE 0) |
| E2E | smoke Partner me + earnings list (após Incremento ≥3) |

---

## 9. ADR

Ver `.agents/shared/ADR-FASE5-PARTNER-DOMAIN.md`.

---

## 10. IMPLEMENTATION PLAN (incrementos)

Cada incremento: `SPEC → IMPLEMENT → TEST → REVIEW → EVIDENCE → GATE`  
**Risco HIGH** → commit/push **humano**.

| Inc | Nome | Entrega | Gate |
|-----|------|---------|------|
| **0** | Spec pack + condições §15 | Domain/API/DER/Migration/RBAC/ADR/Tests/Review | **HUMANO `SPEC_APPROVED`** ← STOP atual |
| **1** | Schema CREATE-only | Ver §15.1 — só tabelas Partner\*; sem ALTER vivo; sem API; sem backfill | `INC1_AUTHORIZED` + HIGH + DB review |
| **2** | Partner core API | OpenAPI/Zod + POST/GET/PATCH partners + memberships | HIGH |
| **3** | Links + backfill staging | partner_links; script backfill | HIGH |
| **4** | Facades read affiliates/marketplace | Desbloqueia UIs órfãs sem duplicar domínio | HIGH |
| **5** | Earnings + ledger write path | Dual-write comissoes_lancamento (flag) | HIGH |
| **6** | Payouts (não-prod first) | State machine + idempotency; **sem** money real até OK | HIGH + payments review |
| **7** | UI Partner console | Substituir stubs; remover hardcoded ids | MEDIUM–HIGH |

**Fora até novo gate:** C5, D Leilões, E como Spec separada, G2, apagar Affiliate/Marketplace/Split, FASE 0.

---

## 11. Riscos

| Risco | Mitigação |
|-------|-----------|
| Dois stacks property | Adapter; SoT Drizzle declarado; sem merge cego de schemas |
| Três “comissões” | `source_type` no earning; não unificar tabelas no dia 1 |
| UIs 404 | Facades Incremento 4 |
| IDOR affiliates UI | Fix antes de API real |
| Split MP vs ledger | Split = settlement externo; ledger = interno |
| Escopo HIGH | Spec gate humano; sem auto-commit produto |

---

## 12. Arquivos futuramente afetados (preview — não alterar agora)

- `backend/drizzle/*` (novas migrations)  
- `backend/src/db/schema/*`  
- `server/modules/partners/**` (novo)  
- `backend/src/docs/openapi.js` / `docs/openapi/partners.yaml`  
- `apps/turismo/pages/partners.tsx`, `dashboard/affiliates.tsx`, `dashboard/marketplace.tsx`  
- `apps/admin/...` (console)  
- Possível bridge `apps/site-publico/lib/marketplace-split/*` (somente link partner_id)  

**Não tocar:** FASE 0 auth, untracked protegidos, `.env`, Dockerfiles FASE 4.

---

## 13. Gates necessários antes de código

1. **Humano:** `SPEC_APPROVED` (esta Spec + ADR + §15)  
2. **Humano:** `INC1_AUTHORIZED` com allowlist = somente schema Partner\* CREATE  
3. Abrir branch `feat/fase5-partners-inc1`  
4. Dual gate + COMMIT_MANIFEST; HIGH → sem commit/push automático  

`bacf9ecb` e commits de Spec/docs = **baseline de especificação**, **não** autorização de implementação.

---

## 14. Lacunas remanescentes (não bloqueiam `SPEC_APPROVED`; bloqueiam incrementos posteriores)

| Lacuna | Estado | Bloqueia |
|--------|--------|----------|
| SoT property `empreendimentos` vs `properties` | **Aberto de propósito** | Inc ≥2 tocante a inventário / `ALTER partner_id` em inventário |
| Affiliate = programa sob Partner | **Fechado** (§15.2) | — |
| OpenAPI/Zod arquivos | Texto na Spec; artefatos no Inc 2 | Inc 2 |
| Notion/GitHub issues sync | Não consultados | Só se Orquestrador exigir → `SPEC_BLOCKED` |

---

## 15. CONDIÇÕES FECHADAS (pre–SPEC_APPROVED) — Review §C

### 15.1 Incremento 1 — escopo fechado

**IN SCOPE**
- CREATE Drizzle: `partners`, `partner_memberships`, `partner_links`, `partner_earnings`, `partner_ledger_entries`, `partner_payouts`, `partner_payout_items` (se itemizado)
- PK UUID; constraints/índices **somente** nessas tabelas
- Migration up/down testada em **DB efêmero**
- Sem seed/backfill de produção

**OUT OF SCOPE**
- ALTER em `comissoes_lancamento`, `affiliates*`, `marketplace_*`, split tables, `empreendimentos`, `acomodacoes`, `properties`, `enterprises`
- Qualquer rota API, facade, UI, job, webhook
- Dual-write, payouts reais, feature flags de dinheiro
- FASE 0, `.env`, Split BFF

### 15.2 Decisões de produto fechadas nesta revisão
- **Affiliate** = **programa sob Partner** (`source_type=affiliate` + `partner_links.kind=affiliate`), não tipo paralelo de Partner no dia 1  
- **ID** = **UUID** (§3.4)  
- **SoT inventário** = permanece aberto; Inc 1 **não toca** inventário → não bloqueia `SPEC_APPROVED` nem Inc 1  
- **Rollback M1** = migration down / revert de PR em ambiente controlado; **nunca** DROP ad-hoc em produção  

### 15.3 Liberação Cursor
Só após: `SPEC_APPROVED` **e** `INC1_AUTHORIZED`. Até lá: **IDLE**.
