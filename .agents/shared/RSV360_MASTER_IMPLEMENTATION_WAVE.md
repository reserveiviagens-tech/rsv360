# RSV360 — MASTER IMPLEMENTATION WAVE — Plano Abrangente Executável

> **Proveniência:** plano fornecido pelo Owner (Gatekeeper) e persistido como **controlador normativo** das ondas e gates. Conteúdo reproduzido fielmente.
> **Persistido em:** `.agents/shared/RSV360_MASTER_IMPLEMENTATION_WAVE.md`
> **Base arquitetural:** `C36-ID-02 Enterprise/Tenant Security Contract` (`.agents/shared/C36ID02_SECURITY_CONTRACT.md`)
> **Branch de referência:** `feat/c36dd-refund-request-domain`
> **HEAD de referência:** `61040b02eb076e6ba1704210d0726a63a3490b9c`

Status: READY_FOR_GATED_EXECUTION
Modo: Governança por Waves / Workstreams / Gates

---

## 1. Objetivo

Conduzir a evolução do RSV360 para uma arquitetura SaaS multiempresa segura, preservando:

- Enterprise como Tenant Boundary;
- User ↔ Enterprise N;
- autorização contextual;
- Property Scope;
- PLATFORM_SUPER_ADMIN;
- Step-Up Authentication;
- Device Security;
- Critical Approval;
- segregação financeira;
- isolamento de pagamentos/refunds;
- compatibilidade progressiva com o legado;
- governança de migrations;
- qualidade de CI;
- rastreabilidade de decisões;
- execução incremental e reversível.

A implementação será feita em **ondas**, e não como alteração monolítica.

---

## 2. Regras absolutas

Nenhuma onda poderá violar:

```
SECURITY / LGPD
    >
AGENTS.md
    >
PACR-Ampla
    >
Enterprise Rules
    >
Architecture Contracts
    >
Implementation Plans
    >
Executor
```

Também permanecem:

```
PASS ≠ GO
PLAN_PASS ≠ CODE_AUTHORIZED
TEST_PASS ≠ MIGRATION_AUTHORIZED
```

Bloqueios globais:

```
MIGRATION APPLY       ❌
DATABASE WRITE        ❌
STAGING               ❌
DEPLOY                ❌
PRODUCTION            ❌
REAL GATEWAY          ❌
REAL REFUND           ❌
PAYOUT                ❌
COMMIT                ❌
PUSH                  ❌
```

até que cada ação receba seu gate específico.

---

## 3. Governance Model

### 3.1 Gatekeeper

Antigravity / Orchestrator:

- mantém arquitetura;
- produz Implementation Plans;
- reconcilia diffs;
- controla scope;
- determina readiness;
- impede scope drift;
- fecha gates.

### 3.2 Executor

Cursor / Cline / executor autorizado:

- implementa somente o Implementation Plan;
- não redefine arquitetura;
- não altera contratos;
- não amplia escopo;
- não aplica migration;
- não executa financeiro real.

### 3.3 Single Writer Lock

Arquivos compartilhados por:

```
authentication
authorization
enterprise context
multi-property
payments
drizzle
security middleware
```

não poderão ser modificados simultaneamente por agentes independentes.

Paralelismo permitido:

```
DISCOVERY
ANALYSIS
TEST DESIGN
DOCUMENTATION
```

Escrita:

```
SERIALIZED
```

ou em worktrees realmente isolados com reconciliação central posterior.

---

## 4. Current Baseline

```
C36-ID-02 A            DECIDED
C36-ID-02 B            DECIDED
D-ID02-NS              DECIDED — C (Transitional Dual-Key / Bridge)   [W1 §19]
ADD-3                  DECIDED — server/modules/**                     [W1 §19]

Security Contract      ACTIVE
WS-15..WS-19           MAPPED
WS-04                  PLAN AUTHORIZED / CODE BLOCKED
C5                     PLAN AUTHORIZED / CODE BLOCKED
DE-14                  PLAN AUTHORIZED / CODE BLOCKED
C36-DE-05              PASS / CLOSED

Working tree           DIRTY
Protected rule         CRLF-only churn (W0-F7 — risco rebaixado)
88 tracked modifications
131 untracked

W0-GATE                BASELINE_RECONCILED
W1-GATE                PASS
```

O estado dirty é considerado **baseline contamination**.

Nenhum agente poderá interpretar arquivos dirty como alterações próprias sem **proveniência comprovada**.

---

## 5. Wave 0 — Baseline & Contamination Control

**Objetivo**

Estabelecer uma fotografia confiável antes de qualquer escrita.

**Atividades**

**W0.1** — Registrar: HEAD; branch; `origin/main`; tracked diff; untracked inventory; stashes; protected files; migration journal; `.agents/shared`; rules; CI configuration.

**W0.2** — Classificar cada alteração: `PREEXISTING` / `CURRENT-GATE` / `UNRELATED` / `PROTECTED` / `UNKNOWN`.

**W0.3** — Reconstruir **collision graph**.

**W0.4** — Determinar quais arquivos podem ser utilizados por cada Workstream.

**W0.5** — Confirmar que `.cursor/rules/enterprise-pr-policy.mdc` possui alteração pré-existente e **não deve ser revertido automaticamente**.

**Gate**

```
W0-GATE = BASELINE_RECONCILED
```

Sem esse gate:

```
NO SHARED-WRITE
NO CLEANUP
NO RESET
NO STASH
NO COMMIT
```

---

## 6. Wave 1 — Architectural Decisions

Esta onda resolve as duas pendências que atualmente bloqueiam WS-04/C5/DE-14.

### W1-A — D-ID02-NS

**Questão:** definir namespace de Enterprise.

Alternativas:

```
A — INTEGER
B — UUID
C — TRANSITIONAL DUAL-KEY / BRIDGE
```

**Requisito:** a decisão deve especificar: identificador interno; identificador externo; API; JWT; relacionamento entre chaves; índices; uniqueness; FKs; translation boundary; compatibilidade; rollback; impacto em payments; impacto em legacy; estratégia de migração.

**Invariante:** Namespace **não** é autorização.

### W1-B — ADD-3

**Questão:** definir a árvore canônica de autorização.

Alternativas existentes:

```
server/modules/**
backend/server/modules/**
```

**Proibição:** não criar uma terceira árvore apenas para `authorization`.

**Critérios:** ownership; imports; runtime; módulos existentes; CODEOWNERS; CI; dependency direction; shared middleware; circular dependency risk; migration ownership; future platform-admin; future RBAC; compatibility with existing modules.

**Gate**

```
D-ID02-NS = DECIDED
ADD-3     = DECIDED
```

> **SATISFIED** — Owner, 2026-10-03 (registro: `C36ID02_W1_ARCHITECTURAL_DECISION_RECORD.md` §19).

Somente após W1:

```
WS-04 PLAN AUTHORIZED
WS-15 PLAN AUTHORIZED
```

---

## 7. Wave 2 — Enterprise Context

**Workstream WS-04**

Objetivo: criar um único conceito de **Authorized Enterprise Context**.

Corrigir:

```
req.enterpriseId
req.user.enterpriseId
path/query/header tenant authority
ent_1
payment enterprise input
refund enterprise context
tenant middleware
```

**Regra:** o cliente pode **solicitar** contexto. O servidor **decide** se o contexto é autorizado.

Resultado:

```
Authenticated Identity
        ↓
Membership
        ↓
Selected Enterprise
        ↓
Authorization
        ↓
req.authorizedEnterpriseContext
```

Nenhuma rota deve depender de carrier cliente-controlável como autoridade final.

**Gate:** `WS04-CONTEXT-PASS`

---

## 8. Wave 3 — RBAC / Membership

**Workstream WS-15**

Objetivo: transformar o modelo N em autoridade efetiva.

Fases: inventário; equivalência de roles; conflito de vocabulários; canonical roles; permission model; compatibility layer; server-side enforcement; property scope.

Roles canônicos previamente definidos:

```
PRESIDENT
DIRECTOR
MANAGER
SUPERVISOR
OPERATOR
USER
PARTNER
```

A existência desses nomes **não autoriza** sua implementação antes da reconciliação.

**Gate:** `WS15-RBAC-PASS`

---

## 9. Wave 4 — Property Authorization / C5

**WS-03 / C5**

Objetivo: garantir que `Enterprise authorization + Property authorization` sejam verificadas **independentemente**.

Escopo: property ownership; membership; access; `/:id`; `/:id/settings`; `/:id/users`; property switching; consolidated resources; property repositories.

**Regra:** nunca `first property`, `first active property`, `propertyId = 1` como fallback de autorização.

**Gate:** `C5-PROPERTY-AUTH-PASS`

---

## 10. Wave 5 — Platform Security

Esta onda poderá ser paralelizada **documentalmente**, mas sua implementação permanecerá **serializada** nas superfícies compartilhadas.

**WS-16 — PLATFORM_SUPER_ADMIN:** identidade exclusiva; platform authority; explicit enterprise context; privileged audit; no financial bypass.

**WS-17 — STEP-UP:** reutilizar `user_2fa`, `login_2fa_challenges`, `auth_login_protection`, MFA audit/policy. Não duplicar login MFA. Adicionar somente o conceito de Step-Up necessário para operações críticas.

**WS-18 — DEVICE SECURITY:**

```
Device Identity
+ Credential
+ Fingerprint / binding
+ MAC complementary signal
+ Device State
```

Estados: `UNKNOWN_DEVICE` `PENDING_REGISTRATION` `APPROVED` `REVOKED` `SUSPENDED`

**WS-19 — CRITICAL APPROVAL:** canais Email / SMS / WhatsApp / Secondary Email. Requisitos: single-use; expiration; operation binding; context binding; audit; replay protection. **Não substitui SoD.**

---

## 11. Wave 6 — Payments / Refund Reconciliation

**WS-07** — somente depois de WS-04.

Reconciliar: payment enterprise context; refund request enterprise context; customer; subscription; PIX; payment routes; payment services; tenant-from-body/query sites.

**Proibição:** não aceitar `req.body.enterpriseId` / `req.query.enterpriseId` como autoridade final.

---

## 12. Wave 7 — C36-DE-14

DE-14 será **replanejado**, não simplesmente executado sobre o plano antigo.

Novo contrato esperado: `Create` `Get` `Approve` `Reject` `Cancel` com tenant isolation, JWT identity, SoD, CAS, error mapping.

Mapeamento:

```
Tenant mismatch       → 403
Authorization         → 403
CAS                   → 409
Illegal transition    → 422
Malformed/unknown id  → 404
Generic unexpected    → 500
```

**Proibições:** REST não expõe `executeApprovedRefund`, `reconcileSingleRequest`, `orchestrateRefundAccounting` sem novo gate específico.

---

## 13. Wave 8 — Refund Execution

Somente depois de DE-14 e de seus gates: **C36-DE-06**.

Escopo potencial:

```
Approved RefundRequest
       ↓
Execution
       ↓
Mock / injected gateway
       ↓
Accounting
       ↓
Ledger
```

Nenhum gateway real. Nenhum payout. Nenhuma produção.

---

## 14. Wave 9 — Ledger / Earnings / Financial Integrity

**WS-08**

Reconciliar: earnings; reversal; ledger; refund accounting; idempotency; immutable financial history; settlement boundaries; payout boundaries.

**Regra:** `HTTP decision ≠ financial execution`

---

## 15. Wave 10 — Partner / Affiliate / Marketplace

**WS-06** — depois da estabilização de tenant context.

```
Partner
 ↓
Affiliate
 ↓
Marketplace
 ↓
Split
 ↓
Earnings
 ↓
Ledger
 ↓
Payout
```

Reconciliar: `partnerId`; enterprise; property; affiliate; recurring commission; ledger; wallet; payout.

Financial execution **permanece bloqueada** até os respectivos gates.

---

## 16. Wave 11 — Notifications

**WS-09**

Aplicar o contrato de contexto: `Enterprise + Property + Permission`.

Os casos identificados no **C36-ID-05** permanecem válidos.

Nenhuma rota pode recuperar contexto por fallback arbitrário.

---

## 17. Wave 12 — API / Contract Surface

**WS-10**

Atualizar: OpenAPI; DTOs; schemas; authentication; tenant context; errors; API contracts.

Especial atenção: `enterpriseId`, `userId`, `propertyId` **não devem** aparecer como campos capazes de sobrescrever identidade/contexto autorizado.

---

## 18. Wave 13 — Regression Architecture

**WS-11**

Criar matriz: Identity / Tenant / Membership / Permission / Property / SoD / Step-Up / Device / Critical Approval / Financial.

Cada camada deve possuir **testes negativos**. Exemplos:

```
missing identity      → 401
wrong role            → 403
wrong enterprise      → 403
missing context       → 403
wrong property        → 403
self approval         → 403
stale version         → 409
illegal transition    → 422
```

---

## 19. Wave 14 — CI Slice Gate

O CI Slice Gate será tratado como gate de **primeira classe**.

```
Implementation Slice
       ↓
Tests
       ↓
Typecheck
       ↓
Static Scope Scan
       ↓
Security Regression
       ↓
PR
       ↓
CI
       ↓
Gate
       ↓
Next Slice
```

Parallel implementation só poderá ocorrer em **worktrees isolados** e após **collision analysis**.

---

## 20. Wave 15 — Staging

Staging somente após: Architecture PASS · Code PASS · CI PASS · Migration Plan PASS · Security PASS · Rollback PASS.

O staging existente **não** será tratado como greenfield. Deve ser reconciliado com: VPS; Docker; PostgreSQL; Redis; backend; frontend; existing workflows; existing migrations.

---

## 21. Wave 16 — Production Readiness

Produção é o **último** gate. Requisitos:

```
Tenant isolation PASS
Authorization PASS
Security PASS
CI PASS
Staging PASS
Migration PASS
Rollback PASS
Observability PASS
Financial safety PASS
Audit PASS
```

**Nenhuma aprovação anterior implica autorização de produção.**

---

## 22. Dependency Graph

```
                 C36-ID-02 A/B
                       │
             Security Contract
                       │
          ┌────────────┴────────────┐
          │                         │
      D-ID02-NS                  ADD-3
          │                         │
          └────────────┬────────────┘
                       │
                    WS-04
                       │
                 ┌─────┴─────┐
                 │           │
               WS-15       WS-16
                 │           │
                 │      ┌────┼────┐
                 │      │    │    │
                 │    WS-17 WS-18 WS-19
                 │
                 ▼
                  C5
                 │
        ┌────────┴────────┐
        │                 │
      WS-07             WS-09
        │
      DE-14
        │
      DE-06
        │
      WS-08
        │
      WS-06
        │
      API / Regression
        │
      CI Slice Gate
        │
      Staging
        │
      Production
```

---

## 23. Parallelism Model

**Pode ser paralelo:** documentation · forensic discovery · test design · static analysis · architecture comparison

**Não pode ser paralelo sem isolamento:** auth · authorization · enterprise context · multi-property · payments · drizzle · shared middleware

**Nunca simultaneamente:** migration writer · financial writer · production executor

---

## 24. File Ownership Model

Cada Implementation Plan deverá declarar:

```
ALLOWED FILES
READ-ONLY FILES
FORBIDDEN FILES
EXPECTED DIFF
TEST FILES
```

Qualquer arquivo fora da lista: **SCOPE CONFLICT** — e o executor deve **parar**.

---

## 25. Required Evidence Per Gate

Cada gate deverá registrar:

```
HEAD / BRANCH / START_TIME / END_TIME
FILES_READ / FILES_MODIFIED / FILES_CREATED / FILES_DELETED
TESTS / TYPECHECK / STATIC_SCAN / SECURITY_SCAN
MIGRATION_STATUS / DB_STATUS / STAGING_STATUS / PRODUCTION_STATUS
SCOPE_DRIFT / FAILURE_CLASSIFICATION / FINAL_VERDICT
```

Categorias de falha:

```
IMPLEMENTATION_FAILURE
TEST_FAILURE
ENVIRONMENT_FAILURE
PREEXISTING_FAILURE
SCOPE_CONFLICT
SECURITY_FAILURE
ARCHITECTURE_CONFLICT
```

---

## 26. Execution Order

```
0.  Baseline / Contamination
1.  D-ID02-NS
2.  ADD-3
3.  WS-04
4.  WS-15
5.  C5
6.  WS-16/17/18/19
7.  WS-07
8.  DE-14
9.  DE-06
10. WS-08
11. WS-06
12. WS-09 / WS-10
13. WS-11
14. CI Slice Gate
15. Staging
16. Production Readiness
```

---

## 27. Immediate Execution Gate

O plano está pronto.

Entretanto, a execução de código **não deve começar ainda** porque existem dois inputs arquiteturais obrigatórios:

```
D-ID02-NS
ADD-3
```

A primeira ação executável da onda abrangente é portanto:

```
W0 — Baseline / Contamination Control, em modo read-only.
```

Depois:

```
W1 — Architectural Decisions.
```

Somente após W1 será permitido produzir os Implementation Plans de WS-04 e WS-15.

---

## 28. Master Gate

```
MASTER WAVE
STATUS = READY_FOR_GATED_EXECUTION

W0      = PASS / CLOSED
W1      = PASS (D-ID02-NS = C · ADD-3 = server/modules/**)
WS-04   = PLAN AUTHORIZED / CODE BLOCKED
WS-15   = PLAN AUTHORIZED / CODE BLOCKED
C5      = PLAN AUTHORIZED / CODE BLOCKED
DE-14   = PLAN AUTHORIZED / CODE BLOCKED

CODE        = CLOSED
MIGRATION   = CLOSED
DB          = CLOSED
STAGING     = CLOSED
PRODUCTION  = CLOSED
```

**Regra final:**

> Nenhum executor poderá interpretar este Master Plan como autorização para ultrapassar um gate individual. Cada onda abre somente o escopo explicitamente autorizado por seu próprio Gate.

---

*Fim do Master Implementation Wave.*