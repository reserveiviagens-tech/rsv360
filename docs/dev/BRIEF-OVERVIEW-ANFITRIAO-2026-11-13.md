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

1. **Resiliência:** banner de erro no Overview quando carteira/portfolio API falha (sem vazar PII).
2. **Demo vs real:** manter `shouldUseLintelCommissionDemo` — não regressão Lintel vídeo.
3. **Próximo backlog P2:** API leads/contacts reais; substituir demo nas abas do dashboard.

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
