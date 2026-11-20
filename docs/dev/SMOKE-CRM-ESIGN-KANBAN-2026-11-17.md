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