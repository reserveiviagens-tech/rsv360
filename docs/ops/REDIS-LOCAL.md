# Redis local — RSV360

## Pré-requisito

Docker Desktop precisa estar **em execução** (ícone na bandeja). Sem o daemon, `docker run` falha.

Login do Turismo também exige **Postgres** em `127.0.0.1:5433` (`rsv360-postgres`). Sem DB, `/api/v1/auth/login` não autentica usuários.

```bash
# na raiz do monorepo rsv360
docker compose up -d postgres
# ou stack mínima:
docker compose up -d postgres redis
```

## Estado atual (dev local)

Com Docker Desktop + container `rsv360-redis` (ou `docker compose up -d redis`):

```env
REDIS_DISABLED=false
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
```

Boot esperado: `[BOOT] LLM gateway Redis budget ✓` + workers BullMQ registrados.

## Modo sem Redis (dev / smoke UI)

No `backend/.env`:

```env
REDIS_DISABLED=true
REDIS_ENABLED=false
```

Rate-limit (dev), LLM budget, caches e workers BullMQ usam memória / omitem fila. Backend sobe em `:3002` sem container Redis.

```powershell
cd backend
$env:PORT='3002'; $env:REDIS_DISABLED='true'; $env:REDIS_ENABLED='false'; npm run dev
```

## Redis oficial (Docker) — passo rápido

```bash
docker run -d --name rsv360-redis -p 6379:6379 redis:alpine
```

Verificar:

```bash
docker ps
docker exec -it rsv360-redis redis-cli ping
```

Esperado: `PONG`.

Depois no `backend/.env`:

```env
REDIS_DISABLED=false
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
```

Reinicie o backend (`PORT=3002 npm run dev` no workspace `backend`).

Parar / remover:

```bash
docker stop rsv360-redis
docker rm rsv360-redis
```
