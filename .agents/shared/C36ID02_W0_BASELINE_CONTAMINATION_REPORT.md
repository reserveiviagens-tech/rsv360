# C36-ID-02 — W0 BASELINE & CONTAMINATION CONTROL — RELATÓRIO

> **Origem:** execução da Wave 0 do `RSV360_MASTER_IMPLEMENTATION_WAVE.md`.
> **Modo:** READ-ONLY (nenhuma escrita em arquivo de código, schema, DB, staging ou produção).
> **Gate alvo:** `W0-GATE = BASELINE_RECONCILED`
> **Data:** 2026-10-02/03

Status: `COMPLETE — FINDINGS PRODUCED`
CODE / MIGRATION / DB / STAGING / DEPLOY / PRODUCTION / COMMIT / PUSH: **CLOSED**

---

## W0.1 — Fotografia do baseline

| Item | Valor medido (literal) |
|---|---|
| HEAD | `61040b02eb076e6ba1704210d0726a63a3490b9c` |
| Branch | `feat/c36dd-refund-request-domain` |
| origin/main | `fecc3f756374236feaacf8aac69a533640a74549` |
| Log HEAD | `61040b02 feat(refund): establish refund request domain (C36-DD)` |
| Stashes | **4** |
| Tracked modificados | **88** |
| Untracked | **128** |
| `git diff --shortstat` | `88 files changed, 24892 insertions(+), 24071 deletions(-)` |
| `git diff --ignore-cr-at-eol --shortstat` | `18 files changed, 921 insertions(+), 100 deletions(-)` |
| `git diff -w --shortstat` | `18 files changed, 916 insertions(+), 95 deletions(-)` |
| `core.autocrlf` | *(vazio — não configurado)* |
| `core.eol` | *(vazio — não configurado)* |
| Journal drizzle (worktree) | **64** entries, último `0063_refund_request_decisions` |
| Journal drizzle (HEAD) | **63** entries, último `0062_refund_requests` |
| `backend/drizzle/*.sql` | 64 |
| `database/migrations/*` | 13 |
| Árvores de módulo | `server/modules` = **31** dirs · `backend/server/modules` = **1** dir |
| Workflows CI | 19 |
| `.cursor/rules/*.mdc` | 13 |

### Stashes (estado oculto — não tocado)
```
stash@{0}: On main: c36by-wip-untracked
stash@{1}: On feat/fase5-partners-inc1: wip-before-chore-staging-compose
stash@{2}: On main: aruanda-wip-before-slices
stash@{3}: On main: wip-rate-calendar-lote
```
**Nenhum stash foi aplicado, listado em conteúdo ou descartado.**

---

## W0.2 — Classificação de proveniência

### Histograma de mtime (tracked modificados)
```
71  → 2026-10-02 15:15   (lote único, sessão anterior)
17  → mtimes dispersos entre 2026-09-29 17:10 e 2026-10-03 00:00
```
### Histograma de mtime (untracked)
```
11  → 2026-10-02 15:15   (mesmo lote)
117 → mtimes dispersos entre 2026-09-22 e 2026-10-02
```

### Classificação

| Classe | Qtd | Descrição |
|---|---|---|
| `PROTECTED` | 1 | `.cursor/rules/enterprise-pr-policy.mdc` — **CRLF-only, sem mudança semântica** |
| `PREEXISTING` (CRLF/hygiene) | 70 | trackeados cuja única diferença é CR no EOL |
| `PREEXISTING` (semântico) | 18 | ver tabela abaixo — trabalho in-flight de refund/multi-property/notifications |
| `CURRENT-GATE` | 2 | `C36ID02_SECURITY_CONTRACT.md`, `C36ID02NS_TENANT_NAMESPACE_DECISION_PACKAGE.md` |
| `UNRELATED` | 0 | — |
| `UNKNOWN` | 0 | todos os arquivos semânticos são atribuíveis a artefatos em `.agents/shared/` |

### Métrica decisiva de higiene

```
git diff                    → 88 files,  24892 ins / 24071 del
git diff --ignore-cr-at-eol → 18 files,    921 ins /   100 del
git diff -w                 → 18 files,    916 ins /    95 del
```

**Conclusão:** ~24.500 das 24.892 linhas de diff são **ruído de line-ending (LF→CRLF)**. Sem essa correção de leitura, o baseline parece uma refatoração massiva quando é, na prática, **18 arquivos**.

### Os 18 arquivos com mudança semântica real

| # | Arquivo | +/- | Workstream correlato |
|---|---|---|---|
| 1 | `backend/drizzle/meta/_journal.json` | +7/-0 | ADD-4 / WS-08 |
| 2 | `backend/server/modules/payments/routes/index.ts` | +3/-0 | WS-07 |
| 3 | `backend/server/modules/payments/routes/refund-request.routes.ts` | +291/-9 | DE-14 |
| 4 | `backend/server/modules/payments/schema.ts` | +26/-2 | WS-07 |
| 5 | `backend/server/modules/payments/services/refund-request.service.ts` | +308/-2 | DE-14 |
| 6 | `backend/src/__tests__/unit/refund-request-separation.test.ts` | +6/-2 | DE-14 |
| 7 | `backend/src/__tests__/unit/refund-request.domain.test.ts` | +9/-0 | DE-14 |
| 8 | `backend/src/db/schema/payments.ts` | +26/-2 | WS-07 |
| 9 | `server/modules/multi-property/db/property.repository.ts` | +23/-6 | WS-04 / C5 |
| 10 | `server/modules/multi-property/middleware/tenant.middleware.ts` | +74/-21 | WS-04 |
| 11 | `server/modules/multi-property/routes/properties.routes.ts` | +37/-6 | C5 |
| 12 | `server/modules/multi-property/schemas/multi-property-write.schema.ts` | +6/-2 | WS-04 |
| 13 | `server/modules/multi-property/services/index.ts` | +2/-3 | WS-04 |
| 14 | `server/modules/multi-property/services/property.service.ts` | +2/-1 | WS-04 |
| 15 | `server/modules/multi-property/services/tenant.service.ts` | **+0/-23 (ARQUIVO DELETADO)** | WS-04 / C5 |
| 16 | `server/modules/notifications/management-routes.js` | +28/-8 | WS-09 |
| 17 | `server/modules/notifications/routes.js` | +50/-11 | WS-09 |
| 18 | `server/modules/notifications/settings-routes.js` | +23/-2 | WS-09 |

---

## W0.3 — Collision Graph

O baseline dirty **não é órfão**: ele incide exatamente nas superfícies que o Master Wave pretende abrir.

| Superfície | Arquivos dirty | Workstream do plano | Colisão |
|---|---|---|---|
| Enterprise Context / tenant | `server/modules/multi-property/**` (7 trackeados + 3 testes untracked) | **WS-04** | 🔴 ALTA |
| Property Authorization | `properties.routes.ts`, `property.repository.ts`, `tenant.service.ts` (deletado) | **C5** | 🔴 ALTA |
| Refund / Payments | `backend/server/modules/payments/**` (7 trackeados + 9 untracked) | **DE-14, WS-07** | 🔴 ALTA |
| Refund Execution | `refund-request-execution.*`, `simulated-refund.gateway.ts`, `reconciliation-probe.double.ts` (untracked) | **DE-06** | 🔴 ALTA |
| Drizzle registry | `_journal.json`, `0063_refund_request_decisions.sql` (untracked), snapshots | **ADD-4, WS-08** | 🔴 ALTA |
| Notifications | `server/modules/notifications/*.js` (3) | **WS-09** | 🟡 MÉDIA |
| RBAC frontend | `apps/turismo/src/components/auth/RoleBasedAccess.tsx` | **WS-15** | 🟢 LIMPA (não modificado) |
| Auth / MFA | `backend/drizzle/0007_create_user_2fa.sql` | **WS-17** | 🟢 LIMPA (não modificado) |
| `.agents/shared` | 95 arquivos untracked (`C36DE06/07/08_*`, `C36CZ_*`, `_de0*.txt`) | Governança | 🟡 MÉDIA |

### Colisão decisiva: DE-06 já tem trabalho em disco, não commitado

```
backend/server/modules/payments/routes/refund-request-execution.routes.ts        (untracked)
backend/server/modules/payments/services/refund-request-execution.service.ts     (untracked)
backend/server/modules/payments/services/refund-request-execution.deps.ts        (untracked)
backend/server/modules/payments/services/refund-request-execution.ports.ts       (untracked)
backend/server/modules/payments/services/refund-request-reconciliation.service.ts(untracked)
backend/server/modules/payments/lib/simulated-refund.gateway.ts                  (untracked)
backend/server/modules/payments/lib/refund-request-execution-state.ts            (untracked)
backend/server/modules/payments/lib/reconciliation-probe.double.ts               (untracked)
.agents/shared/C36DE06_IMPLEMENTATION_RESULT.md                                  (untracked)
.agents/shared/C36DE06_VALIDATION_REPORT.md                                      (untracked)
.agents/shared/C36DE06_WORKTREE_BOUNDARY.md                                      (untracked)
```

**Implicação:** a Wave 8 (DE-06) já possui implementação **não versionada** na árvore. Antes de qualquer novo plano de DE-06, é obrigatório reconciliar se esse estado é aceito, descartado ou promovido — caso contrário o executor reimplementará por cima de código órfão.

---

## W0.4 — File Ownership Model (insumo para W1)

| Workstream | ALLOWED (quando autorizado) | READ-ONLY | FORBIDDEN |
|---|---|---|---|
| **WS-04** | `server/modules/multi-property/middleware/tenant.middleware.ts`, `services/index.ts`, `schemas/multi-property-write.schema.ts` | `property.repository.ts`, `property.service.ts` | `backend/drizzle/**`, `backend/server/modules/payments/**` |
| **C5** | `server/modules/multi-property/routes/properties.routes.ts` | `tenant.middleware.ts` | payments, drizzle |
| **WS-09** | `server/modules/notifications/{routes,settings-routes,management-routes}.js` | `multi-property/**` | payments, drizzle |
| **DE-14** | `backend/server/modules/payments/routes/refund-request.routes.ts`, `services/refund-request.service.ts`, `schema.ts`, `backend/src/db/schema/payments.ts` | `tenant.middleware.ts` | gateway real, payout, `_journal.json` (ADD-4) |
| **ADD-4 / WS-08** | `backend/drizzle/**` (**migration writer — serializado, 1 por vez**) | — | todos os demais workstreams |

> **Nota de bloqueio:** todos os itens `ALLOWED` acima estão **atualmente dirty**. Nenhum pode ser editado antes da reconciliação do baseline.

### Inventário untracked (não-`.agents`, 33 itens)

```
backend/drizzle/0063_refund_request_decisions.sql
backend/drizzle/meta/0062_snapshot.json
backend/drizzle/meta/0063_snapshot.json
backend/scripts/c36de07-ephemeral-pg.mjs
backend/server/modules/payments/**            (9 arquivos — ver W0.3)
backend/src/__tests__/integration/*.postgres.integration.test.ts  (2)
backend/src/__tests__/unit/*                  (10 — multi-property, notifications, refund)
docs/governance/PROTOCOLO-CONVIVENCIA-ANTIGRAVITY-CURSOR.md
scripts/ops/backup_staging.sh
scripts/ops/restore_staging.sh
test-compose.yml
Aruanda2.md
c36f-0059-drizzle.tar
-files --others --exclude-standard
```
`.agents/shared/**` = 95 arquivos (artefatos `C36DE06/07/08`, `C36CZ`, `C36CF`, `_de0*.txt/json`, `_*.py`).

---

## W0.5 — Arquivo protegido: confirmação

`.cursor/rules/enterprise-pr-policy.mdc` (protegido por `AGENTS.md`).

**Evidência literal:**

```
git diff --numstat                      →  48   48   .cursor/rules/enterprise-pr-policy.mdc
git diff --ignore-cr-at-eol --name-only →  (AUSENTE da lista)
git diff -w --name-only                 →  (AUSENTE da lista)

Bytes no working tree: CR=48  LF=48   (48 pares CRLF)
Controle AGENTS.md:    CR=0   LF=136  (LF puro)
core.autocrlf = (vazio) · core.eol = (vazio)
```

**Conclusão:** a alteração é **exclusivamente LF→CRLF**. Zero linhas semânticas (48 inseridas / 48 removidas com contagem idêntica).

**Veredito W0.5:**

| Afirmação | Status |
|---|---|
| "arquivo protegido possui alteração pré-existente" | ✅ CONFIRMADO (mas apenas line-ending) |
| "não deve ser revertido automaticamente" | ✅ CONFIRMADO — reverter sem coordenação recriaria o churn e mascararia a higiene |
| "alteração semântica sem token" | ❌ REFUTADO — **não há alteração semântica** |

**Implicação de risco:** R-7 é **rebaixado** de "edição semântica de arquivo enterprise sem token" para "churn de line-ending". Ainda assim, a conversão `core.autocrlf` ausente + `*.mdc` sem `text=auto` é um defeito de configuração que precisa de chore dedicado.

---

## Achados W0

| ID | Achado | Severidade | Evidência |
|---|---|---|---|
| **W0-F1** | **70 de 88 arquivos "modificados" são churn LF→CRLF.** O diff real é de 18 arquivos. | 🟠 ALTA (higiene de baseline) | `88 files/24892 ins` → `18 files/921 ins` com `--ignore-cr-at-eol` |
| **W0-F2** | **`tenant.service.ts` está DELETADO no working tree (não commitado)** e o conteúdo removido continha `return 1` + fallback de property default — exatamente o anti-pattern `propertyId = 1` que **C5** e a invariante **I-07** proíbem. | 🔴 CRÍTICA | `deleted file mode 100644`, numstat `0/23` |
| **W0-F3** | **Mismatch de journal Drizzle:** worktree tem `0063_refund_request_decisions` (64 entries) e HEAD tem `0062_refund_requests` (63 entries) — e o `.sql` da 0063 é **untracked**. Metade da migration existe só em disco. | 🔴 CRÍTICA (ADD-4/WS-08) | journal HEAD/worktree + `git ls-files` vazio para 0063 |
| **W0-F4** | **DE-06 (Wave 8) já possui implementação não versionada**: execution service/routes/ports/deps, simulated gateway, reconciliation probe + 3 relatórios. | 🔴 CRÍTICA (replanejamento DE-14→DE-06) | 11 arquivos untracked em `payments/**` + `.agents/shared/C36DE06_*` |
| **W0-F5** | **4 stashes** com trabalho WIP de outros contextos (`c36by-wip-untracked`, `aruanda-wip-before-slices`, `wip-rate-calendar-lote`, `wip-before-chore-staging-compose`). | 🟡 MÉDIA | `git stash list` |
| **W0-F6** | **Artefatos contaminantes no root**: arquivo espúrio `-files --others --exclude-standard` (11.035 bytes, 2026-09-29) e `c36f-0059-drizzle.tar`, ambos untracked. Arquivos `.tar` são mapeados para **Git LFS** em `.gitattributes`. | 🟡 MÉDIA | `git ls-files --others` |
| **W0-F7** | **Arquivo protegido sem alteração semântica** — `enterprise-pr-policy.mdc` é 48/48 CRLF-only. Risco R-7 rebaixado. | 🟢 BAIXA (redução de risco) | `--ignore-cr-at-eol` exclui o arquivo; CR=48/LF=48 |

### W0-F1 — detalhe do mecanismo

```
core.autocrlf = (não configurado)
core.eol      = (não configurado)
.gitattributes: presente, mas sem "* text=auto"
```

Sem `text=auto` e sem `autocrlf`, o Git **não normaliza** EOL. Qualquer ferramenta Windows que reescreva os arquivos produz churn integral. Existe inclusive branch remota correlata: `origin/chore/c36ci-migrate-crlf-fix`.

---

## Required Evidence (§25 do Master Wave)

| Campo | Valor |
|---|---|
| `HEAD` | `61040b02eb076e6ba1704210d0726a63a3490b9c` |
| `BRANCH` | `feat/c36dd-refund-request-domain` |
| `START_TIME` / `END_TIME` | 2026-10-02/03 (sessão W0) |
| `FILES_READ` | 0 (nenhum arquivo de código lido em conteúdo — apenas inventário e diffs) |
| `FILES_MODIFIED` | **0** |
| `FILES_CREATED` | **2** (`.agents/shared/RSV360_MASTER_IMPLEMENTATION_WAVE.md`, `.agents/shared/C36ID02_W0_BASELINE_CONTAMINATION_REPORT.md`) |
| `FILES_DELETED` | **0** |
| `TESTS` | NOT_RUN (read-only; nenhum código alterado) |
| `TYPECHECK` | NOT_RUN |
| `STATIC_SCAN` | git diff triage (nome + numstat + `--ignore-cr-at-eol` + `-w`) |
| `SECURITY_SCAN` | nenhum secret lido; `.env` **não** foi aberto |
| `MIGRATION_STATUS` | **NOT APPLIED** — 0063 existe apenas como arquivo untracked |
| `DB_STATUS` | **NOT TOUCHED** |
| `STAGING_STATUS` | **CLOSED** |
| `PRODUCTION_STATUS` | **CLOSED** |
| `SCOPE_DRIFT` | **NONE** — nenhuma edição fora de `.agents/shared/**` |
| `FAILURE_CLASSIFICATION` | `PREEXISTING_FAILURE` (W0-F1..F7 são todos pré-existentes à sessão) |
| `FINAL_VERDICT` | **BASELINE_RECONCILED (leitura)** |

---

## W0-GATE — Veredito

```
W0-GATE = BASELINE_RECONCILED   ✅ (fotografia produzida e proveniência classificada)
```

**O que o gate autoriza:**

- prosseguir para **W1 — Architectural Decisions** (D-ID02-NS e ADD-3);
- usar os mapas W0.2/W0.3/W0.4 como base de File Ownership de cada Implementation Plan.

**O que o gate NÃO autoriza:**

```
NO SHARED-WRITE      → nenhum arquivo dos 18 semânticos pode ser editado
NO CLEANUP           → os 70 arquivos CRLF-only permanecem INTOCADOS de propósito
NO RESET             → proibido `git checkout .` / `git restore .`
NO STASH             → proibido aplicar/descartar os 4 stashes
NO COMMIT            → os 2 artefatos ficam untracked
```

**Justificativa explícita:** reverter o churn CRLF dos 70 arquivos seria, por si só, uma operação de **shared-write** em massa sobre as superfícies de auth/multi-property/payments/CI — exatamente o que o Single Writer Lock e o W0-GATE proíbem. A limpeza exige chore dedicado e commitado, com PR e revisão humana.

---

## Próxima ação (única)

**W1 — Decisão do Owner**, sem código:

1. **D-ID02-NS** → `A (INTEGER)` · `B (UUID)` · `C (TRANSITIONAL DUAL-KEY)`
2. **ADD-3** → árvore canônica de autorização entre `server/modules/**` (31 dirs) e `backend/server/modules/**` (1 dir), **sem criar terceira árvore** (I-14)

Até essas duas decisões: **WS-04, WS-15, C5, DE-14 permanecem BLOCKED**.

---

*Fim do relatório W0.*