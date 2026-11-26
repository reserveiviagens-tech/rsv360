# Handoff — continuação (26 nov 2026 — pausa)

> **Prompt para retomar no Cursor:**  
> `Pull develop @ 229e8981. PLANO-EXECUCAO-RESTANTE — Fatia B fechada; Fase 1 Docker opcional.`

---

## `develop` (fonte de verdade)

| Item | Valor |
|------|--------|
| **HEAD** | **`229e8981`** — merge **#604** (E2E Kanban K3 + smoke K4) |
| **Anterior** | `dbc64f03` — merge **#601** (nodemailer `^10.0.6`) |
| **Lintel 1–5** | ✅ **#597** mergeado (`test:lintel-consolidacao`) |

### PRs mergeados nesta linha de trabalho

| PR | Escopo |
|----|--------|
| **#550** (histórico) | P1 e-sign — expiry, revogação, CPF mascarado |
| **#590 / #591** | P4/P5 Rentals — portfólio API via `overview.tsx`, desacoplado de comissão demo |
| **#597** | Lintel fatia 5 — harness `npm run test:lintel-consolidacao` |
| **#598** | Chore audit — `package-lock.json` seguro; brief `NPM-AUDIT-CHORE-2026-11-26.md`; gate **dependency-review** (pin `nodemailer@9.0.3`, sem alterar declaração na raiz) |
| **#599** | **P5+ Sales** — `unidadesToSalesListings`, props `salesPortfolio*`, badge API, deep link `?tab=sales&property=unit-{id}` |
| **#600** | E2E `overview-portfolio-smoke` (H8/H9/H8c/H9b); banner demo Sales; locator H9 |
| **#601** | `nodemailer@10.0.6+` — root/backend/site-publico; sem `@types/nodemailer`; allowlist; brief dedicado |
| **#602** | Next **16.4.6** — turismo/admin/guest/site-publico; allowlist `next` high; `BRIEF-NEXT-PATCH-16.4.6-2026-11-26.md` |
| **#603** | Plano execução restante + E2E deals K1 + handoffs CRM |
| **#604** | Fatia B: E2E K3 (2.3.3) + auto-login `smoke:crm-deals-persistence` K3a/K4 |

---

## Arquitetura (não regredir)

```
overview.tsx
  useOverviewPortfolioUnits()  →  unidades[]
  ├─ rentalPortfolio + rentalPortfolioSource  →  RSV360ExecutiveDashboard  →  RentalsCrmModule
  └─ salesPortfolio + salesPortfolioSource   →  RSV360ExecutiveDashboard  →  SalesCrmModule
```

- **Não** mover fetch `anfitriaoMinhas` para dentro de `rentals-crm-module` / `sales-crm-module`.
- `SAMPLE_*` = fallback quando `source === 'demo'`.
- Deep links:
  - Rentals: `?tab=rentals&rental=unit-{id}` (ou `unit`)
  - Sales: `?tab=sales&property=unit-{id}` (`findSalesListingBySlug(slug, salesCatalog)`)

### Ficheiros-chave

| Área | Path |
|------|------|
| Mapper | `apps/turismo/src/lib/overview-portfolio.ts` (`unidadesToRentalPortfolio`, `unidadesToSalesListings`) |
| Overview | `apps/turismo/pages/overview.tsx` |
| Dashboard props | `apps/turismo/components/RSV360ExecutiveDashboard.tsx` |
| Sales UI | `apps/turismo/components/sales/sales-crm-module.tsx` |
| Rentals UI | `apps/turismo/components/rentals/rentals-crm-module.tsx` |
| Testes | `apps/turismo/src/lib/__tests__/overview-portfolio-*.test.ts` (7 testes) |

---

## Validação local

```powershell
git checkout develop
git pull origin develop
# Preferir Node 24 + npm 10.x (engines do monorepo)
npm ci
npm run build --workspace=@rsv360/shared   # antes de turismo se dist stale
npm run build:turismo
npx jest --runInBand --testPathPattern overview-portfolio --roots apps/turismo/src/lib
```

**Smoke manual (Docker turismo :3005 ou `npm run dev:turismo`):**

- `http://localhost:3005/overview?tab=rentals` — badge **API** + unidades `minhas`
- `http://localhost:3005/overview?tab=sales` — idem Sales
- Deep: `?tab=sales&property=unit-42`, `?tab=rentals&rental=unit-42`

---

## CI / gates (última evidência)

| PR | dependency-review | NPM Audit | Notas |
|----|-------------------|-----------|--------|
| #598 | ✅ após pin lock nodemailer 9.0.3 sem diff em `package.json` | ✅ | Lock grande; não usar `audit fix --force` cego |
| #599 | ✅ | ✅ | Escopo 6 ficheiros UI |
| #600 | ✅ | ✅ | Mergeado `961c5fa6` |
| #601 | ✅ | ✅ | Mergeado `dbc64f03`; jest password-reset 14/14 |
| #602 | ✅ | ✅ | Mergeado `67668e23`; `build:turismo` local OK |
| #603 | ✅ | ✅ | Plano + K1 E2E |
| #604 | ✅ | ✅ | K3 E2E + K4 smoke API |

### E2E overview portfólio (`npm run test:e2e:overview-portfolio`) — 26 nov 2026

| Cenário | H8 | H9 | H8c | H9b |
|---------|----|----|-----|-----|
| Docker `turismo` sem `60191fc0` | pass | **fail** (sem banner demo) | pass | pass |
| `next dev` branch `feat/e2e-overview-portfolio-smoke` + credenciais admin dev | pass | pass | pass | pass |

**Comando:** `E2E_TURISMO_URL=http://localhost:3005` + `E2E_AUTH_EMAIL` / `E2E_AUTH_PASSWORD` (ver `docs/cotacao/TROUBLESHOOTING-LOGIN-LOCAL.md`). Backend `:3002` health 200.

**Causas documentadas:**
- Imagem Docker desatualizada → H9 sem badge **API** nem banner demo até merge do fix em `sales-crm-module.tsx`.
- H9 com API: título DOM `ImóveisAPI à venda` — locator usa `heading` nível 1 + `/venda/i` (não string fixa `Imóveis à venda`).

**Evidência:** 4 passed ~10s com dev local após locator + fix Sales (`60191fc0`).

**PR:** [#600](https://github.com/reserveiviagens-tech/rsv360/pull/600) — mergeado.

---

## Backlog prioritizado (próxima sessão)

1. ~~**Smoke Playwright** overview~~ — ✅ **#600**
2. ~~**nodemailer@10.0.6+**~~ — ✅ **#601** (`BRIEF-NODEMAILER-10-2026-11-26.md`)
3. ~~**Next.js patch**~~ — ✅ **#602** (`16.4.6`, brief Next)
4. ~~**Fatia B Kanban**~~ — ✅ **#604** (K3 E2E + K3a/K4 smoke); opcional: DnD E2E
5. ~~Atualizar HANDOFF-CRM-DEALS~~ — ✅ 26/11 @ `e057f790`

---

## Ambiente / armadilhas

- **Node v26** local → `EBADENGINE` e lockfile diferente do CI; usar **Node 24** para `npm ci` / chore audit.
- Não commitar `packages/shared/dist/*` acidental (rebuild local).
- `npm run audit -w apps/turismo` **não existe** — usar `npm audit --workspace=apps/turismo`.
- Fase `phase-config`: **sem auto-merge**; gate por fatia após cada PR.

---

## Branches (housekeeping)

| Branch | Ação |
|--------|------|
| `chore/audit-deps` | Mergeada — apagar local/remoto se existir |
| `feat/overview-p5-sales-api` | Mergeada — apagar após pull |
| `chore/audit-deps` antiga local | `git branch -d` após sincronizar |
| `chore/nodemailer-10.0.6` | Mergeada (#601) — apagar após pull |
| `chore/next-16.4.6-security` | Mergeada (#602) — apagar após pull |
| `feat/deals-kanban-e2e-k1` / `feat/deals-kanban-e2e-k3` | Mergeadas (#603/#604) — apagar após pull |

---

## Linha entregue (checklist owner)

- [x] P1 e-sign #550
- [x] P4/P5 Rentals overview API (#590/#591)
- [x] Lintel 1–5 (#597)
- [x] Audit chore (#598)
- [x] P5+ Sales API (#599)
- [x] E2E overview H8/H9 (#600)
- [x] nodemailer 10 (#601)
- [x] Next.js 16.4.6 (#602)
- [x] Fatia B Kanban K3/K4 (#603/#604)

**Pacr / enterprise:** gates até **#604**; ver **`PLANO-EXECUCAO-RESTANTE-2026-11-26.md`** Fase 5 (Zod/sharp) ou Docker rebuild.