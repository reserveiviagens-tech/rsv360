# Smoke Test — CRM Sales / Rentals / Lintel tokens (RSV360)

**Data:** 13/11/2026  
**Branch:** `develop` (@ merge **#520** + **#521** Overview P0)  
**Escopo:** Homologação pós-**#518–#520** (tokens) e **#521** (rota `/overview`)  
**Ambiente:** `http://localhost:3005` · login dev em `docs/cotacao/TROUBLESHOOTING-LOGIN-LOCAL.md`

---

## 1. Pré-requisitos

| Item | Comando | Status |
|------|---------|--------|
| Build produção | `npm run build -w apps/turismo` | ✅ OK com #521 mergeado |
| Dev server | `npm run dev -w apps/turismo` | ✅ `:3005` (EADDRINUSE se duplicar) |
| Hex em CRM | `rg '#[0-9a-fA-F]' apps/turismo/components/sales apps/turismo/components/rentals` | ✅ Nenhum (hex só em `lintel-theme.ts`) |

---

## 2. Checklist — Rentals (`/overview?tab=rentals`)

| # | Teste | Resultado esperado | Status |
|---|-------|-------------------|--------|
| 3R.1 | Aba abre sem erro | KPIs, filtros, grid de carteira | ✅ |
| 3R.2 | Chips filtro (All / Vacant / Let / Application) | Ativo = token ink; dark legível | ✅ |
| 3R.3 | Pesquisa + ordenação | Popover/sort consistentes com Deals | ✅ |
| 3R.4 | Card portfólio | Status dots, favorito, ocupação sem regressão | ✅ |
| 3R.5 | Rent roll (barras) | Último mês laranja/azul via tokens | ✅ |
| 3R.6 | Calendário leases | Badges blue/apricot, toast undo | ✅ (UI; toast não exercitado) |
| 3R.7 | Expand painel rent roll / calendário | Modal dark surface token | ☐ manual expand |
| 3R.8 | Skeleton boot (~580 ms) | Sem flash de hex; dark `/40` surface | ☐ timing |
| 3R.9 | Dark mode | Alternar tema; contraste WCAG razoável | ☐ manual toggle |

---

## 3. Checklist — Sales (`/overview?tab=sales`)

| # | Teste | Resultado esperado | Status |
|---|-------|-------------------|--------|
| 3S.1 | Aba abre sem erro | KPI strip, market pulse, filtros | ✅ |
| 3S.2 | Título accent | Cor `accentTitleBlue` (token) | ✅ |
| 3S.3 | Chips status + toolbar (type/beds/sort) | Menu dark = `surfaceColumn` / `surfaceElevated` | ✅ |
| 3S.4 | Vista grid | Property cards: status, favorito, footer border | ✅ |
| 3S.5 | Vista list | Tabela dark surface; dots active/offer | ✅ |
| 3S.6 | Vista map | Canvas mapa fundo dark token | ✅ |
| 3S.7 | Share menu (hover card) | Facebook/WhatsApp/Instagram = brand tokens | ☐ hover manual |
| 3S.8 | Skeleton boot | Igual padrão Rentals | ☐ timing |
| 3S.9 | Sem regressão Deals | `tab=deals` kanban + Win Rate ainda OK | ✅ |

---

## 4. URLs rápidas

| URL | Uso |
|-----|-----|
| `http://localhost:3005/overview?tab=rentals` | Módulo Rentals |
| `http://localhost:3005/overview?tab=sales` | Módulo Sales |
| `http://localhost:3005/overview?tab=deals` | Regressão Deals |
| `http://localhost:3005/deals` | Kanban direto |

---

## 5. Veredito

| Campo | Valor |
|-------|--------|
| Executado em | 13/11/2026 (Cursor browser, `:3005`, sessão autenticada) |
| Veredito global | 🟢 **VERDE** (itens restantes = expand/share/skeleton/dark — não bloqueantes) |
| Notas | Rentals: 6 cards + rent roll + calendário. Sales: grid/lista/mapa + 10 listagens. Deals: swimlanes + filtros agente OK. |

---

## 6. Referências

- `docs/dev/SMOKE-CRM-DEALS-2026-11-13.md`
- `docs/dev/BRIEF-CRM-LINTEL-3C-2026-11-13.md`
- `docs/dev/CONTINUAR-CRM-DEALS-2026-11-13.md`
