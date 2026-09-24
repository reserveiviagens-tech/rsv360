# FASE 5 Inc1 — STAGING PREFLIGHT (gaps closure)

**Status:** `INC1_STAGING_PREFLIGHT_BLOCKED`  
*(≠ `INC1_STAGING_PREFLIGHT_PASS` — gaps não fechados)*  

**INC1_CI_PASS:** YES (mantido)  
**INC1_STAGING_MIGRATION_AUTHORIZED:** **NO**  
**Migration executed:** **NO**  
**Date:** 2026-09-22  
**Mission:** `INC1_STAGING_PREFLIGHT_GAPS_CLOSURE` (read-only; sem migrate/merge/dump)

**PR tip (CI PASS):** `1edc2bfb`  
**Migration commit:** `e5fbb302` (`0059_partner_domain`)  
**Repo:** `reserveiviagens-tech/rsv360`

---

## Scorecard (critério de PASS)

| Critério | Estado | Motivo em 1 linha |
|----------|--------|-------------------|
| **CODE_PROVENANCE** | **FAIL** | `0059` / tip **não** em `main`; **não** há SHA implantado comprovado em host staging |
| **STAGING_IDENTITY** | **FAIL** | CD dispara em `develop` mas branch **não existe**; zero runs; sem env GitHub `staging` |
| **DATABASE_TARGET** | **FAIL** | Sem `DATABASE_URL`/host staging inequívoco; secrets `STAGING_*` **ausentes** no repo |
| **BACKUP_READY** | **FAIL** | CD só backup de compose; sem `pg_dump`/snapshot comprovado do DB alvo |
| **ROLLBACK_READY** | **FAIL** | Rollback SQL Partner\* documentado, mas **restauração DB** sem backup válido não está pronta |
| **PRODUCTION_ISOLATION** | **FAIL** | Sem alvo staging vivo, **não** dá para provar `STAGING_DB ≠ PROD_DB` operacionalmente |

```text
INC1_STAGING_PREFLIGHT_PASS  →  NÃO EMITIDO
```

---

## 1. CODE_PROVENANCE — FAIL

| Pergunta | Evidência verificável |
|----------|------------------------|
| Repo | `origin` = `https://github.com/reserveiviagens-tech/rsv360.git` · PR [#389](https://github.com/reserveiviagens-tech/rsv360/pull/389) |
| Migration file | `backend/drizzle/0059_partner_domain.sql` |
| Commit da migration | `e5fbb302b07ca219593ab54ef46bf2842706c1f6` |
| Tip com CI PASS | `1edc2bfbe5ba8d1c516b96dad07e98292a3a2474` (ancestral do tip docs atual da branch) |
| Branch CD staging | Workflow: push/`workflow_run` em **`develop`** |
| Branch `develop` existe? | **NÃO** — API 404 |
| `e5fbb302` / `1edc2bfb` em `main`? | **NÃO** (`merge-base --is-ancestor` fail; ~10 commits ahead) |
| SHA implantado no host staging | **DESCONHECIDO** — zero deployments `staging`; zero runs `cd-staging.yml` |

**Conclusão:** PR aprovado ≠ código no staging. Sem merge forçado (proibido neste gate). Proveniência de deploy: **aberta**.

---

## 2. STAGING_IDENTITY — FAIL

| Aspecto | Evidência |
|---------|-----------|
| Workflow | `.github/workflows/cd-staging.yml` — job `deploy-staging` |
| Trigger | `push` + CI success em **`develop`** |
| Branch `develop` | **inexistente** → pipeline efetivamente **inerte** |
| Runs `cd-staging.yml` | **`[]`** (nenhum) |
| GitHub Environment `staging` | **Ausente** (só `production`, `NOTION_PAGE_ID`) |
| Secrets repo Actions | `GH_DEPENDABOT_TOKEN`, `METRICS_TOKEN`, `NOTION_*` — **sem** `STAGING_HOST` / `STAGING_USER` / `STAGING_SSH_KEY` / `STAGING_PATH` |
| Secrets env `production` | `PRODUCTION_HOST`, `PRODUCTION_USER`, `PRODUCTION_PATH`, `PRODUCTION_SSH_KEY` (nomes apenas) |
| `docker-compose.staging.yml` no repo | **Ausente** |
| URL placeholder no YAML | `https://staging.yourdomain.com` |
| Template docs | `.env.staging.example` cita `staging.reserveiviagens.com.br` / DB name `rsv360_staging_db` — **template, não prova live** |
| Stack local `rsv360-*` | Containers **up** neste host de trabalho — **não** autorizado como staging remoto substituto |

**Não assumido:** `develop` = staging · stack local = staging · qualquer `.env` local = staging.

---

## 3. DATABASE_TARGET — FAIL

| Check | Resultado |
|-------|-----------|
| Host/DB staging inequívoco | **NÃO identificado** |
| Credenciais lidas/expostas | **NÃO** (sem dump de secrets) |
| Prova de que o alvo ≠ produção | **Impossível** sem alvo |
| CD aplica migrate? | **NÃO** — só pull/up imagens; migrate = `backend` `npm run migrate` **manual/separado** |

---

## 4. BACKUP_READY — FAIL

| Mecanismo | Estado |
|-----------|--------|
| Backup no CD | Cópia de `docker-compose.staging.yml` → `backups/` — **não** é snapshot Postgres |
| `pg_dump` / volume snapshot | **Não executado** (proibido até alvo inequívoco) · **não** evidenciado |
| Validação de backup | **N/A** |
| Janela / responsável | **Não definido** para um alvo inexistente |

---

## 5. ROLLBACK_READY — FAIL (ops)

| Camada | Estado |
|--------|--------|
| App (Partner\* only) | Documentado no header de `0059` — DROP Partner\* ordem reversa |
| Revert PR | Possível enquanto migrate **não** aplicada no alvo |
| Restore DB pós-falha parcial | **Depende de BACKUP_READY** → **não pronto** |

Até backup+restore comprovados: **ROLLBACK_READY = FAIL** para fins de migrate real.

---

## 6. PRODUCTION_ISOLATION — FAIL

| Evidência | Interpretação |
|-----------|---------------|
| Template staging DB `rsv360_staging_db` vs compose prod `rsv360_prod` / `POSTGRES_DB` via env | Intenção de isolamento em docs — **não** prova live |
| Secrets `PRODUCTION_*` existem; `STAGING_*` **não** | Staging remoto **não** operacional via Actions deste repo |
| Este gate tocou produção? | **NÃO** — sem SSH prod, sem migrate, sem `pg_dump` |

**`STAGING_DATABASE != PRODUCTION_DATABASE`:** **não comprovável** sem staging vivo → gate permanece **BLOCKED**.

---

## 7. O que o Orquestrador precisa fornecer (para fechar)

Sem workaround de código. Itens humanos/ops:

1. **Declarar** o alvo staging oficial (host/stack) **ou** autorizar explicitamente um substituto (ex. lab) com escopo escrito.  
2. **Provisionar** CD/secrets/env `staging` **ou** documentar processo manual de deploy do SHA `e5fbb302`+ no host.  
3. **Comprovar** SHA implantado no host (ex. `git rev-parse` / image tag / health metadata).  
4. **Comprovar** identidade do DB (nome/host mascarados) ≠ produção.  
5. **Executar e validar** backup Postgres **antes** de qualquer migrate (fora deste agente até AUTHORIZED+alvo).  
6. Só então: `INC1_STAGING_PREFLIGHT_PASS` → gate separado `INC1_STAGING_MIGRATION_AUTHORIZED`.

---

## 8. Proibições respeitadas nesta missão

- Sem `npm run migrate` / sem aplicar `0059`  
- Sem merge para `main`  
- Sem cherry-pick/rebase de staging  
- Sem `pg_dump`/restore  
- Sem tocar produção  
- Sem Inc 2  
- Sem assumir develop/local como staging  

---

## 9. Veredito

```text
INC1_STAGING_PREFLIGHT_BLOCKED
```

Gaps **documentados com evidência**.  
`INC1_STAGING_PREFLIGHT_PASS` **não** emitido.  
`INC1_STAGING_MIGRATION_AUTHORIZED` **não** solicitado/concedido.

**PARAR.**
