# RSV360 — G-D WAVE CLOSURE · POST-G-D RECONCILIATION CATALOG

**Documento:** catálogo de fechamento da sequência principal G-D + reconciliação pós-onda  
**Autoridade:** Owner AUTHORIZED — análise / catalogação (2026-10-07)  
**Natureza:** RECONCILE / CATALOG ONLY — **não** é CODE GO · **não** é Commit GO · **não** é Migration GO  
**Perspectiva:** Engenheiro Master Senior (Backend · Frontend · Rotas · System Design · ToT / CoT / SoT · Self-Consistency)

---

## 0. Veredito executivo (Owner)

```text
G-D PRINCIPAL SEQUENCE = CLOSED
G-C.9                 = VALIDATION_PASS_WITH_CONDITIONS (prévio)
NEXT IMPLEMENTATION   = NOT AUTHORIZED
NEXT CRITICAL PATH    = PROVENIÊNCIA + COMMIT POLICY POR ONDA
                        (não G-E / WS / G-B.2+)
```

**Self-consistency check:** fechar G-D e saltar para G-E/WS/B.2+ **contradiz** o próprio briefing de risco P0 (working tree dirty + zero commits isolados + Master Plan Geral stale). A decisão correta é **Wave Closure Reconciliation → só então decidir Commit Authorization**.

---

## 1. Estado normativo G-D (fechamento)

| Gate | Status | Evidência |
|---|---|---|
| G-D.0 | PASS / CLOSED | `GD0_IMPLEMENTATION_RESULT.md` |
| G-D.1 | PASS / CLOSED | `GD1_IMPLEMENTATION_RESULT.md` |
| G-D.2 | PASS / CLOSED | `GD2_IMPLEMENTATION_RESULT.md` |
| G-D.3 | PASS / CLOSED | `GD3_IMPLEMENTATION_RESULT.md` |
| G-D.6 | PASS / CLOSED | `GD6_IMPLEMENTATION_RESULT.md` |
| G-D.7 | **N/A / CLOSED** | `GD7_NA_CLOSED_DECISION.md` (residual AI = 0) |
| G-D.8 | PASS / CLOSED | `GD8_IMPLEMENTATION_RESULT.md` |
| G-D.9 | PASS / CLOSED | `GD9_IMPLEMENTATION_RESULT.md` + `GD9_BOUNDARY_CONTRACT.md` |
| G-D.10 | PASS / CLOSED | `GD10_IMPLEMENTATION_RESULT.md` |

> Numeração **não** é cronológica (ordem de execução: D.0→D.1→D.8→D.3→D.10→D.6→D.2→D.7 N/A→D.9).  
> Todos os slots da sequência principal (#1–#9 no Master Plan) estão fechados.

### Fora da sequência principal (permanece)

| Item | Estado | Motivo |
|---|---|---|
| **G-D.4** | DEFER → G-E / E-13 | OD-GD-05 (`enterpriseId` carrier ≠ autoridade) |
| **WS body** | Gate separado | OD-GD-09 |
| **G-E** | Separado | CLASS-B / enterpriseId |
| **G-B.2+** | Cadeia própria | Não absorver em G-D |
| **S10** | NOT STARTED | Depende de maturidade G-B/G-C/G-D |

```text
Próximo subgate G-D principal = NONE
```

---

## 2. Proveniência Git (fato)

| Campo | Valor |
|---|---|
| Branch | `feat/c36dd-refund-request-domain` |
| HEAD | `4a4be7577a1ad94903b57adcadfa1b9f42491889` |
| Upstream | `origin/feat/c36dd-refund-request-domain` |
| Ahead / behind | **11 / 2** |
| Working tree (global) | **~329** entradas `git status --short` |
| Commit durante G-D | **NOT EXECUTED** (HEAD inalterado desde baseline de consolidação) |
| Push | **NOT EXECUTED** |

**Implicação:** todo o valor de G-C.9 + G-D + outros gates coexistentes está **somente no working tree / untracked**. Perda de máquina ou `git clean` destrói a onda.

---

## 3. Catálogo de artefatos de governança

### 3.1 G-D — planos e decisões

| Arquivo | Papel |
|---|---|
| `GD_MASTER_PRE_IMPLEMENTATION_DISCOVERY_PLAN.md` | Discovery / RECONCILE |
| `GD_OWNER_DECISION_REGISTER.md` | OD-GD-01…12 CLOSED |
| `GD_MASTER_IMPLEMENTATION_PLAN.md` | PLAN_PASS / PLAN_READY |
| `GD7_NA_CLOSED_DECISION.md` | Owner: residual AI = zero |
| `GD9_BOUNDARY_CONTRACT.md` | Contrato boundary cotação × propostas |
| `GD{0,1,2,3,6,8,9,10}_IMPLEMENTATION_RESULT.md` | Evidências CODE |
| **Este documento** | Wave Closure / Post-G-D Reconciliation |

### 3.2 G-C.9 / Partner Authority

| Arquivo | Papel |
|---|---|
| `GC9_MASTER_FINAL_EXECUTION_REPORT.md` | VALIDATION_PASS_WITH_CONDITIONS |
| `GC9B3`…`GC9B5`, `GC9C_*` | Planos de subgates 9b/9c |
| `PA-W0`…`PA-W6` | Reconciliação Partner + decisões PA-DEC |
| `PA-W5-ARCHITECTURAL-DECISION-REGISTER.md` | PA-DEC-001…011 + OD-9c-A/B |

### 3.3 Drift documental (Master Plan Geral)

`RSV360_MASTER_PLAN_GERAL.md` §40 ainda declara:

```text
G-C | StaffAuth/Literals | NOT STARTED
G-D | Propostas/Agentes  | NOT STARTED
```

**Isso está falso face à evidência.** Classificação: **DOCUMENT DRIFT / STALE**.  
Ação Owner recomendada (quando autorizar docs): atualizar matriz §40 **ou** marcar seção como histórica com ponteiro para GC9/GD catalogs.

---

## 4. Inventário de código por onda (para commit policy)

### 4.1 Pacote A — G-D (Propostas / Agentes / Boundary)

**Modified**
- `server/modules/propostas/rbac.ts`
- `server/modules/propostas/proposta-access.ts`
- `server/modules/propostas/mgm.ts`
- `server/modules/propostas/routes/index.ts`
- `server/modules/agentes/instrutor/papel.ts`
- `server/modules/agentes/routes/index.ts`
- `server/modules/cotacao-publica/routes/index.ts` (markers G-D.9)

**Created**
- `server/modules/propostas/economic-authority.ts`
- `backend/src/__tests__/unit/gd0-foundation-contract.test.ts`
- `backend/src/__tests__/unit/gd1-matriz-http-contract.test.ts`
- `backend/src/__tests__/unit/gd2-rank-adapter-formal.test.ts`
- `backend/src/__tests__/unit/gd3-proposta-access-staff-contract.test.ts`
- `backend/src/__tests__/unit/gd6-economic-authority-contract.test.ts`
- `backend/src/__tests__/unit/gd8-agentes-auth-contract.test.ts`
- `backend/src/__tests__/unit/gd9-cotacao-propostas-boundary.test.ts`
- `backend/src/__tests__/unit/gd10-mgm-indicador-binding.test.ts`
- (+ ajustes `mgm.test.ts`, `agentes-routes`, `agentes-instrutor-*` se dirty)

**Governança**
- Todos os `GD_*.md` / `GD{n}_*.md` listados em §3.1

### 4.2 Pacote B — G-C.9 (Acomodações / Tarifas / Anfitrião)

**Modified (superfície)**
- `server/modules/acomodacoes/routes/{sync,import,index,tarifas,anfitriao}.routes.ts`
- `server/modules/acomodacoes/services/{anfitriao,rate-calendar}.service.ts`
- (+ possíveis format-only: desempenho, listing-*, disponibilidade-reserva.hook)

**Created (guards)**
- `server/modules/membership/acomodacoes-*.guard.ts`
- `server/modules/membership/tarifas-*.guard.ts` + `*.scope.ts`
- `server/modules/membership/anfitriao-*.guard.ts`
- testes `acomodacoes-*`, `tarifas-*`, `anfitriao-*-guard`
- `GC9_*.md` + `PA-W*.md`

### 4.3 Pacote C — OUT-OF-SCOPE (NÃO misturar com A/B)

Exemplos presentes no mesmo tree (não exaustivo):

- Outros `membership/*.guard.ts` (crm, payments, campanhas, …)
- `role-assignment.adapter.ts` / `repository.ts`
- Apps UI (turismo/admin/guest/site-publico)
- Drizzle `0063`/`0064` drafts
- Workflows / docker / monitoring
- Artefatos C36* diversos

**Regra:** Pacote C exige Owner GO separado por onda/gate.

---

## 5. Arquitetura consolidada (Tree of Thought → síntese)

```text
                    ┌─────────────────────────────┐
                    │     Authenticated Context     │
                    └──────────────┬──────────────┘
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
   Enterprise Context      Partner Authority        Public Capability
   (flag ON fail-closed)   (Modelo D / PA-DEC)      (rt-* / Turnstile)
           │                       │                       │
           ▼                       ▼                       ▼
   RoleAssignment /          anfitrião / broker         cotacao-publica
   requireEnterpriseRole     owner/carteira/cohost      aceitar / gerar
           │                       │                       │
           └───────────┬───────────┘                       │
                       ▼                                   │
              Economic Authority ◄─────────────────────────┘
              (PA-DEC-006: caps/audit;
               G-C.9b política; G-D.6 valorTotal/voucher)
                       │
                       ▼
              Resource Binding (server-side)
              body / query / path ≠ authority
```

### Contratos canônicos G-D (não reinterpretar)

| Tema | Contrato |
|---|---|
| Body | ≠ authority (`resolvePapel`, `indicadorId` staff, `valorTotal`) |
| agentAuth | alias `staffAuth` ≠ Partner `agente` ≠ AI `/agentes` |
| Aprovador / economic actor | **admin only** |
| Access staff | `{admin, manager}` — `user` sem privilégio |
| RANK | adapter local `PROPOSTAS_LOCAL_ROLE_RANK` |
| enterpriseId | carrier → G-E/E-13 |
| Indicação | dual: JWT staff (D.10) vs público token+ref (D.9 doc) |
| WS | gate separado |

### Dívidas conscientes (não “bugs escondidos”)

1. **OD-9c-B** — assimetria `podeVer` WRITE Partner (PRESERVE).  
2. **Indicação pública** — body `indicadorId` + existência (hardening futuro).  
3. **FLAG ON sem migration durable** — fail-closed esperado até Migration Gate.  
4. **24 TSC pre-existing** (fora de paths GC9/GD — classificados).  
5. **Master Plan Geral §40 stale**.

---

## 6. Chain of Thought — por que NÃO implementar agora

1. **Premissa:** G-D principal fechou.  
2. **Observação:** ~329 dirty/untracked; HEAD fixo; ahead 11 / behind 2.  
3. **Inferência:** qualquer CODE novo aumenta superfície sem baseline commit.  
4. **Risco:** PR único “god commit” mistura GC9+GD+UI+drizzle → review impossível + blast radius.  
5. **Conclusão:** próximo passo = **política de commit por onda**, não G-E/WS/B.2+.

**Skeleton of Thought (esqueleto decisório Owner):**

```text
IF commit authorized THEN
  FOR each package IN [G-D, G-C.9, OTHER] DO
    isolate paths
    run dedicated+family tests
    open PR with enterprise checklist
    NEVER mix packages
ELSE
  STOP (preserve working tree)
ENDIF
```

---

## 7. Política de commit por onda (P0 — proposta normativa)

> **Ainda NOT AUTHORIZED.** Este § é o contrato recomendado para quando o Owner emitir Commit GO.

### 7.1 Ordem sugerida de consolidação

| Ordem | Pacote | Conteúdo | PR sugerida |
|---|---|---|---|
| 1 | **Docs/gov G-D + PA + GC9 reports** | só `.agents/shared/GD*`, `GC9*`, `PA-W*` | `docs(agents): G-D wave closure + PA/GC9 catalogs` |
| 2 | **Código G-D** | propostas + agentes + cotacao markers + testes gd* | `feat(propostas): G-D authority wave (D.0–D.10)` |
| 3 | **Código G-C.9** | acomodacoes routes/services + membership acomodacoes/tarifas/anfitriao guards + testes | `feat(acomodacoes): G-C.9 membership authority` |
| 4 | **Outros** | cada gate G-C/G-B restante | 1 PR / gate |

### 7.2 Proibições de commit

```text
NÃO misturar Pacote A + B + C
NÃO incluir drizzle 0063/0064 sem Migration GO
NÃO incluir apps/** em PR de authority backend
NÃO push force / rebase destrutivo
NÃO auto-merge
```

### 7.3 Pré-commit validation (por pacote)

```text
dedicated tests PASS
family regression PASS
NEW FAILURES = 0
git diff -w scope audit (AUTHORIZED only)
staffAuth export untouched (salvo PR dedicada futura)
```

### 7.4 Sync com remote

Branch **behind 2** — antes de push de qualquer pacote:  
`fetch` + estratégia Owner (rebase vs merge) **explicitamente autorizada**. Não inferir.

---

## 8. Matriz de autorização atual

| Ação | Estado |
|---|---|
| G-D CODE (qualquer subgate novo) | **NOT AUTHORIZED** |
| G-E / E-13 / WS / G-B.2+ | **NOT AUTHORIZED** |
| Migration / DB apply / Seed | **NOT AUTHORIZED** |
| Staging / Production / Deploy | **NOT AUTHORIZED** |
| Commit | **NOT AUTHORIZED** |
| Push | **NOT AUTHORIZED** |
| Análise / catalogação (este doc) | **AUTHORIZED** (Owner) |

---

## 9. Frontend / Design / Motion (contexto Owner)

G-D e G-C.9 nesta wave foram **authority/backend**.  
Apps (`turismo`, `admin`, `guest`, `site-publico`) aparecem dirty no tree global — **OUT-OF-SCOPE** para fechamento G-D.

**Recomendação de design system:** não acoplar PRs de UI Anfitrião/Guest a PRs de guards. Motion/visual polish = fatias UI próprias com screenshots (enterprise-design-system), após authority estável em branch.

---

## 10. Test forensics (síntese das ondas)

| Onda | Evidência de testes (última famíla registrada) |
|---|---|
| G-C.9 | 126 dedicated · 163 family · NEW = 0 |
| G-D.0…D.9 | última fatia D.9: **47 PASS** family · NEW = 0 |
| Typecheck | 24 pre-existing out-of-scope (GC9 report); 0 new atribuídos a GC9/GD paths |

---

## 11. Decisões Owner pendentes (pós-wave)

| ID | Pergunta | Opções |
|---|---|---|
| **OD-WAVE-01** | Autorizar commits isolados conforme §7? | (a) GO pacote 1 docs (b) GO pacote 1+2 (c) defer |
| **OD-WAVE-02** | Atualizar Master Plan Geral §40? | (a) agora em PR docs (b) defer |
| **OD-WAVE-03** | Tratar behind 2 antes de push? | (a) fetch+rebase autorizado (b) merge (c) defer |
| **OD-WAVE-04** | Próxima onda após commits? | G-E · WS · G-B.2 · S10 — **só após** OD-WAVE-01 |

Nenhuma dessas é APPROVED neste documento.

---

## 12. Relatório final obrigatório

```text
=== G-D WAVE CLOSURE / POST-G-D RECONCILIATION ===

G-D PRINCIPAL SEQUENCE:
CLOSED

G-D.4:
DEFER (G-E/E-13)

WS:
SEPARATE GATE

G-E:
SEPARATE

G-C.9:
VALIDATION_PASS_WITH_CONDITIONS (prior)

HEAD:
4a4be7577a1ad94903b57adcadfa1b9f42491889

Working tree:
DIRTY (~329) — PRESERVE

Master Plan Geral §40:
STALE / DRIFT

Commit packages proposed:
A=G-D · B=G-C.9 · C=OUT-OF-SCOPE

Implementation next:
NOT AUTHORIZED

Migration:
NOT AUTHORIZED

Commit:
NOT AUTHORIZED

Push:
NOT AUTHORIZED

Staging / Production:
NOT AUTHORIZED

Catalog:
.agents/shared/GD_WAVE_CLOSURE_POST_RECONCILIATION.md

NEXT OWNER DECISION:
OD-WAVE-01 (commit policy) — not CODE GO for new gates

STOP
```

---

*Fim do catálogo Wave Closure. Integridade > velocidade.*
