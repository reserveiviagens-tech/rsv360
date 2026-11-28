# Handoff — CRM / Overview / Lintel (atualizado 26 nov 2026)

> **Retomar:** `PLANO-EXECUCAO-RESTANTE-2026-11-26.md` + `HANDOFF-CONTINUACAO-2026-11-26.md` + smokes abaixo.

## develop (fonte de verdade)

| Item | Valor |
|------|--------|
| **HEAD** | **`e057f790`** — pós **#602** Next 16.4.6 (ver handoff continuação) |
| **Overview Anfitrião** | P4/P5/P5+ Sales ✅ #590–#591, #599; E2E H8/H9 ✅ #600 |
| **Segurança** | #598 audit, #601 nodemailer 10, #602 Next 16.4.6 |

### CRM / Deals (estado funcional)

| Área | Status |
|------|--------|
| Hub overview `tab=deals\|leads\|contacts\|rentals\|sales` | ✅ |
| Persistência Postgres `crm_deals` | ✅ backend + scripts K3a/K4 |
| Kanban DnD UI | ✅ #547 |
| Modal pipeline 2.3.3 | **Parcial** — UI clique OK; **Fatia B:** persistência UI não revalidada |
| E2E Playwright Kanban | **Não implantado** — gate para Fatia B |

### PRs relevantes (histórico recente)

| PR | Escopo |
|----|--------|
| #588 | Proxy dev `/api/v1` → backend |
| #563–#572 | Hub leads/contacts, convert deal |
| #576–#579 | Drizzle journal, K3a/K4 smoke scripts, H7b |
| #590–#591, #599–#600 | Overview rentals/sales + E2E |

## Smoke (fonte)

| Doc | Uso |
|-----|-----|
| `SMOKE-CRM-DEALS-2026-11-13.md` | 2.1–2.5 deals; **2.3.3 Fatia B pendente** |
| `SMOKE-CRM-ROUTES-LEADS-CONTACTS-2026-11-13.md` | H1–H9 hub |
| `SMOKE-CRM-ESIGN-KANBAN-2026-11-17.md` | E1–E8 e-sign; K1–K4b Kanban |
| `CRM-FASE3-PERSISTENCIA-2026-11-17.md` | Postgres deals |

### Scripts automatizados

```powershell
npm run smoke:crm-deals-persistence      # K3a API
npm run smoke:crm-deals-persistence:k4   # K4 pós-restart
$env:SMOKE_BEARER="<jwt-admin-dev>"
```

## Ambiente

| Item | Nota |
|------|------|
| Turismo | `next dev :3005` ou Docker — **rebuild** após #600–#602 |
| Auth | `docs/cotacao/TROUBLESHOOTING-LOGIN-LOCAL.md` |
| E2E overview | `npm run test:e2e:overview-portfolio` |

## Backlog (ordem)

1. **Fatia B** — E2E Kanban persistência + fechar 2.3.3 (`PLANO-EXECUCAO-RESTANTE-2026-11-26.md`)
2. E2E rotas CRM (H1/H7) — após Fatia B ou em paralelo
3. Audit follow-up (Zod 4, sharp) — PRs chore separadas

## Gate enterprise

- Sem Fatia B sem repro Playwright documentado
- Sem auto-merge

## Prompt Cursor

> Pull `develop` @ `e057f790`. Plano: `PLANO-EXECUCAO-RESTANTE-2026-11-26.md`. Fase 2: PACR Kanban B.