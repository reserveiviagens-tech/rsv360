# FASE 4 — PLAN_REQUESTED

**Status:** PLAN_REQUESTED (sem execução / sem escrita de código de produto)  
**Fonte canônica:** `plano_rsv360.md` § FASE 4 — Runtime  
**Orquestrador:** aguardando VALIDATED (G4.0+) antes de EXECUTING  
**Data:** 2026-09-22

## Checkpoints congelados

| Fase | Branch | SHA | Conteúdo |
|------|--------|-----|----------|
| FASE 0 | `fix/auth-refresh-contract` | `c42222848bf27bfcb38e50faecbf979d5fe5c240` | auth refresh (paralela — G2.5/G3.5) |
| FASE 1 | `chore/fase1-safe-bumps` | `8dd5dd6b9d4b4d1c44c7015b4b2df09fa29d3478` | google-auth + docker actions |
| FASE 2 | `chore/fase2-node-setup-bumps` | `b8f328965c2852249729a04ab77486058b07b286` | setup-node v6 + Node 24 CI |
| FASE 3 | `chore/tailwind-v4` | `dc9a9fc9a45b89d04774bfad8b8c433354dfa619` | auditoria TW4 / Oxide |
| main | `origin/main` | `8c9efe9dd35dd925c9509d44713feca8e8e8aa8f` | baseline |

**FASE 0 permanece paralela.** Sem merge/cherry-pick/rebase nesta fase.

---

## 1. Objetivo exato

Conforme `plano_rsv360.md`:

> FASE 4 — Runtime  
> - Validar a versão de Node aprovada para produção no momento da execução  
> - Atualizar Dockerfiles  
> - Atualizar `engines.node` depois da validação  
> - Health check + smoke E2E + rollback  

### Realidade descoberta (read-only) — crítica para escopo

O runtime **canônico** do monorepo **já está em Node 24** (Trilha-0 T0.5 / ADR-0002):

| Artefato | Estado atual | Evidência |
|----------|--------------|-----------|
| `package.json` `engines.node` | `>=24.0.0 <25` | root |
| `.nvmrc` | `24` | presente |
| `docker/frontend/Dockerfile` | `node:24-alpine` (deps/builder/runtime) | 3× FROM |
| `docker/backend/Dockerfile` | `node:24-alpine` (deps/production) | 2× FROM |
| `backend/Dockerfile` | `node:24-alpine` (deps/runtime) | 2× FROM |
| Host local (esta sessão) | Node **v24.14.0** · npm 11.9.0 | `node -v` |
| HEALTHCHECK backend | `wget … http://localhost:3002/health` | ambos Dockerfiles backend |
| HEALTHCHECK frontend | script wget na `APP_PORT` | `docker/frontend/Dockerfile` |

**Consequência:** FASE 4 **não** deve reescrever Dockerfiles/`engines` sem evidência de drift. O objetivo operacional torna-se:

1. **Validar** que o Node aprovado para produção continua sendo **24.x** (LTS alinhado a ADR/CI).  
2. **Auditar** a matriz runtime canônica (Dockerfiles + engines + `.nvmrc`).  
3. **Executar** health check + smoke (build Docker e/ou route-smoke / health HTTP) com evidência.  
4. **Documentar** plano de rollback e residuais deliberadamente fora do escopo.  
5. Só **atualizar** Dockerfile/`engines` se a auditoria provar gap objetivo.

---

## 2. Branch proposta

| Campo | Proposta |
|-------|----------|
| Branch | `chore/fase4-node24-runtime` |
| Commit-base **recomendado** | `dc9a9fc9` (tip FASE 3) |
| Motivo | Continuidade da cadeia FASE 1→2→3→4 |
| Alternativa | `origin/main` @ `8c9efe9d` — Gate **G4.1** |

FASE 0 **fora** do base.

---

## 3. Relação com FASE 0–3

```text
origin/main
├── FASE 0  c4222284  (auth — paralelo)
└── FASE 1  8dd5dd6b
       └── FASE 2  b8f32896  (CI Node 24 workflows)
              └── FASE 3  dc9a9fc9  (TW4 audit)
                     └── FASE 4  chore/fase4-node24-runtime  [proposta]
```

| Fase | Relação com FASE 4 |
|------|-------------------|
| FASE 0 | Sem integração; auth intocada |
| FASE 1 | Independente (deps Actions) |
| FASE 2 | Complementar: CI apps já em Node 24; FASE 4 = **runtime/imagem/engines** |
| FASE 3 | Independente (CSS); base empilhada recomendada |

---

## 4. Arquivos potencialmente afetados

### Matriz canônica (IN — auditar; alterar só com evidência)

| Path | Papel |
|------|-------|
| `docker/frontend/Dockerfile` | imagem Next apps |
| `docker/backend/Dockerfile` | imagem backend monorepo |
| `backend/Dockerfile` | imagem backend alternativa |
| `package.json` (`engines.node`) | contrato engines root |
| `.nvmrc` | pin local |
| `.agents/shared/*` | PLAN / MATRIX / HANDOFF / evidência |
| `docs/evidence/…` (opcional) | carimbo T0.5-style se Orquestrador pedir |

### Residuais conhecidos (OUT por default — Gate G4.2)

| Path | Estado | Decisão proposta |
|------|--------|------------------|
| `apps/turismo/pages/reservei/**` (engines `>=18`, compose locais) | legado aninhado | **Não migrar** nesta FASE 4 (espelha G3.2) |
| `test-compose.yml` (untracked) | fora do git | **Não tocar** |
| Untracked `Aruanda2.md`, `PROTOCOLO-*` | preservados | **Não tocar** |

### Fora do escopo (lista fechada)

- Auth / FASE 0  
- Remigração TW4 / FASE 3  
- Bumps CI `setup-node` (FASE 2 fechada)  
- FASE 5 (hardening/negócio)  
- Deploy produção / auto-merge  
- Editar `.env` / secrets  
- Migrations destrutivas  

---

## 5. Dockerfiles / engines envolvidos

| Artefato | Ação padrão FASE 4 |
|----------|-------------------|
| 3 Dockerfiles canônicos `node:24-alpine` | **Auditoria + build smoke**; sem rewrite se já 24 |
| `engines.node` `>=24.0.0 <25` | **Validar**; sem bump preventivo |
| `.nvmrc` = `24` | **Validar** |
| HEALTHCHECK já presentes | **Exercitar** (HTTP health / compose build) |

**Versão Node aprovada proposta (sujeita a G4.0):** **24.x** (LTS), coerente com ADR-0002, T0.5, CI root e FASE 2.

---

## 6. Análise de impacto (Node / runtime / build)

| Mudança | Impacto | Risco |
|---------|---------|-------|
| Reabrir Dockerfiles sem gap | Alto blast; churn desnecessário | **Evitar** |
| `docker build` backend + 1 frontend | Validação real Oxide/npm/Node 24 na imagem | Médio (tempo/CI local) |
| Alterar `engines` para faixa mais estreita (ex. `=24`) | Quebra hosts/CI fora do pin | Médio — só com evidência |
| Tocar compose/engines do `reservei` | Escopo creep | Alto — default OUT |
| Health fail por env/JWT | Falso negativo de runtime | Médio — documentar pré-requisitos |

---

## 7. Dependências

- FASE 3 CLOSED (`dc9a9fc9`) — OK  
- Docker disponível no host do Executor (para build smoke)  
- Decisão G4.1 (base) e G4.2 (reservei/runtime legado OUT)  
- **Não** depende da FASE 0  

---

## 8. Riscos

1. Transformar auditoria em “upgrade oportunista” de alpine tag / npm / multi-stage.  
2. Smoke E2E completo demais (FASE 5 C5) infiltrando FASE 4.  
3. Falha de health por secrets/env (JWT) confundida com falha de Node.  
4. Build Docker longo / flaky tratado como regressão de escopo.  
5. Integrar FASE 0 “já que estamos fechando runtime”.  

---

## 9. Estratégia de compatibilidade

1. **Fonte de verdade:** `engines.node` root + Dockerfiles canônicos + ADR-0002.  
2. **CI vs runtime:** FASE 2 alinhou workflows de app; FASE 4 confirma imagens.  
3. **Semântica:** permanência de residual `reservei`/engines 18 **não** é falha da FASE 4 se documentada OUT (mesmo critério da FASE 3).  
4. **Atualizar só com gap:** se auditoria achar `node:22`/`engines` desalinhado no canônico → patch mínimo + evidência.  
5. **Rollback:** reverter commit da FASE 4; imagens anteriores `node:24-alpine` (ou tag pré-patch); não reabrir FASE 0–3.

---

## 10. Baseline necessário (antes de editar)

1. Branch/base confirmados (`dc9a9fc9` ou alternativa G4.1).  
2. Matriz FROM/`engines`/`.nvmrc` reconfirmada (já acima).  
3. `node -v` / `npm -v` no host.  
4. `docker version` (ou documentar bloqueio se Docker indisponível).  
5. Inventário HEALTHCHECK + endpoint `/health`.  
6. Classificar residuais OUT **antes** de qualquer patch.

---

## 11. Testes / validações previstos

| ID | Validação |
|----|-----------|
| V1 | Grep: zero `node:18|20|22` nos 3 Dockerfiles canônicos |
| V2 | `engines.node` = `>=24.0.0 <25`; `.nvmrc` = `24` |
| V3 | `docker build` backend (`docker/backend/Dockerfile` ou `backend/Dockerfile`) exit 0 |
| V4 | `docker build` frontend mínimo (ex. `APP_DIR=apps/site-publico`) exit 0 **ou** FAIL documentado (env/args) |
| V5 | Health: container ou processo responde `/health` (backend) conforme HEALTHCHECK |
| V6 | Smoke leve: route-smoke local **ou** HTTP smoke das rotas estáveis (não suíte E2E FASE 5) |
| V7 | type-check/build de pelo menos 1 app canônico **sem** `.next` (controle regressão) |
| V8 | `git diff --check`; file-list revisado |
| V9 | Documento de rollback no HANDOFF/MATRIX |

---

## 12. Critérios objetivos

### PASS
- Node produção aprovado = **24.x** com evidência  
- Matriz canônica Docker/engines/`.nvmrc` coerente com 24  
- Health + smoke previstos executados (ou bloqueio de ambiente documentado sem mascarar)  
- Residuais OUT documentados (não contam como falha)  
- FASE 0 intacta; untracked preservados; sem FASE 5  
- Sem alteração de produto além do autorizado por gap  

### NEEDS_REWORK
- Diff fora da lista / creep para reservei/auth/TW/FASE 5  
- Regressão de build Docker causada por mudança desta fase  
- “Atualização” cosmético de Dockerfile sem evidência  
- Health/smoke falho **causado** pelo patch e não documentado  

### VALIDATED
- Orquestrador revisa evidências (G4.6)  
- Autoriza commit/push  

---

## 13. Estratégia de commit/push

1. Só após plano VALIDATED + execução VALIDATED.  
2. Cenário A (só auditoria, espelho FASE 3):  
   `docs(audit): validate Node 24 runtime Dockerfiles and engines`  
3. Cenário B (gap real corrigido):  
   `chore(runtime): align canonical Node 24 Docker/engines`  
4. Push da branch `chore/fase4-node24-runtime`.  
5. **STOP** — sem FASE 5; sem merge FASE 0.  

---

## 14. Pontos de STOP do Orquestrador

| Gate | Pergunta |
|------|----------|
| **G4.0** | Aprovar este plano? |
| **G4.1** | Base = FASE 3 tip `dc9a9fc9` ou `origin/main`? |
| **G4.2** | Residuais `reservei`/engines 18 = OUT (recomendado) ou IN? |
| **G4.3** | Escopo = auditoria-first (sem rewrite se já 24) **ou** forçar pin/retag? |
| **G4.4** | Smoke Docker obrigatório nesta máquina (backend + frontend) ou backend-only se tempo/Docker limitar? |
| **G4.5** | E2E: smoke HTTP/health apenas, ou também `route-smoke` workflow? |
| **G4.6** | Pós-execução: VALIDATED → commit/push? |
| **G4.7** | Integração FASE 0 (default: permanece paralela) |

### Recomendação do Executor (não vinculante)

- **G4.1:** base `dc9a9fc9`  
- **G4.2:** OUT  
- **G4.3:** auditoria-first (espelho FASE 3)  
- **G4.4:** backend + 1 frontend (`site-publico`) se Docker OK  
- **G4.5:** health HTTP + smoke leve; **não** suíte C5 da FASE 5  

---

## 15. Estado solicitado

```text
FASE 4 — PLAN_REQUESTED
(não EXECUTING)
```

**Nenhuma alteração de código de produto da FASE 4 foi feita nesta mensagem.**
