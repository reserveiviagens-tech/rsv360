# RSV360 — WAVE OPERATIONAL RECONCILIATION (pós OD-WAVE)

**Documento:** reconciliação operacional após Owner Decisions CLOSED  
**Base normativa:**  
- `WAVE_OWNER_DECISION_REGISTER.md` (CLOSED / APPROVED)  
- `GD_WAVE_CLOSURE_POST_RECONCILIATION.md` (§4 inventário · §7 política)  
**Data:** 2026-10-07  
**Natureza:** RECONCILE ONLY — **não** é COMMIT GO · **não** é PUSH GO · **não** é CODE GO · **não** é Migration GO  
**HEAD baseline (não alterar):** `4a4be7577a1ad94903b57adcadfa1b9f42491889`  
**Branch:** `feat/c36dd-refund-request-domain` (ahead 11 / behind 2 — **intocado**)

---

## 0. Veredito

```text
OWNER DECISIONS     = CLOSED
OD-WAVE-01…04       = APPROVED (A / A / C / DEFER)
COMMIT / PUSH /
MIGRATION / CODE    = NOT AUTHORIZED

Este artefato define COMO as ODs afetam Pacotes A/B/C
e QUAL seria o payload de cada onda de commit.
Nenhuma operação Git é autorizada ou executada aqui.
```

---

## 1. Ballot → efeito operacional

| OD | Decisão | Efeito imediato | Efeito diferido (exige GO futuro) |
|---|---|---|---|
| **OD-WAVE-01 = A** | GO **conceitual** Pacote 1 (docs/gov) | Ordem de consolidação começa por docs; Pacotes A/B código **não** entram na primeira onda | `COMMIT GO — PACOTE 1` para `git add`/`commit` real |
| **OD-WAVE-02 = A** | Master Geral §40 na onda docs | §40 entra no **payload da Onda 1** (não onda separada) | Mesmo `COMMIT GO — PACOTE 1` |
| **OD-WAVE-03 = C** | DEFER sync remote | **Proibido** fetch/rebase/merge/push agora | `PUSH GO` + escolha explícita A (rebase) ou B (merge) |
| **OD-WAVE-04 = DEFER** | Sem onda funcional nova | G-E / WS / G-B.2+ / S10 **bloqueados** | Nova RECONCILE + OD + CODE GO **após** commits isolados |

**Regra de ouro:** APPROVED em OD-WAVE ≠ autorização de execução Git.

---

## 2. Mapa Pacotes A / B / C × ODs

Nomenclatura estável (não confundir “Pacote 1” da ordem de commit com “Pacote A” de código):

| Label | Significado | Conteúdo |
|---|---|---|
| **Pacote A** | Código + testes + gov **G-D** | propostas / agentes / cotacao markers / `gd*` tests / `GD_*.md` |
| **Pacote B** | Código + testes + gov **G-C.9** | acomodacoes / tarifas / anfitrião guards / `GC9_*` / `PA-W*` |
| **Pacote C** | **OUT-OF-SCOPE** | UI apps, drizzle 0063/0064, outros membership, workflows, C36* residual |
| **Pacote 1** (ordem) | **Só docs/gov** — subconjunto de A+B **sem código** | `.agents/shared` GD/GC9/PA + Master Geral §40 + este register/reconcile |

```text
OD-WAVE-01 A  →  autoriza PLANEJAR Onda 1 = Pacote 1 (docs)
                 NÃO autoriza commit de Pacote A código
                 NÃO autoriza commit de Pacote B código
                 NÃO toca Pacote C

OD-WAVE-02 A  →  §40 VIAJA na Onda 1 (docs), não cria onda paralela

OD-WAVE-03 C  →  remote frozen; behind 2 permanece; sem fetch/rebase/merge/push

OD-WAVE-04 DEFER → Pacote C funcional (G-E/WS/…) permanece OUT; sem CODE GO
```

### Matriz de elegibilidade (agora)

| Superfície | Planejar payload | Executar commit | Executar push | CODE novo |
|---|---|---|---|---|
| Onda 1 — Pacote 1 (docs/gov + §40) | **SIM** (este doc) | **NÃO** (falta COMMIT GO) | **NÃO** | N/A |
| Onda 2 — Pacote A (código G-D) | **SIM** (inventário) | **NÃO** | **NÃO** | **NÃO** |
| Onda 3 — Pacote B (código G-C.9) | **SIM** (inventário) | **NÃO** | **NÃO** | **NÃO** |
| Pacote C / nova onda funcional | **NÃO** (DEFER) | **NÃO** | **NÃO** | **NÃO** |
| Migration / drizzle | **NÃO** | **NÃO** | **NÃO** | **NÃO** |

---

## 3. Ondas de commit — payload proposto (ainda NOT AUTHORIZED)

> Listas = **candidato a commit** quando existir `COMMIT GO` explícito por onda.  
> Paths alinhados a `GD_WAVE_CLOSURE_POST_RECONCILIATION.md` §4 / §7.  
> Working tree global ~329 permanece **PRESERVE** até GO.

### Onda 1 — Pacote 1 (docs / governança) — **primeira elegível após COMMIT GO**

**Mensagem sugerida:**  
`docs(agents): G-D wave closure + PA/GC9 catalogs + Master Geral §40`

**Incluir (allowlist conceitual)**

```text
.agents/shared/GD_MASTER_PRE_IMPLEMENTATION_DISCOVERY_PLAN.md
.agents/shared/GD_OWNER_DECISION_REGISTER.md
.agents/shared/GD_MASTER_IMPLEMENTATION_PLAN.md
.agents/shared/GD7_NA_CLOSED_DECISION.md
.agents/shared/GD9_BOUNDARY_CONTRACT.md
.agents/shared/GD{0,1,2,3,6,8,9,10}_IMPLEMENTATION_RESULT.md
.agents/shared/GD_WAVE_CLOSURE_POST_RECONCILIATION.md
.agents/shared/WAVE_OWNER_DECISION_REGISTER.md
.agents/shared/WAVE_OPERATIONAL_RECONCILIATION_POST_OD.md   # este arquivo
.agents/shared/GC9_MASTER_FINAL_EXECUTION_REPORT.md
.agents/shared/GC9B3_* … GC9C_* (planos/reports GC9 da wave)
.agents/shared/PA-W0-*.md … PA-W6-*.md
.agents/shared/PA-W5-ARCHITECTURAL-DECISION-REGISTER.md
.agents/shared/PARTNER_AUTHORITY_RECONCILIATION_MASTER_PLAN.md  # se dirty e da wave PA
.agents/shared/RSV360_MASTER_PLAN_GERAL.md   # §40 drift → CORRIGIR no mesmo commit
```

**Excluir da Onda 1**

```text
qualquer path sob server/ | backend/src/ | apps/ | backend/drizzle/
qualquer *_IMPLEMENTATION_* de código
secrets / .env / workflows de deploy
```

**Pré-condição de execução (futura):** `COMMIT GO — ONDA 1` / `COMMIT GO — PACOTE 1` literal do Owner.

**Edição §40 (conteúdo alvo, não aplicar agora):**

```text
G-C.9 | Partner Authority / membership acomodacoes-tarifas-anfitriao
      | VALIDATION_PASS_WITH_CONDITIONS
G-D   | Propostas/Agentes/Boundary
      | PRINCIPAL SEQUENCE CLOSED
      | (D.4 DEFER→G-E; WS gate separado)
```

---

### Onda 2 — Pacote A (código G-D) — **após Onda 1 commitada** (recomendado)

**Mensagem sugerida:**  
`feat(propostas): G-D authority wave (D.0–D.10)`

**Incluir**

```text
# Modified
server/modules/propostas/rbac.ts
server/modules/propostas/proposta-access.ts
server/modules/propostas/mgm.ts
server/modules/propostas/routes/index.ts
server/modules/agentes/instrutor/papel.ts
server/modules/agentes/routes/index.ts
server/modules/cotacao-publica/routes/index.ts

# Created
server/modules/propostas/economic-authority.ts
backend/src/__tests__/unit/gd0-foundation-contract.test.ts
backend/src/__tests__/unit/gd1-matriz-http-contract.test.ts
backend/src/__tests__/unit/gd2-rank-adapter-formal.test.ts
backend/src/__tests__/unit/gd3-proposta-access-staff-contract.test.ts
backend/src/__tests__/unit/gd6-economic-authority-contract.test.ts
backend/src/__tests__/unit/gd8-agentes-auth-contract.test.ts
backend/src/__tests__/unit/gd9-cotacao-propostas-boundary.test.ts
backend/src/__tests__/unit/gd10-mgm-indicador-binding.test.ts
(+ mgm.test.ts / agentes-routes / agentes-instrutor-* se dirty e da fatia G-D)
```

**Excluir**

```text
membership/acomodacoes-* | tarifas-* | anfitriao-*   → Pacote B
apps/** | drizzle/** | Pacote C
```

**Pré-condição:** `COMMIT GO — ONDA 2` / `COMMIT GO — PACOTE A` + validação dedicada `gd*` + family regression.

---

### Onda 3 — Pacote B (código G-C.9) — **após Onda 2** (recomendado)

**Mensagem sugerida:**  
`feat(acomodacoes): G-C.9 membership authority`

**Incluir**

```text
server/modules/acomodacoes/routes/{sync,import,index,tarifas,anfitriao}.routes.ts
server/modules/acomodacoes/services/{anfitriao,rate-calendar}.service.ts
server/modules/membership/acomodacoes-*.guard.ts
server/modules/membership/tarifas-*.guard.ts (+ *.scope.ts)
server/modules/membership/anfitriao-*.guard.ts
backend/src/__tests__/unit/acomodacoes-*-guard.test.ts
backend/src/__tests__/unit/tarifas-*-guard.test.ts
backend/src/__tests__/unit/anfitriao-*-guard.test.ts
```

**Excluir**

```text
propostas/** | agentes/** | gd* tests          → Pacote A
outros membership (crm/payments/…)             → Pacote C
drizzle 0063/0064                              → Migration GO separado
apps/**                                        → Pacote C
```

**Pré-condição:** `COMMIT GO — ONDA 3` / `COMMIT GO — PACOTE B` + dedicated/family GC9.

---

### Onda N — Pacote C / gates futuros — **BLOQUEADO (OD-WAVE-04 DEFER)**

```text
G-E / E-13 / WS / G-B.2+ / S10 / UI apps / RoleAssignment residual /
drizzle drafts / workflows / C36* → NÃO planejar commit nesta sequência
até: commits A/B isolados + nova RECONCILE + OD + CODE/COMMIT GO
```

---

## 4. Impacto OD-WAVE-03 (behind 2) no pipeline

```text
agora:
  fetch   = PROIBIDO
  rebase  = PROIBIDO
  merge   = PROIBIDO
  push    = PROIBIDO

quando existir PUSH GO:
  Owner escolhe A (fetch+rebase) OU B (fetch+merge) — não inferir
  só então push da(s) PR(s) já commitadas
```

**Implicação:** mesmo após `COMMIT GO — ONDA 1`, commits ficam **locais** até PUSH GO. Ahead aumenta; behind 2 permanece até sync autorizada.

---

## 5. Proibições operacionais (inalteradas)

```text
NÃO misturar Onda 1 + 2 + 3 no mesmo commit/PR
NÃO misturar Pacote A + B + C
NÃO incluir drizzle sem Migration GO
NÃO incluir apps/** em PR de authority backend
NÃO push force / rebase destrutivo / auto-merge
NÃO iniciar CODE de G-E/WS/B.2+/S10 (OD-WAVE-04)
NÃO interpretar este documento como COMMIT GO
```

---

## 6. Sequência autorizada daqui para frente (só planejamento)

```text
[DONE] OD-WAVE-01…04 APPROVED + Register CLOSED
[DONE] Operational Reconciliation (este arquivo)
[NEXT] Owner emite COMMIT GO — ONDA 1 (Pacote 1 docs)   ← único passo executável seguinte
[THEN] Commit local Onda 1 (sem push)
[THEN] COMMIT GO — ONDA 2 (Pacote A) …
[THEN] COMMIT GO — ONDA 3 (Pacote B) …
[THEN] PUSH GO + OD-WAVE-03 A|B (sync remote)
[THEN] nova RECONCILE → OD próxima onda funcional
```

---

## 7. Matriz de autorização (pós-OD)

| Ação | Estado |
|---|---|
| Análise / reconciliação operacional (este doc) | **DONE / AUTHORIZED** |
| Editar §40 no working tree agora | **NOT AUTHORIZED** (espera COMMIT GO Onda 1; edição pode ser parte do commit autorizado) |
| `git commit` Onda 1 / 2 / 3 | **NOT AUTHORIZED** |
| `git push` / fetch / rebase / merge | **NOT AUTHORIZED** (OD-WAVE-03 = C) |
| Migration / Deploy | **NOT AUTHORIZED** |
| CODE G-D/G-C.9 novo ou G-E/WS/… | **NOT AUTHORIZED** |

---

## 8. Relatório final

```text
=== WAVE OPERATIONAL RECONCILIATION (POST OD) ===

OD-WAVE-01 = APPROVED → A  (Pacote 1 docs first)
OD-WAVE-02 = APPROVED → A  (§40 in Onda 1)
OD-WAVE-03 = APPROVED → C  (remote frozen)
OD-WAVE-04 = APPROVED → DEFER (no functional wave)

PACKAGE A (G-D code)     = payload Onda 2 — commit NOT AUTHORIZED
PACKAGE B (G-C.9 code)   = payload Onda 3 — commit NOT AUTHORIZED
PACKAGE C (OUT-OF-SCOPE) = blocked by OD-WAVE-04

ONDA 1 PAYLOAD           = docs/gov + Master Geral §40 — PLANNED ONLY
COMMIT / PUSH /
MIGRATION / CODE         = NOT AUTHORIZED

Catalog:
.agents/shared/WAVE_OPERATIONAL_RECONCILIATION_POST_OD.md

NEXT OWNER TOKEN:
COMMIT GO — ONDA 1   (or equivalent literal)

STOP — no Git until explicit COMMIT GO
```

---

*Integridade > velocidade. Decision ≠ Execution.*
