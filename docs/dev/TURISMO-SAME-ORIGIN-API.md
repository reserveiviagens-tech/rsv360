# Turismo — same-origin API (`:3005`)

## Objetivo

O browser chama `http://localhost:3005/api/v1/*` (sem CORS para `:3002`). O Next repassa para o backend (`INTERNAL_API_URL=http://backend:3002` no Docker).

## Componentes

| Peça | Ficheiro |
|------|----------|
| Proxy BFF | `apps/turismo/pages/api/v1/[...path].ts` |
| Base URL cliente | `resolveApiBaseUrl()` em `src/lib/auth-v1.ts` |
| Shim bundles antigos | `public/rsv360-same-origin-api.js` + `_document.tsx` |

## Dev local

```powershell
cd "C:\Users\RSV 360\Documents\rsv360"
docker compose build backend turismo
docker compose up -d backend turismo
```

Validação: Network no login deve mostrar `localhost:3005/api/v1/auth/login` (não `:3002`).

Alternativa: `.\scripts\dev-turismo-local.ps1` (Next dev + backend Docker).

## Env

- Container: `INTERNAL_API_URL` já vem de `x-app-env` no `docker-compose.yml`.
- `apps/turismo/.env.local` — copiar de `.env.local.example`.
