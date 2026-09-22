# FASE 4 — Matriz Runtime Node 24 (auditoria)

**Branch:** `chore/fase4-node24-runtime`  
**Base:** `dc9a9fc9a45b89d04774bfad8b8c433354dfa619`  
**Modo:** G4.3 auditoria-first · G4.2 reservei OUT  
**Data:** 2026-09-22

## Critério desta fase

Validar runtime Node **24** canônico (DECLARADO → CONSTRUÍDO → EXECUTADO → HEALTH → SMOKE).  
**Não** é critério reescrever Dockerfiles/`engines` já corretos.  
Residual `reservei` OUT ≠ falha.

---

## 1. DECLARADO

| Artefato | Valor | Status |
|----------|-------|--------|
| `docker/backend/Dockerfile` | `FROM node:24-alpine` (deps + production) | OK |
| `backend/Dockerfile` | `FROM node:24-alpine` (deps + runtime) | OK |
| `docker/frontend/Dockerfile` | `FROM node:24-alpine` (deps + builder + runtime) | OK |
| Grep `node:18\|20\|22` nos 3 canônicos | **zero** matches | OK |
| `package.json` `engines.node` | `>=24.0.0 <25` | OK |
| `.nvmrc` | `24` | OK |
| Host `node -v` | `v24.14.0` | coerente com faixa |
| HEALTHCHECK backend | `wget … :3002/health` | declarado |
| HEALTHCHECK frontend | script wget `APP_PORT` | declarado |

**Coerência declarado:** Dockerfiles + engines + `.nvmrc` alinhados a **Node 24**.  
**Ação de código:** nenhuma (sem rewrite).

---

## 2. CONSTRUÍDO

| Imagem | Comando | Exit | Nota |
|--------|---------|------|------|
| `rsv360/backend:fase4-audit` | `docker build -f docker/backend/Dockerfile -t rsv360/backend:fase4-audit .` | **0** | sha256:038048f8… |
| `rsv360/site-publico:fase4-audit` | `docker build -f docker/frontend/Dockerfile` + `APP_DIR=apps/site-publico` + URLs locais | **0** | sha256:4a22b4f8… |

`backend/Dockerfile` (raiz): **não rebuild** nesta execução — FROM idêntico a `docker/backend`; declaração auditada; build canônico = `docker/backend`.

---

## 3. EXECUTADO (Node dentro da imagem/container)

| Alvo | Como | Node efetivo | Status |
|------|------|--------------|--------|
| backend image | `docker run --rm --entrypoint node … -v` | **v24.21.0** | PASS |
| frontend image | idem | **v24.21.0** | PASS |
| backend container app (1ª passagem) | `docker run` isolado + JWT placeholder | exit por `DATABASE_URL is required` | parcial |
| backend compose em execução (G4.6) | `docker exec rsv360-backend node -v` | **v24.21.0** · Status **healthy** | PASS |
| frontend container app | `docker run -p 3113:3000` + JWT placeholders | Up (healthy) · Next Ready | PASS |

**Não inferido:** versão Node não foi assumida só do Dockerfile; medida via `node -v` na imagem.

---

## 4. HEALTH

| Alvo | Resultado | Evidência |
|------|-----------|-----------|
| Backend `GET /health` (auditoria isolada prévia) | **NOT_EXECUTED** na 1ª passagem | container efêmero sem `DATABASE_URL` (sem `.env`) |
| Backend `GET http://127.0.0.1:3002/health` (gate G4.6) | **PASS** HTTP **200** | stack compose existente `rsv360-backend` healthy; body `status:OK` (sem secrets) |
| Frontend Docker HEALTHCHECK | **PASS** | container reportou **healthy** |

### Estratégia DB (G4.6) — sem secrets

| Campo | Valor |
|-------|-------|
| Fonte | Infra **já prevista**: `docker-compose.yml` postgres + backend |
| Abordagem | Reutilizar stack **já Up (healthy)** no host (`rsv360-postgres`, `rsv360-backend`) |
| `.env` | **não lido** / **não copiado** / **não logado** |
| Credenciais | não inventadas; não impressas |
| Cleanup | stack do owner **não** destruída (não criada por esta fatia) |

---

## 5. SMOKE

| Alvo | Resultado | Evidência |
|------|-----------|-----------|
| Frontend `GET /` (imagem fase4-audit) | **PASS** HTTP **200** · ~89KB | passagem anterior |
| Backend smoke mínimo `GET /health` | **PASS** HTTP **200** | mesma evidência do health G4.6 |

---

## 6. Type-check

| Workspace | Sem `.next` | Exit |
|-----------|-------------|------|
| `apps/site-publico` | sim | **0** |
| `backend` | — | **NO_SCRIPT** (sem `type-check` no package) |

---

## 7. Residual OUT (G4.2)

| Path | Estado | Decisão |
|------|--------|---------|
| `apps/turismo/pages/reservei` | TW3 + nested `engines.node >=18` | **OUT** — não migrado; permanência ≠ falha FASE 4 |

---

## 8. Rollback (documentado — não executado)

1. Se houvesse commit de alteração canônica: `git revert` do commit FASE 4.  
2. Imagens: remover tags `rsv360/*:fase4-audit` ou retag para digest anterior.  
3. Como **nenhum** Dockerfile/`engines` foi alterado, rollback de código = **N/A** (só limpeza de imagens locais de auditoria).  
4. Não executar rollback destrutivo só para evidência.

```text
docker rm -f rsv360-fase4-backend rsv360-fase4-sp 2>/dev/null
docker rmi rsv360/backend:fase4-audit rsv360/site-publico:fase4-audit  # opcional
```

---

## 9. Código de produto alterado

**Nenhum.** Somente evidência `.agents/shared/*`.
