# Brief — Overview Anfitrião

**Atualizado:** 13/11/2026 (pós **#521** Overview P0)

---

## P0 entregue (`develop`)

| Item | Estado |
|------|--------|
| `pages/overview.tsx` + hooks `useOverviewPortfolioUnits` / `useOverviewCarteiraVinculos` | ✅ #521 |
| Libs `overview-contacts` / `overview-portfolio` | ✅ |
| Integração `RSV360ExecutiveDashboard` (comissões, carteira, mapa) | ✅ |
| Smoke CRM Sales/Rentals + rotas parceiro | ✅ #524–#528 |

---

## P1 (esta fatia)

1. **Resiliência:** banner de erro no Overview quando carteira/portfolio API falha (sem vazar PII). — **Implementado** em `pages/overview.tsx` (`role="alert"`, mensagem genérica; oculto em demo comissão Lintel).
2. **Demo vs real:** manter `shouldUseLintelCommissionDemo` — não regressão Lintel vídeo.
3. **P2 (23/11):** abas **Leads** (`leadsInboxSource`) e **Contacts** (`carteiraContactsSource`) — badge **API** + fallback demo com aviso; pipeline contacts usa `leadsApi.list`.
4. **P3 (23/11):** KPIs do cabeçalho da aba **Leads** via `resolveOverviewLeadHeaderKpis` quando `leadsInboxSource === 'api'` (demo mantém valores Lintel).
5. **P4 (24/11):** Aba **Rentals** (`?tab=rentals`) — portfólio via `unidadesToRentalPortfolio` + badge **API** / fallback demo (smoke **H8**).

---

## Rotas parceiro

| Rota | Comportamento |
|------|----------------|
| `/overview` | Cockpit principal |
| `/rentals` | Redirect `?tab=rentals` (#525) |
| `/leads`, `/contacts` | Páginas standalone Lintel (#527–#528) |
| `/deals` | Kanban |

---

## Risco

Auth/RBAC/LGPD — patch pequeno; review humana.
