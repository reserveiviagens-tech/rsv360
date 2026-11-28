# Brief Opção 3c — Lintel Sales/Rentals polish (13 nov 2026)

## Objetivo

Eliminar `#hex` hardcoded nos componentes auxiliares de **Sales** e **Rentals** que ficaram fora das fatias 3a/3b, centralizando em `LINTEL_SALES_TW` / `LINTEL_RENTALS_TW` + `LINTEL_THEME_TOKENS` (`lintel-theme.ts`).

## Escopo desta PR

| Área | Ficheiros |
|------|-----------|
| Sales polish | `sales-toolbar-select`, `sales-skeleton`, `sales-map-view`, `sales-listing-share-menu` |
| Rentals polish | `lease-calendar-panel`, `rent-roll-chart`, `rentals-skeleton`, `rentals-panel-expand` |
| Tokens | `lintel-theme.ts` (brand share, chart track, extensões TW) |

## Fora do escopo

- `pages/overview.tsx` WIP Anfitrião
- Deals / kanban (`globals.css` já tratado na #517)
- Cores de marca social continuam em tokens (`brandFacebook`, etc.) — não em componentes

## Critérios de aceitação

- `rg '#[0-9a-fA-F]' apps/turismo/components/sales apps/turismo/components/rentals` → **só** `lintel-theme.ts` (se existir ficheiro partilhado fora, documentar)
- Smoke visual: abas `tab=sales` e `tab=rentals` (mapa, share, calendário, rent roll, skeletons)
- PR dedicada → gate CI (NPM Audit fora do escopo)

## Risco

Baixo — CSS/classes apenas.
