# Troubleshooting — login local Turismo + backend :3002

## Sintomas

| Sintoma | Camada | Causa provável |
|---------|--------|----------------|
| `Connection was reset` em `/health` | Infra | Backend não escuta na 3002 (crash boot, Redis parado, Docker WSL) |
| `Failed to fetch` / `ERR_EMPTY_RESPONSE` no login | Rede | Browser chama `:3002` direto ou backend down |
| `Credenciais inválidas` | Auth/DB | Senha admin apagada por re-seed antigo (corrigido no seed atual) |
| POST `:3005/api/v1/...` → 404 | Front Docker | Imagem Turismo antiga sem proxy — usar `npm run dev` ou rebuild |

## O que mudou nos últimos dias (repo)

1. **Seed** — não zera mais `password` do `admin@rsv360.com.br` no re-seed; script `set-admin-dev-password.ts`.
2. **Turismo** — same-origin API (`resolveApiBaseUrl`, shim `public/rsv360-same-origin-api.js`, proxy `/api/v1`).
3. **Redis parado** (Docker Desktop) — stack “funcionava ontem” até reinício manual ou falta de memória.

## Reparo recomendado (uma linha)

```powershell
cd "C:\Users\RSV 360\Documents\rsv360"
Set-ExecutionPolicy -Scope Process Bypass -Force
.\scripts\repair-rsv360-local-stack.ps1
```

Ordem interna: validar `.env` → subir **Redis/Postgres** → **restart backend** → `/health` 200 → senha admin dev → **Next dev :3005**.

## Se `/health` continua reset

1. Docker Desktop → **Redis Running** → **Restart backend**.
2. `docker logs rsv360-backend --tail 50` — procurar `[INIT] Failed` ou `JWT_SECRET`.
3. `.env`: `JWT_SECRET` com ≥32 caracteres (não `CHANGE_ME_*`).
4. Senha Postgres vs volume: `.\scripts\sync-postgres-docker-dev.ps1` (doc no script).
5. Reiniciar **Docker Desktop** (port-forward Windows/WSL).

## Login após stack OK

- URL: `http://localhost:3005/login` (hard refresh Ctrl+Shift+R).
- Network deve mostrar **`localhost:3005/api/v1/auth/login`**, não `:3002`.
- Admin dev: `admin@rsv360.com.br` / `dev-only-fallback-do-not-use-in-prod`.

## Validação

```powershell
curl.exe -s -w "`nHTTP:%{http_code}`n" http://127.0.0.1:3002/health
curl.exe -s -w "`nHTTP:%{http_code}`n" -X POST http://127.0.0.1:3005/api/v1/auth/login -H "Content-Type: application/json" -d "{\"email\":\"x\",\"password\":\"y\"}"
```

Esperado: health **200**; login senha errada **401** (não 404/000).
