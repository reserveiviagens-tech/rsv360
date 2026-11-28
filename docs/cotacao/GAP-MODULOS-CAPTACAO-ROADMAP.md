# Gaps — Captação comercial (Corretor, Comissões, Afiliados, Parceiros)

> **Objetivo de negócio:** captar proprietários (cotas), gerente/corretor com ganho **recorrente por locação**, e canais extras (afiliados/parceiros) para alimentar demanda e cobrir custos.  
> **Produção:** [turismo.reserveiviagens.com.br](https://turismo.reserveiviagens.com.br/dashboard)  
> **Trilho prioritário:** Anfitrião + `corretor` + `carteira_corretor` + `comissoes_lancamento` — **não** confundir com Afiliados legado.

---

## Mapa rápido (o que é o quê)

| Você imagina | Trilho | UI principal | API | Pronto para captar? |
|--------------|--------|--------------|-----|---------------------|
| Gerente / corretor captador | **B** | `/anfitriao` (role `corretor`) | `/api/v1/acomodacoes/anfitriao` | **Parcial** (carteira só staff/API) |
| Comissão recorrente por aluguel | **C** | `/anfitriao/comissoes` | `/api/v1/comissoes` | **Parcial** (módulo + `paid` + wiring) |
| Afiliados (indicação genérica) | **A** | `/dashboard/affiliates` | `/api/v1/affiliates` | **Não** (UI + API ausentes/incompletos) |
| Parceiros C36 | **D** | `/partners` | `/api/v1/partners` | **Não** (UI placeholder; API staff) |
| Marketplace 8% | **E** | `/dashboard/marketplace` | `/api/v1/marketplace` | **Não** (UI sem backend no tree) |

---

## Prioridade de implantação (fatias / PRs)

### P0 — Corretor + comissões (receita do gerente) — **FAZER PRIMEIRO**

| # | Gap | Camada | Evidência | Fatia sugerida |
|---|-----|--------|-----------|----------------|
| P0.1 | **Comissões / Corretor invisíveis no `/dashboard`** | UI | `AppSidebar` sem Comissões; corretor sem rótulo | **PR atual:** sidebar + rótulos role `corretor` |
| P0.2 | **`comissoes_modulo_ativo` off em prod/staging** | Ops/config | Default `false` em `0031_comissoes_lancamento.sql` | Runbook `RUNBOOK-COMISSOES-MVP-B-STAGING.md` + toggle admin |
| P0.3 | **`gerarLancamentos` só após `paid`** | Backend | Hook em `changeStatus(..., 'paid')` (branch local) | PR backend: wiring + testes (se ainda não mergeado) |
| P0.4 | **`metadata.corretorId` na proposta** | Backend/wizard | `cotacao-publica` + fallback carteira | Mesma PR P0.3 ou sequência imediata |
| P0.5 | **Sem UI staff para carteira em massa** | UI + API | Só `POST .../admin/carteira` (staff) | PR: tela staff “Vincular corretor ↔ proprietários” + CSV |
| P0.6 | **Pagamento proposta → `paid` automático** | Pagamentos | Hoje staff `PATCH /propostas/:id/status` | PR MVP-B Mercado Pago proposta |
| P0.7 | **Login corretor pós-auth** | UX | `getPostLoginPath` → `/anfitriao` (ok); dashboard confunde | Link “Portal corretor” no `/dashboard` hero (opcional P0.1b) |

**Critério de aceite P0:** 1 corretor + 2 proprietários na carteira → 1 proposta `paid` → lançamentos visíveis em `/anfitriao/comissoes` (corretor + proprietário).

---

### P1 — Operação captacao escala (centenas de proprietários)

| # | Gap | Notas |
|---|-----|--------|
| P1.1 | Import em lote proprietários + unidades | `/anfitriao/importar` existe; validar limites e staff aprovação |
| P1.2 | Fila staff aprovar unidades | Doc `instrutor/05-aprovar-unidades-anfitriao.md`; UI fila incompleta |
| P1.3 | RBAC criar usuários `corretor` / `anfitriao` | Registro público não inclui esses roles — só admin |
| P1.4 | Extrato / repasse financeiro | Status `confirmada` vs payout real — alinhar com financeiro |
| P1.5 | Comunicação captador | Convites co-anfitrião e e-mail carteira |

---

### P2 — Afiliados (trilho A) — demanda indireta, **não** substitui corretor

| # | Gap | Evidência |
|---|-----|-----------|
| P2.1 | **`/api/v1/affiliates` ausente no backend ativo** | `PLANO_TESTES_CORRECOES.md`; grep sem módulo em `backend/src` |
| P2.2 | **GET referrals / GET payouts** | Rotas faltando (#6–7 plano testes) |
| P2.3 | **`affiliateId = 1` hardcoded** | `dashboard/affiliates.tsx` L72 |
| P2.4 | **Sidebar / discoverability** | Entrada em “Captação comercial” (PR sidebar) |
| P2.5 | **Modelo de negócio vs corretor** | Documentar: afiliado = referral código; corretor = carteira + % por locação anfitrião |

**Fatia:** reintroduzir módulo affiliates no server **ou** deprecar UI e redirecionar para corretor.

---

### P3 — Parceiros C36 (trilho D)

| # | Gap | Evidência |
|---|-----|-----------|
| P3.1 | **`/partners` placeholder** | `pages/partners.tsx` |
| P3.2 | **API madura, UI turismo ausente** | `server/modules/partners/*`, earnings em `payment-confirmation.service.ts` |
| P3.3 | **Confusão com corretor anfitrião** | Dois rails: `partner_earnings` (booking) vs `comissoes_lancamento` (proposta) |
| P3.4 | **Sidebar** | Link em “Captação comercial” (PR sidebar) |

**Fatia:** UI parceiro mínima (listagem + extrato) consumindo `/api/v1/partners` — **PR dedicada**, escopo staff/parceiro primeiro.

---

### P4 — Marketplace + outros (trilho E e dashboard)

| # | Gap |
|---|-----|
| P4.1 | `dashboard/marketplace` sem `/api/v1/marketplace` no server tree |
| P4.2 | Gestão turística (leilões, OTA, etc.) — maturidade variável; não bloqueia captacao corretor |
| P4.3 | `src/pages/cadastros.tsx` — corretores **mock**; não substitui carteira real |

---

## O que esta PR entrega (P0.1)

- `AppSidebar`: bloco **Anfitrião & corretor** com **Comissões**, **Importar**, labels para role `corretor`.
- Nova seção **Captação comercial** → Afiliados + Parceiros (visibilidade; maturidade P2/P3).
- Este documento como **backlog categorizado** para PRs seguintes.

## O que esta PR **não** entrega (próximas PRs)

- Backend affiliates/marketplace/partners UI completa.
- Carteira staff em massa, MP `paid`, toggle comissões em prod (ops).

---

## Sequência recomendada de PRs (checklist owner)

1. [ ] **Merge P0.1** — sidebar + roadmap (esta PR)
2. [ ] **P0.3–P0.4** — wiring comissões + corretorId (backend)
3. [ ] **Ops** — `comissoes_modulo_ativo` staging/prod + smoke runbook
4. [ ] **P0.5** — UI staff carteira corretor (CSV)
5. [ ] **P0.6** — webhook pagamento proposta
6. [ ] **P2** — affiliates (decisão: implementar API ou desligar UI)
7. [ ] **P3** — partners UI
8. [ ] **P1** — escala import + aprovação unidades

---

## Referências

- `docs/cotacao/ESCOPO-MODULO-ANFITRIAO.md`
- `docs/cotacao/RUNBOOK-COMISSOES-MVP-B-STAGING.md`
- `PLANO_TESTES_CORRECOES.md` (affiliates/marketplace)
- `database/migrations/008_create_affiliates_tables.sql`
- `server/modules/comissoes/services/comissoes.service.ts`
