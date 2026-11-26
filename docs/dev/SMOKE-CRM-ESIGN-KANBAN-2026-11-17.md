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
| K3a | Script automatizado | `npm run smoke:crm-deals-persistence` — POST + PATCH `offer` + GET confirma estágio |
| K4 | `docker compose restart backend` + GET deals | Deal mantém estágio (smoke persistência) |
| K4a | Script pós-restart | `npm run smoke:crm-deals-persistence:k4` (usa estado em `%TEMP%` ou `SMOKE_DEAL_ID`) |
| K4b | Restart + verify num comando | `SMOKE_K4_RESTART=1` + `npm run smoke:crm-deals-persistence` (host com Docker) |

Persistência deals:

```powershell
# Login automático (admin dev) se SMOKE_BEARER omitido — igual rental-sign smoke
$env:SEED_TEST_USER_PASSWORD="dev-only-fallback-do-not-use-in-prod"
# K3a
npm run smoke:crm-deals-persistence
docker compose restart backend
# K4a
npm run smoke:crm-deals-persistence:k4
```

Atalho K4b (reinicia backend automaticamente):

```powershell
$env:SMOKE_K4_RESTART="1"
$env:SMOKE_BEARER="<jwt>"
npm run smoke:crm-deals-persistence
```

Requisitos K4: `DEALS_PERSISTENCE=postgres` e `DATABASE_URL` no container backend (ver `CRM-FASE3-PERSISTENCIA-2026-11-17.md`).

## Validação CI local (rápida)

```powershell
npm run test --workspace=backend -- --testPathPattern="rental-sign|deals-" --forceExit
npm run build -w apps/turismo
```

## Próxima fatia sugerida (P1)

- Envio de e-mail com link (adapter, sem PII em logs)
- Expiração / revogação de pedido
- Mascarar CPF na listagem parceiro