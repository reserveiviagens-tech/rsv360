# Continuar daqui — CRM Deals / Smoke / Lintel (13 nov 2026)

> Checkpoint da sessão **13/11/2026 (noite)**. Retomar a partir deste ficheiro + `SMOKE-CRM-DEALS-2026-11-13.md` + `HANDOFF-CRM-DEALS-LINTEL-2026-11-11.md`.

---

## Estado do git (`develop`)

| Item | Valor |
|------|--------|
| Base remota | Merge **PR #518** (`9e80b673`) — fatia **3a Rentals** |
| **PR #517** | ✅ MERGED @ `ff5df20c` (kanban + KPI) |
| **PR #518** | ✅ MERGED @ `9e80b673` (tokens Rentals) |
| **PR #519** | ✅ MERGED @ `ed75b8fd` (tokens Sales — fatia 3b) |
| CI #518 | Checks do diff: pass · NPM Audit: fora do escopo (lockfile base) |
| Stash local | `wip-unrelated-pre-3a` (Anfitrião, package-lock, etc.) — não aplicar na fatia Rentals |

**Não misturar** com stash/working tree alheio: `fase1-api.ts` / carteira anfitrião (ver notas antigas no handoff 11/11).

---

## Homologação smoke — resumo executivo

| Veredito | 🟢 **VERDE** (13/11 — patch Win Rate aplicado e revalidado) |
|----------|-----------------------------------------------------------|

| Grupo | Resultado |
|-------|-----------|
| Auth 2.1.x | ✅ 3/3 |
| Deep links + kanban 2.2.x | ✅ 5/5 (Cursor) |
| Modal 2.3.x | ✅ 4/5 + **N/A** Perfil (2.3.5 sem ação) |
| KPI 2.4.x | ✅ 2/2 (fix `deals-crm-module.tsx`) |
| Dark 2.5.x | ✅ 2.5.1 OK; 2.5.2 N/A no código (`components/deals/` sem hex; kanban `globals.css` → Opção 2) |

**Build:** `npm run build -w apps/turismo` → OK.

---

## Fix aplicado (13/11 — sessão retomada)

**KPI Win Rate:** `winRate` conta apenas `status === 'won' | 'lost'`. **Opção 2:** `LINTEL_KANBAN_THEME` + vars CSS. Entregues via **#517** (não mergear `develop` local até gate).

---

## Auth — evidência (smoke Cursor, login fresco)

- Login: `http://localhost:3005/login`  
  - Email: `admin@rsv360.com.br`  
  - Senha dev: `dev-only-fallback-do-not-use-in-prod` (ver `docs/cotacao/TROUBLESHOOTING-LOGIN-LOCAL.md`)
- `2.1.2`: `/api/v1/deals` → **200** com `Authorization: Bearer` + token em `localStorage` (`access_token` / `authToken`); sem Bearer → **401** (esperado; não é falha de UI)

---

## Deep links (evidência 5/5)

| Slug | Valor |
|------|-------|
| `dhollismarc` | $1.185.000 — Marcus |
| `dhollispriya` | $1.240.000 — Priya |
| `dhollisspen` | $1.215.000 — Spencer · 2481 Hollis Lane |

URLs: `/deals?deal=<slug>` e overview com `tab=deals`.

---

## Ambiente local

```powershell
# Se :3005 já estiver em uso, NÃO iniciar outro dev (EADDRINUSE)
# Caso contrário:
npm run dev -w apps/turismo
```

Backend/auth: ver troubleshooting login (`:3005` proxy para `/api/v1/auth/login`).

---

## Próximos passos (ordem recomendada)

1. ~~**Gate + merge #517**~~ ✅
2. ~~**Opção 3a Rentals + PR #518**~~ ✅
3. **Opção 3b Sales** — `LINTEL_SALES_TW` + `sales-crm-module`, `sales-list-table`, `sales-property-card` (hex restantes: toolbar, map, share, skeleton)
4. Gate 3b → polish Rentals restante (`lease-calendar`, `rent-roll`, skeleton) em fatia opcional 3a+
5. Backlog Deals: 2.3.3 / 2.3.4 manual; 2.3.5 Perfil N/A.

---

## Opção 3 — Brief Sales/Rentals (paridade Lintel) — *planeamento apenas*

**Objetivo:** alinhar abas **Vendas** e **Locações** do Cockpit (`RSV360ExecutiveDashboard`) à referência Lintel, no mesmo padrão entregue em Deals (shell, KPIs, tokens, deep links, dark mode).

**Pré-requisitos:** PR **#517** mergeada; smoke Deals verde mantido; gate da fatia anterior fechado.

### Escopo sugerido (2 PRs ou 2 sub-fatias)

| Fatia | Rotas / entrada | Módulos principais |
|-------|------------------|---------------------|
| **3a — Rentals** | `/overview?tab=rentals` | `rentals-crm-module.tsx`, `rental-portfolio-card.tsx`, `rent-roll-chart.tsx`, `lease-calendar-panel.tsx`, `rentals-skeleton.tsx` |
| **3b — Sales** | `/overview?tab=sales` | `sales-crm-module.tsx`, `sales-list-table.tsx`, `sales-property-card.tsx`, `sales-map-view.tsx`, `sales-market-pulse-card.tsx`, `sales-listing-share.ts` |

**Shell partilhado:** `lintel-shell-nav.tsx`, `crm-copy.ts`, `lintel-theme.ts` / `globals.css` (reutilizar padrão Opção 2).

### Critérios de aceitação (mínimo)

- KPI strip + layout consistentes com Deals (tokens, sem hex novo em `components/sales|rentals/`).
- Navegação overview: `tab=rentals` / `tab=sales` sem regressão em `tab=deals`.
- Dark mode legível (smoke visual documentado).
- `npm run build -w apps/turismo` OK.
- Checklist smoke dedicado (criar `docs/dev/SMOKE-CRM-SALES-RENTALS-*.md` quando iniciar).

### Referências

- `docs/dev/AUDITORIA-CRM-DEALS-LINTEL-2026-11-12.md` (gaps)
- `docs/cotacao/MATRIZ-PARCEIRO-OVERVIEW-LINTEL.md`
- Demo: `https://demo.codeandchill.store/lintel/` (Rentals / Sales)

### Estimativa / risco

- **Esforço:** médio-alto (2 módulos × polish + possíveis dados demo).
- **Risco:** médio (dashboard monolítico; evitar refactor em `RSV360ExecutiveDashboard.tsx` fora do necessário).
- **Blast radius:** `apps/turismo/components/{sales,rentals,lintel}` + CSS.

### Prompt para quando o gate libertar

> «Merge #517 feito. Ler brief Opção 3 em `CONTINUAR-CRM-DEALS-2026-11-13.md`. Implementar fatia **3a Rentals** com patch mínimo, build, smoke visual, PR separada.»

---

## Documentos de referência

| Ficheiro | Uso |
|----------|-----|
| `docs/dev/SMOKE-CRM-DEALS-2026-11-13.md` | Checklist §2, bloco PR §4, critério §6 |
| `docs/dev/HANDOFF-CRM-DEALS-LINTEL-2026-11-11.md` | Mapa de ficheiros e paridade Lintel |
| `docs/dev/AUDITORIA-CRM-DEALS-LINTEL-2026-11-12.md` | Gap vs Lintel |
| `docs/cotacao/TROUBLESHOOTING-LOGIN-LOCAL.md` | Login local |

---

## Gate enterprise

- **3a:** fechada (#518). **3b:** PR dedicada; não misturar WIP `pages/overview.tsx`.
- NPM Audit na base: fora do escopo das fatias CRM Lintel.

---

## Retomar no Cursor (prompt sugerido)

> «`gh pr checks 517`. Se merge OK: `git pull origin develop`. Iniciar Opção 3a Rentals conforme brief no CONTINUAR.»

---

*Gerado para pausa da sessão 13/11/2026. Transcript Cursor: buscar `a2c12981` em agent-transcripts.*
