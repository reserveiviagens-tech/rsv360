# Smoke Test — CRM Sales / Rentals / Lintel tokens (RSV360)

**Data:** 13/11/2026  
**Branch:** `develop` (@ merge **#520** `a5fb633b`)  
**Escopo:** Homologação pós-**#518** (3a), **#519** (3b), **#520** (3c)  
**Ambiente:** `http://localhost:3005` · login dev em `docs/cotacao/TROUBLESHOOTING-LOGIN-LOCAL.md`

---

## 1. Pré-requisitos

| Item | Comando | Status |
|------|---------|--------|
| Build produção | `npm run build -w apps/turismo` | ⚠️ **Falha local** se existir WIP `apps/turismo/pages/overview.tsx` (não está no remoto); em `develop` limpa → OK |
| Dev server | `npm run dev -w apps/turismo` | Um processo em `:3005` apenas |
| Hex em CRM | `rg '#[0-9a-fA-F]' apps/turismo/components/sales apps/turismo/components/rentals` | ✅ Nenhum (hex só em `lintel-theme.ts`) |

---

## 2. Checklist — Rentals (`/overview?tab=rentals`)

| # | Teste | Resultado esperado | Status |
|---|-------|-------------------|--------|
| 3R.1 | Aba abre sem erro | KPIs, filtros, grid de carteira | ✅ |
| 3R.2 | Chips filtro (All / Vacant / Let / Application) | Ativo = token ink; dark legível | ☐ |
| 3R.3 | Pesquisa + ordenação | Popover/sort consistentes com Deals | ☐ |
| 3R.4 | Card portfólio | Status dots, favorito, ocupação sem regressão | ☐ |
| 3R.5 | Rent roll (barras) | Último mês laranja/azul via tokens | ☐ |
| 3R.6 | Calendário leases | Badges blue/apricot, toast undo | ☐ |
| 3R.7 | Expand painel rent roll / calendário | Modal dark surface token | ☐ |
| 3R.8 | Skeleton boot (~580 ms) | Sem flash de hex; dark `/40` surface | ☐ |
| 3R.9 | Dark mode | Alternar tema; contraste WCAG razoável | ☐ |

---

## 3. Checklist — Sales (`/overview?tab=sales`)

| # | Teste | Resultado esperado | Status |
|---|-------|-------------------|--------|
| 3S.1 | Aba abre sem erro | KPI strip, market pulse, filtros | ✅ |
| 3S.2 | Título accent | Cor `accentTitleBlue` (token) | ☐ |
| 3S.3 | Chips status + toolbar (type/beds/sort) | Menu dark = `surfaceColumn` / `surfaceElevated` | ☐ |
| 3S.4 | Vista grid | Property cards: status, favorito, footer border | ☐ |
| 3S.5 | Vista list | Tabela dark surface; dots active/offer | ☐ |
| 3S.6 | Vista map | Canvas mapa fundo dark token | ☐ |
| 3S.7 | Share menu (hover card) | Facebook/WhatsApp/Instagram = brand tokens | ☐ |
| 3S.8 | Skeleton boot | Igual padrão Rentals | ☐ |
| 3S.9 | Sem regressão Deals | `tab=deals` kanban + Win Rate ainda OK | ☐ |

---

## 4. URLs rápidas

| URL | Uso |
|-----|-----|
| `http://localhost:3005/overview?tab=rentals` | Módulo Rentals |
| `http://localhost:3005/overview?tab=sales` | Módulo Sales |
| `http://localhost:3005/overview?tab=deals` | Regressão Deals |
| `http://localhost:3005/deals` | Kanban direto |

> **Rota overview:** no remoto, entrada típica é via dashboard executivo existente; WIP `pages/overview.tsx` é fatia **Anfitrião** separada (ver `BRIEF-OVERVIEW-ANFITRIAO-2026-11-13.md`).

---

## 5. Veredito

| Campo | Valor |
|-------|--------|
| Executado em | 13/11/2026 (Cursor browser, `:3005`, sessão autenticada) |
| Veredito global | 🟢 **VERDE parcial** (3R.1 + 3S.1 + navegação abas; restante manual) |
| Notas | Rentals: rent roll + calendário + 6 cards visíveis. Sales: grid 10 listagens + filtros + market pulse. |

---

## 6. Referências

- `docs/dev/SMOKE-CRM-DEALS-2026-11-13.md`
- `docs/dev/BRIEF-CRM-LINTEL-3C-2026-11-13.md`
- `docs/dev/CONTINUAR-CRM-DEALS-2026-11-13.md`
