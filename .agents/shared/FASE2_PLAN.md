# FASE 2 — PLAN_REQUESTED

**Status:** EXECUTION_DONE → VALIDATION_REQUESTED (commit/push ainda bloqueados)  
**Orquestrador:** gates G2.0–G2.3 aplicados; aguardar VALIDATED para commit  
**Data:** 2026-09-21

## Checkpoints congelados (independentes)

| Fase | Branch | SHA | Conteúdo |
|------|--------|-----|----------|
| FASE 0 | `fix/auth-refresh-contract` | `c42222848bf27bfcb38e50faecbf979d5fe5c240` | auth refresh + session expired |
| FASE 1 | `chore/fase1-safe-bumps` | `8dd5dd6b9d4b4d1c44c7015b4b2df09fa29d3478` | google-auth-library + docker actions |
| main | `origin/main` | `8c9efe9dd35dd925c9509d44713feca8e8e8aa8f` | baseline |

**Não presumir** FASE 0 ⊂ FASE 1. Integração só com decisão explícita do Orquestrador.

---

## 1. Objetivo

Bumps pontuais de tooling Node/CI e validação de compatibilidade de tipos, conforme plano RSV360:

1. Alinhar `actions/setup-node` para **v6** onde ainda estiver em v3/v4 (plano original: 3→6).
2. Definir `node-version` nos workflows tocados conforme **baseline validada** (`engines.node`: `>=24.0.0 <25` no root; CI root já usa 24).
3. **Manter** `react-dropzone` do `site-publico` compatível com React `19.2.5` (hoje `^14.3.8`) — **não forçar bump** se incompatível; apenas evidenciar.
4. Avaliar bump de `@types/node` no `site-publico` (hoje `^20.0.0`) **somente após** matriz de compatibilidade; default proposto: alinhar a `^22` (já usado em turismo/admin/guest) **ou** manter 20 se type-check/build regredir.
5. Rodar `type-check` nos workspaces aplicáveis **sem** `.next` (lição da FASE 1).

---

## 2. Branch e commit-base

| Campo | Proposta |
|-------|----------|
| Branch nova | `chore/fase2-node-setup-bumps` |
| Commit-base **recomendado** | `8dd5dd6b` (`chore/fase1-safe-bumps`) |
| Motivo do base | FASE 1 já alterou `apps/site-publico/.github/workflows/ci-cd.yml` e `apps/turismo/.github/workflows/ci-cd-pipeline.yml`; basear em `origin/main` geraria conflito/reconciliação desnecessária |
| Alternativa | Base `origin/main` @ `8c9efe9d` **somente** se Orquestrador exigir PRs 100% independentes (exige reaplicar ou rebase consciente da FASE 1) |

FASE 0 **não** entra no base por padrão.

---

## 3. Relação com FASE 0 / FASE 1

```text
origin/main (8c9efe9d)
    ├── FASE 0  fix/auth-refresh-contract (c4222284)   [paralelo — auth]
    └── FASE 1  chore/fase1-safe-bumps (8dd5dd6b)     [deps docker + google-auth]
            └── FASE 2  chore/fase2-node-setup-bumps   [proposta: empilhada em FASE 1]
```

- FASE 2 **não** modifica código de auth da FASE 0.
- FASE 2 **pode** tocar os mesmos workflows YAML da FASE 1 (setup-node / node-version).
- Merge de FASE 0+1+2 = decisão posterior do Orquestrador (não nesta fase).

---

## 4. Arquivos potencialmente alterados

### Alta probabilidade
- `apps/site-publico/.github/workflows/performance-tests.yml` — único `setup-node@v3` encontrado
- `apps/site-publico/.github/workflows/ci-cd.yml` — `setup-node@v4` + `NODE_VERSION: '18'`
- `apps/site-publico/.github/workflows/ci.yml` — `setup-node@v4` + node 20
- `apps/site-publico/.github/workflows/e2e-tests.yml` — `setup-node@v4` + node 18
- `apps/turismo/.github/workflows/ci-cd-pipeline.yml` — `setup-node@v4` + node 18
- `apps/site-publico/package.json` — `@types/node` **se** matriz autorizar
- `package-lock.json` — se `@types/node` mudar
- `.agents/shared/*` — CONTEXT / CURRENT_TASK / HANDOFF / EXECUTION_LOG

### Fora do escopo FASE 2 (evidência)
- Root `.github/workflows/*` — **já** `setup-node@v6` + node 24 → não reabrir
- `react-dropzone` — **não bump** salvo evidência de incompatibilidade (manter `^14.3.8` no site-publico)
- Dockerfiles / `engines.node` → FASE 4
- Untracked: `Aruanda2.md`, `PROTOCOLO-*`, `test-compose.yml`

---

## 5. Análise de impacto

| Mudança | Impacto | Risco |
|---------|---------|-------|
| setup-node v3/v4 → v6 | Sintaxe Actions; inputs estáveis (`node-version`, cache) | Baixo |
| node-version 18/20 → 24 nos workflows de app | Jobs CI locais dos apps passam a Node 24 | Médio — scripts/apps podem assumir 18 |
| `@types/node` 20 → 22 | Tipos DOM/Node em TS do site-publico | Médio — type-check pode falhar (não corrigir oportunismo) |
| react-dropzone | Nenhum, se apenas verificação | Nulo se não alterar |

**Baseline Node validado hoje:** root `engines.node` = `>=24.0.0 <25`; CI root = 24.  
**Drift:** workflows de app ainda em 18/20 — alinhar é o núcleo da FASE 2.

---

## 6. Dependências

- FASE 1 fechada (VALIDATED + PUSHED) — **OK**
- Decisão do Orquestrador sobre **base** (FASE 1 tip vs `origin/main`)
- Decisão sobre escopo de `node-version`: (A) só workflows que bumpam setup-node; (B) todos os workflows de app com 18/20
- Não depende da FASE 0

---

## 7. Riscos e regressões

1. CI de app quebrar em Node 24 (APIs removidas / engines implícitos).
2. Type-check site-publico falhar após `@types/node` 22 (falsos positivos vs erros reais).
3. Confundir falha de type-check com presença de `.next` (controle obrigatório: type-check **sem** `.next`).
4. Escopo creep em Dockerfiles/`engines` (bloquear — FASE 4).
5. Stacked PR FASE 2 sobre FASE 1 sem merge de FASE 1 em main — review/CI path deve ser explícito.

---

## 8. Testes / validações previstos

1. `git diff` / escopo — apenas arquivos autorizados.
2. Grep pós-mudança: zero `setup-node@v3` nos paths tocados; meta: apps alinhados a `@v6` onde o plano autorizar.
3. `npm run type-check --workspace=apps/site-publico` **sem** diretório `.next`.
4. `npm run type-check` nos workspaces com script presente (documentar FAIL pré-existente).
5. `npm run build --workspace=apps/site-publico` (smoke).
6. Se `@types/node` alterado: comparar type-check antes/depois no mesmo ambiente (sem `.next`).
7. Não “CI verde remoto” obrigatório nesta proposta até Orquestrador pedir PR checks.

---

## 9. Critérios objetivos

### PASS (execução interna)
- setup-node atualizado nos arquivos do escopo aprovado;
- `node-version` alinhado à baseline 24 **nos arquivos autorizados**;
- `react-dropzone` do site-publico permanece compatível (versão inalterada ou bump justificado);
- `@types/node` só muda com evidência de compatibilidade;
- type-check site-publico sem `.next` = exit 0 **ou** FAIL documentado como pré-existente com baseline;
- build site-publico = exit 0;
- untracked preservados;
- FASE 0 SHA inalterado.

### NEEDS_REWORK
- type-check/build quebrados **por** mudança de FASE 2 (controle: baseline/worktree ou revert local dos bumps);
- alteração fora da lista autorizada;
- inclusão dos 3 untracked;
- tentativa de “corrigir” erros de `.next/types` ou ESLint tooling;
- alteração de Dockerfiles/`engines` sem gate FASE 4.

### VALIDATED (Orquestrador)
- Diff revisado;
- evidências de teste anexadas no HANDOFF;
- nenhum risco aberto sem decisão;
- autorização explícita de commit/push.

---

## 10. Estratégia de commit/push

1. Implementar só após **plano VALIDATED**.
2. Commit convencional sugerido (após execução):  
   `chore(ci): align setup-node v6 and Node 24 in app workflows`
3. Push da branch `chore/fase2-node-setup-bumps`.
4. **STOP** — sem FASE 3 no mesmo ciclo.
5. Sem merge automático FASE 0/1/2.

---

## 11. Pontos de intervenção do Orquestrador

| Gate | Pergunta |
|------|----------|
| **G2.0** | Aprovar este plano? |
| **G2.1** | Base = FASE 1 tip `8dd5dd6b` ou `origin/main`? |
| **G2.2** | Escopo node-version: só arquivos com setup-node bump, ou todos os app workflows em 18/20? |
| **G2.3** | Autorizar tentativa `@types/node` ^22 no site-publico, ou só auditoria/manter ^20? |
| **G2.4** | Após implementação: VALIDATED → commit/push? |
| **G2.5** | Estratégia futura de integração FASE 0 ∥ FASE 1+2 (merge order)? |

---

## 12. Estado atual solicitado

```text
FASE 2 — PLAN_REQUESTED
(não EXECUTING)
```

**Nenhuma alteração de código de FASE 2 foi feita nesta mensagem.**
