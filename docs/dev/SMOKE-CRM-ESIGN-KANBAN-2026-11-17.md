# Smoke — E-sign locações + Kanban DnD (17 nov 2026)

> Pós-merge **#546** (e-sign) e **#547** (`@dnd-kit`). Base: `develop` com migration **0068**.

## Pré-requisitos

```powershell
docker compose up -d postgres redis backend turismo
docker compose exec backend npm run migrate
# Após pull com UI nova:
docker compose build turismo && docker compose up -d turismo
```

Login parceiro (manual UI): `http://localhost:3005/login` — ver `CONTINUAR-CRM-DEALS-2026-11-13.md`.

## API automatizada

```powershell
node scripts/smoke-crm-rental-sign.mjs
```

Opcional: `SMOKE_BEARER=<jwt>` se já tiver token. **Não** logar `signingToken` completo em PRs.

Cobre: health → `POST sign-request` → GET público view/PDF → `POST complete` → `GET sign-requests`.

## Manual — Cockpit locações (e-sign)

| # | Passo | Esperado |
|---|--------|----------|
| E1 | Overview → Locações → unidade → aba **Contratos** | Modal / lista de pedidos |
| E2 | Criar pedido de assinatura (nome, e-mail, datas) | Link copiado ou exibido (`/rentals/sign?requestId=&token=`) |
| E3 | Abrir link em aba anônima | Página pública, PDF visível, checkbox aceite |
| E4 | Assinar | Estado **signed**; volta ao cockpit com badge |
| E5 | Tentar link de novo | Mensagem de já assinado ou view `signed` |
| E6 | Botão **Histórico** na solicitação | Timeline: created, email_skipped/sent, viewed, signed (IP mascarado) |
| E7 | Webhook pós-assinatura | Com `RENTAL_SIGN_WEBHOOK_URL` + `RENTAL_SIGN_WEBHOOK_SECRET` no backend; após E4 evento **webhook_delivered** ou replay `POST …/sign-requests/:id/webhook/replay?unitId=` |
| E8 | Export auditoria (admin) | Login **admin/manager** → Histórico → **Exportar CSV/JSON** ou `GET …/admin/sign-audit/export?unitId=&requestId=` |
| E8b | Rate limit export | Acima do teto (`RENTAL_SIGN_AUDIT_EXPORT_RATE_MAX`, default 30/15min por user) → **429** |
| E7b | Métricas webhook | `GET …/admin/sign-webhook/metrics` (admin/manager) — contadores delivered/failed/skipped |

Variáveis (backend, **não** commitar valores):

- `RENTAL_SIGN_WEBHOOK_URL` — HTTPS do receptor (ex.: request bin de lab)
- `RENTAL_SIGN_WEBHOOK_SECRET` — HMAC SHA-256 (`X-RSV-Timestamp` + `X-RSV-Signature: v1=…`)

## Manual — Deals Kanban (DnD)

| # | Passo | Esperado |
|---|--------|----------|
| K1 | `/overview?tab=deals` ou módulo Deals | Colunas por estágio |
| K2 | Arrastar card entre colunas | Overlay suave; card na nova coluna |
| K3 | Refresh (F5) | Estágio persiste (`DEALS_PERSISTENCE=postgres` no Docker) |
| K4 | `docker compose restart backend` + GET deals | Deal mantém estágio (smoke persistência) |

Persistência deals:

```powershell
$env:SMOKE_BEARER="<jwt>"
node scripts/smoke-crm-deals-persistence.mjs
```

## Validação CI local (rápida)

```powershell
npm run test --workspace=backend -- --testPathPattern="rental-sign|deals-" --forceExit
npm run build -w apps/turismo
```

## Próxima fatia sugerida (P1)

- Envio de e-mail com link (adapter, sem PII em logs)
- Expiração / revogação de pedido
- Mascarar CPF na listagem parceiro