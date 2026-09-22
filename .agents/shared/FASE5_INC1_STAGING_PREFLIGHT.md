# FASE 5 Inc1 — STAGING PREFLIGHT (read-only)

**Status:** `INC1_STAGING_PREFLIGHT_COMPLETE` — **migration NOT executed**  
**Awaiting:** `INC1_STAGING_MIGRATION_AUTHORIZED` (humano)  
**Date:** 2026-09-22  
**CI gate:** `INC1_CI_PASS` (human)  
**PR tip reviewed:** `1edc2bfb`  

---

## 1. Identity checklist

| Item | Resultado | Evidência |
|------|-----------|-----------|
| Repositório | **PASS** — `reserveiviagens-tech/rsv360` | `git remote` = `https://github.com/reserveiviagens-tech/rsv360.git`; PR #389 no mesmo repo |
| Não confundir com | `reserveiviagens-tech/RSV360-Versao-Oficial-definitivo` | Repo **diferente** (private); **não** é destino do PR #389 |
| PR | **PASS** — #389 OPEN, MERGEABLE | `feat/fase5-partners-inc1` → `main` |
| Tip | **PASS** — `1edc2bfbe5ba8d1c516b96dad07e98292a3a2474` | headRefOid == local HEAD |
| Migration alvo | **PASS** — `backend/drizzle/0059_partner_domain.sql` | Journal idx 59; CREATE-only (sem `ALTER`/`DROP` ativo no SQL) |
| CREATE-only / sem legado | **PASS** | Só `CREATE TABLE IF NOT EXISTS` Partner\*; rollback DROP só Partner\* no **header** |

---

## 2. Ambiente de staging — identidade e proveniência

| Item | Resultado | Evidência / gap |
|------|-----------|-----------------|
| Workflow CD | `.github/workflows/cd-staging.yml` | Trigger: push / CI success em branch **`develop`** (não `main`, não PR #389) |
| Runs recentes CD staging | **NENHUM** listado | `gh run list --workflow=cd-staging.yml` → `[]` |
| Environment GitHub `staging` | **AUSENTE** no repo | Environments: `production`, `NOTION_PAGE_ID` — URL placeholder no YAML: `https://staging.yourdomain.com` |
| `docker-compose.staging.yml` no repo | **AUSENTE** | Glob = 0 arquivos; CD assume arquivo no servidor (`STAGING_PATH`) |
| Tip `1edc2bfb` em `main`? | **NÃO** | `merge-base --is-ancestor` fail — tip **só** na branch do PR |
| Tip implantado em staging remoto? | **NÃO COMPROVADO** | Sem run CD; tip não merged; sem acesso a secrets `STAGING_*` neste preflight |

### Interpretação

Há **dois conceitos** de “staging” no monorepo:

1. **CD remoto** (workflow) — host via secrets; imagens GHCR; **não** executa `npm run migrate` no script atual.  
2. **Stack local** (docs `T1.*-STAGING-SMOKE`) — compose `rsv360` / Postgres local — **não** é automaticamente o mesmo que CD remoto.

**Antes de autorizar migration:** o humano deve declarar qual alvo é o staging oficial desta FASE 5:

- (A) Postgres do host CD (`STAGING_HOST` / `DATABASE_URL` no servidor), **após** código `0059` estar deployado nesse host; **ou**  
- (B) Stack local explícito (ex.: `rsv360-postgres` :5433) tratado como staging efêmero/controlado; **ou**  
- (C) Outro `DATABASE_URL` documentado.

Sem essa declaração, **não** executar.

---

## 3. Mecanismo oficial de migration

| Item | Valor |
|------|-------|
| Comando | `cd backend && npm run migrate` → `node scripts/migrate.mjs` |
| Engine | Drizzle migrator (`drizzle-orm/node-postgres/migrator`) |
| Folder | `backend/drizzle/` (inclui `0059_partner_domain.sql` + journal) |
| Requisito | `DATABASE_URL` apontando **somente** ao Postgres de staging escolhido |
| Forward-only | Sim — sem down automático no runner |
| CD staging | **Não** aplica migrate no YAML atual — migrate é passo **separado** e deve ser autorizado |

**Plano de execução proposto (só após AUTHORIZED + tip no ambiente):**

1. Confirmar SHA deployado no host = tip com `0059` (merge/deploy prévio se necessário).  
2. Backup/snapshot DB staging (ver §4).  
3. `DATABASE_URL=<staging>` `npm run migrate` (backend).  
4. Verificar: `\dt partner*` = 7 tabelas; sem ALTER em legado; journal Drizzle contém `0059_partner_domain`.  
5. Smoke: select count em `partners` = 0 (vazio esperado).  
6. Registrar evidência; **não** tocar produção.

---

## 4. Backup / snapshot

| Fonte | O que cobre | Gap |
|-------|-------------|-----|
| CD staging SSH | Copia `docker-compose.staging.yml` → `backups/` | **Não** é backup de dados Postgres |
| Docs locais | Volumes Docker separados staging vs prod | Procedimento de `pg_dump` **não** padronizado no CD |

**Obrigatório antes de migrate (humano/ops):** `pg_dump` (ou snapshot do volume) do DB staging alvo, com retenção e path registrados na evidência. Sem backup DB → **não** migrar.

---

## 5. Rollback

| Método | Escopo | Quando |
|--------|--------|--------|
| Header `0059` | `DROP TABLE IF EXISTS` Partner\* (ordem reversa) | Staging/ephemeral **somente**; nunca ad-hoc prod |
| Revert PR / revert commit | Remove migration do código | Se migrate ainda não aplicado no alvo |
| Drizzle | Forward-only — down = SQL manual Partner\* | Documentado no pre-flight Inc1 |

Produção: **fora de escopo**.

---

## 6. Isolamento produção

| Check | Status |
|-------|--------|
| Este preflight conectou a produção? | **NÃO** |
| Migrate produção? | **BLOQUEADO** |
| CD production? | **NÃO** acionado |
| `DATABASE_URL` prod lida/alterada? | **NÃO** (secrets não usados) |

---

## 7. Bloqueios do preflight (impedem migrate até resolução)

1. Tip `1edc2bfb` **não** está em `main` / **não** comprovado no host staging.  
2. Alvo staging (A/B/C) **não** declarado pelo Orquestrador.  
3. Backup DB staging **não** evidenciado nesta sessão.  
4. CD `develop` ≠ fluxo do PR para `main` — alinhar merge/deploy **antes** do migrate.  
5. Sem `docker-compose.staging.yml` no repo — ops deve confirmar arquivo no `STAGING_PATH`.

---

## 8. Veredito

```text
INC1_STAGING_PREFLIGHT_COMPLETE
```

Preflight **documentado**. Migration staging: **NOT EXECUTED**.

```text
INC1_STAGING_MIGRATION_AUTHORIZED
```

ainda **não** emitido — e **não** deve ser emitido até fechar os bloqueios §7.

**PARAR.**
