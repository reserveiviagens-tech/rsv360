# Handoff — continuação (26 nov 2026 — pausa)

> **Prompt para retomar no Cursor:**  
> `Pull develop @ ccbe53a4. Leia docs/dev/HANDOFF-CONTINUACAO-2026-11-26.md. Últimos merges: #598 audit, #599 P5+ Sales API. Smoke: /overview?tab=sales e /overview?tab=rentals.`

---

## `develop` (fonte de verdade)

| Item | Valor |
|------|--------|
| **HEAD** | `ccbe53a4` — merge **#599** (P5+ Sales API) |
| **Anterior** | `f774e8a8` — merge **#598** (npm audit lockfile chore) |
| **Lintel 1–5** | ✅ **#597** mergeado (`test:lintel-consolidacao`) |

### PRs mergeados nesta linha de trabalho

| PR | Escopo |
|----|--------|
| **#550** (histórico) | P1 e-sign — expiry, revogação, CPF mascarado |
| **#590 / #591** | P4/P5 Rentals — portfólio API via `overview.tsx`, desacoplado de comissão demo |
| **#597** | Lintel fatia 5 — harness `npm run test:lintel-consolidacao` |
| **#598** | Chore audit — `package-lock.json` seguro; brief `NPM-AUDIT-CHORE-2026-11-26.md`; gate **dependency-review** (pin `nodemailer@9.0.3`, sem alterar declaração na raiz) |
| **#599** | **P5+ Sales** — `unidadesToSalesListings`, props `salesPortfolio*`, badge API, deep link `?tab=sales&property=unit-{id}` |

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

---

## Backlog prioritizado (próxima sessão)

1. **Smoke Playwright** — `npm run test:e2e:overview-portfolio` (`apps/turismo/e2e/overview-portfolio-smoke.spec.ts`) — H8/H9/H8c/H9b
2. **nodemailer@10.0.6+** — PR dedicada + testes backend e-mail (`password-reset-email`)
3. **Next.js patch** — bump planejado (GHSA em brief audit); PR separada + `build:turismo`
4. **Fatia B Kanban** — **somente** com repro Playwright documentado
5. Atualizar `HANDOFF-CRM-DEALS-2026-11-25.md` (SHA antigo `1c14d458` — obsoleto)

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

---

## Linha entregue (checklist owner)

- [x] P1 e-sign #550
- [x] P4/P5 Rentals overview API (#590/#591)
- [x] Lintel 1–5 (#597)
- [x] Audit chore (#598)
- [x] P5+ Sales API (#599)

**Pacr / enterprise:** próxima tarefa só após `git pull` + smoke H8/Sales; escolher backlog acima.