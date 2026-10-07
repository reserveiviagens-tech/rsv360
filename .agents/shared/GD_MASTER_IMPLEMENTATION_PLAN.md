# RSV360 — G-D MASTER IMPLEMENTATION PLAN

**Gate:** G-D — Propostas / Agentes  
**Base:** Discovery ACCEPTED · OD-GD-01…12 CLOSED (`GD_OWNER_DECISION_REGISTER.md`)  
**Data:** 2026-10-06  
**Branch / HEAD (plano):** `feat/c36dd-refund-request-domain` @ `4a4be7577a1ad94903b57adcadfa1b9f42491889`  

| Campo | Valor |
|---|---|
| PLAN status | **PLAN_PASS / PLAN_READY** |
| CODE | **NOT AUTHORIZED** |
| Implementation | **NOT OPENED** |
| Migration / DB / Seed | **BLOCKED** |
| Staging / Production | **BLOCKED** |
| Commit / Push | **BLOCKED** |
| Primeiro CODE | exige `CODE GO — G-D.0` (explícito) |

Protocolo: `STOP → RECONCILE → DECIDE → AUTHORIZE → EXECUTE → VALIDATE → CLOSE`  
Decisões fechadas. **AUTHORIZE (CODE)** ainda não emitido.

---

## 1. Owner Decisions consolidadas

| ID | Status | Decisão efetiva |
|---|---|---|
| OD-GD-01 | APPROVED | RANK = **adapter local documentado** (nunca contrato global) |
| OD-GD-02 | APPROVED | **Matriz canônica obrigatória** (esqueleto abaixo; detalhe operacional neste plano) |
| OD-GD-03 | APPROVED | `agentAuth` = **alias documentado** de `staffAuth` |
| OD-GD-04 | APPROVED | Aprovadores = **somente admin** |
| OD-GD-05 | **DEFERRED** | `enterpriseId` → **G-E / E-13** (carrier ≠ autoridade em G-D) |
| OD-GD-06 | APPROVED | Partner role `agente` **FORA** de AI / propostas staff / `agentAuth` |
| OD-GD-07 | APPROVED | `resolvePapel`: body = hint; diverge claim → **DENY** |
| OD-GD-08 | APPROVED | `GET /agentes/config` → **JWT obrigatório** |
| OD-GD-09 | APPROVED | WS body authority → **gate separado** (não na sequência CODE G-D) |
| OD-GD-10 | APPROVED | MGM `indicadorId` → binding ao authenticated user |
| OD-GD-11 | APPROVED | valorTotal / voucher / aprovação → **PA-DEC-006** |
| OD-GD-12 | APPROVED | Ordem CODE: **D.0 → D.1 → D.8 → demais por dependência** |

Decisões preservadas (não reinterpretar): PA-DEC-001…011 · OD-9c-A/B · G-C.9 CLOSED.

---

## 2. Arquitetura canônica G-D

### 2.1 Glossário (OD-GD-06)

```text
Partner role "agente"  ≠  AI module /agentes  ≠  agentAuth (HITL/DELETE alias)
```

### 2.2 Cadeias de autoridade em Propostas

| Cadeia | Status canônico |
|---|---|
| `staffAuth` | Autoridade staff JWT (admin/manager/user allowlist legado do middleware) — **não alterar export global** |
| `agentAuth` | **Alias documentado** de `staffAuth` (OD-GD-03); remoção futura = gate próprio |
| RANK local | **Adapter documentado** (OD-GD-01); usado só onde a matriz exigir (aprovação) |

### 2.3 Matriz canônica — esqueleto operacional (OD-GD-02 + OD-GD-04)

> Detalhamento final registrado aqui. Ajuste fino por rota ocorre em G-D.1 CODE (sem inventar roles).

| Operação | Autoridade canônica G-D | Notas |
|---|---|---|
| Create | `staffAuth` (roles do allowlist staff legado) | Sem Partner `agente` |
| Edit / status | `staffAuth` | Idem |
| View (staff list/templates) | `staffAuth` | |
| View (público / owner / redacted) | `proposta-access` + token `rt-*` / owner email | Preservar IDOR PR-03b |
| Approve | **admin only** | OD-GD-04; RANK adapter documenta equivalência rank≥supervisor ∩ admin |
| Reject | **admin only** | Idem |
| HITL takeover/release | `agentAuth` (= staffAuth alias) | Documentar; não criar set novo |
| DELETE | `agentAuth` (= staffAuth alias) | Idem |
| `user` | Pode passar staffAuth onde allowlist incluir; **não** é staff em `proposta-access` (Set admin/manager) | Assimétrica legado — alinhar em D.1/D.3 sem presumir privilégio |
| `supervisor` | **Sem** autoridade de aprovação neste plano | OD-GD-04 |

### 2.4 Enterprise / Partner / Economic

| Dimensão | Regra G-D |
|---|---|
| Enterprise Context | Não introduz membership plug global nesta onda; superfícies AI FLAG ON exigem JWT (+ EC quando matriz do subgate exigir) |
| `enterpriseId` | **Carrier only** — DEFER G-E/E-13 (OD-GD-05) |
| Partner Authority | Fora de propostas staff / AI / agentAuth (OD-GD-06) |
| Economic | valorTotal / voucher / aprovação = **PA-DEC-006** composition (OD-GD-11) em subgate econômico |
| Body | **nunca** authority (OD-GD-07 / OD-GD-10) |

### 2.5 RANK adapter (OD-GD-01)

Contrato documental (implementação em D.0/D.1):

```text
ROLE_RANK / hasMinRole
  = adapter LOCAL de classificação operacional
  ≠ contrato global de autorização RSV360
  ≠ RoleAssignment / membership authority
```

Aprovação efetiva = allowlist **admin** (OD-GD-04), com adapter RANK preservando comportamento legado bit-a-bit sob FLAG OFF quando aplicável.

---

## 3. Dependências e exclusões

| Item | Tratamento |
|---|---|
| G-C.9 acomodações | CLOSED — não reabrir |
| `staffAuth` export global | **PROIBIDO** alterar (blast radius multi-módulo) |
| G-D.4 enterpriseId | **EXCLUÍDO** → G-E/E-13 |
| WS body authority | **EXCLUÍDO** da sequência G-D → gate separado (OD-GD-09) |
| Payments / refund / payout / gateway | **FORA** |
| Cotacao-publica | Boundary contratual (D.9) — sem merge de módulos |

---

## 4. Ordem dos subgates (OD-GD-12)

```text
G-D.0  →  G-D.1  →  G-D.8  →  (demais por dependência)
```

Cada subgate exige **CODE GO — G-D.X** separado. Sem auto-open.

| Ordem | Gate | Escopo | Depende de |
|---|---|---|---|
| 1 | **G-D.0** | Glossário/boundary + RANK adapter docs + baseline testes estáticos | ODs CLOSED |
| 2 | **G-D.1** | Matriz HTTP: alias agentAuth, wiring approve/deny admin-only, documentação matriz | D.0 PASS |
| 3 | **G-D.8** | AI agentes: JWT em `/config` + `resolvePapel` hint/DENY | D.1 PASS |
| 4 | **G-D.3** | Alinhar `proposta-access` STAFF_ROLES vs allowlist (sem presumir `user`) | D.1 |
| 5 | **G-D.10** | MGM `indicadorId` binding (OD-GD-10) | D.1 |
| 6 | **G-D.6** | Economic composition PA-DEC-006 (valorTotal/voucher/aprovação) | D.1 + OD-GD-11 |
| 7 | **G-D.2** | Formalizar adapter RANK no código (comentários/helpers) se residual após D.1 | D.0/D.1 |
| 8 | **G-D.7** | Residual AI flags/hardening se não coberto em D.8 | D.8 |
| 9 | **G-D.9** | Boundary cotacao-publica × propostas (contrato/docs/tests) | D.1 |
| — | **G-D.4** | N/A / DEFERRED G-E/E-13 | — |
| — | **G-D.5 / WS** | N/A nesta sequência — **gate separado** OD-GD-09 | — |

Nota: inventário Discovery D.5/D.7 renumerados na execução conforme OD-GD-09/12; WS não abre com G-D.

---

## 5. Escopo por subgate (contrato)

### G-D.0 — Foundation / adapter / boundary

| | |
|---|---|
| **Allowed** | Docs `.agents/shared` G-D; comentários/JSDoc em `propostas/rbac.ts` (adapter); testes estáticos de contrato (sem mudança de comportamento FLAG OFF) |
| **Prohibited** | Mudar allowlists runtime; alterar `staffAuth` global; AI routes; WS; migrations |
| **Tests** | dedicated: contrato RANK ≠ global; boundary Partner≠AI≠agentAuth |
| **PASS** | Docs+adapter contract green; FLAG OFF bit-a-bit; 0 NEW failures |
| **STOP** | Qualquer mudança semântica de authz; alteração staffAuth export |

### G-D.1 — Matriz HTTP propostas

| | |
|---|---|
| **Allowed** | `server/modules/propostas/routes/index.ts`; helpers locais; testes `rbac-aprovacao` / guards dedicados |
| **Prohibited** | `auth.middleware.ts` staffAuth export; membership global; enterpriseId authority; WS; payments |
| **Tests** | dedicated approve/deny admin-only; agentAuth≡staffAuth; family propostas auth |
| **PASS** | Matriz materializada; OD-GD-03/04 refletidos; FLAG OFF legado |
| **STOP** | Promover supervisor; Partner composition; enterprise authority |

### G-D.8 — Agentes AI auth

| | |
|---|---|
| **Allowed** | `server/modules/agentes/routes/index.ts`; `instrutor/papel.ts`; testes agentes-* |
| **Prohibited** | Propostas HTTP; WS; Partner; economic write |
| **Tests** | JWT obrigatório em `/config`; resolvePapel diverge → DENY; FLAG OFF fail-closed |
| **PASS** | OD-GD-07/08 implementados; 0 NEW failures |
| **STOP** | Body prevalece sobre claim |

### G-D.6 — Economic (posterior)

| | |
|---|---|
| **Allowed** | Rotas/serviços propostas tocados por valorTotal/voucher/aprovação **somente** com composition PA-DEC-006 |
| **Prohibited** | Gateway real; refund; payout; durable financial fora de escopo |
| **PASS** | Composition + audit/caps; FLAG OFF legado documentado |

### G-D.10 — MGM binding (posterior)

| | |
|---|---|
| **Allowed** | Path MGM/indicação propostas |
| **Prohibited** | Confiar em `indicadorId` body como autoridade |
| **PASS** | Binding JWT; mismatch DENY |

---

## 6. Allowed / Prohibited files (onda G-D — visão geral)

### Allowed (quando subgate respectivo tiver CODE GO)

```text
server/modules/propostas/**          (exceto alterações econômicas sem D.6 GO)
server/modules/agentes/**
backend/src/__tests__/**/*proposta*
backend/src/__tests__/**/*agente*
backend/src/__tests__/**/*rbac-aprovacao*
.agents/shared/GD_*.md
```

### Prohibited (sempre nesta onda, salvo Owner token explícito)

```text
server/middleware/auth.middleware.ts   (staffAuth export / requireRole global)
server/modules/membership/**           (exceto se OD futura exigir plug — hoje NÃO)
migrations/** / drizzle apply
payments / refund / payout / gateway
apps/** (salvo bug documentado fora de escopo — não misturar)
WS body authority implementation       (gate separado OD-GD-09)
enterpriseId → ECtx                    (G-E/E-13)
```

---

## 7. Estratégia de testes

| Nível | Conteúdo |
|---|---|
| Dedicated | Por subgate (guards/contracts/static wiring) |
| Family | propostas auth + agentes-* + rbac-aprovacao + IDOR |
| Global | Quando autorizado; classificar NEW vs PRE-EXISTING vs baseline |
| Typecheck | Separar new / pre-existing / out-of-scope |

Regra: **NEW FAILURE ≠ baseline failure**. Não fabricar PASS.

---

## 8. Proveniência

- Diff semântico ≠ EOL/format-only.
- Working tree dirty herdado = CONDITION (não atribuir a fatia sem evidência).
- Não reinterpretar PA-DEC / OD-9c.

---

## 9. Migration / DB / Git boundaries

```text
Migration / Schema Apply = NOT AUTHORIZED
DB durable write / Seed  = NOT AUTHORIZED
Staging / Production     = NOT AUTHORIZED
Commit / Push            = NOT AUTHORIZED (até Owner autorizar)
Refund / Payout / Gateway= NOT AUTHORIZED
```

---

## 10. PASS / STOP criteria (plano)

### PLAN_PASS (este documento)

Satisfaz se:

1. OD-GD-01…12 CLOSED  
2. Arquitetura canônica + matriz esqueleto registradas  
3. Ordem subgates + exclusões (D.4 DEFER, WS gate separado) claras  
4. Escopos / allowed / prohibited / tests definidos  
5. CODE permanece NOT AUTHORIZED  

### STOP (implementação)

- CODE sem `CODE GO — G-D.X`  
- Alterar `staffAuth` global  
- Promover RANK a contrato global  
- Tratar Partner `agente` como AI/agentAuth  
- Body-as-authority  
- enterpriseId como autoridade em G-D  
- Misturar WS body gate  
- Migration/commit/push sem autorização  

---

## 11. Veredito

```text
G-D DISCOVERY              = ACCEPTED
OD-GD-01…12                = CLOSED
DECISION REGISTER          = CLOSED / OWNER APPROVED
G-D MASTER IMPLEMENTATION  = PLAN_PASS / PLAN_READY

CODE                       = NOT AUTHORIZED
G-D.0 … G-D.9              = NOT OPENED
IMPLEMENTATION             = NOT EXECUTED

Next required authorization:
  CODE GO — G-D.0
```

```text
PLAN_PASS ≠ CODE GO
Owner Decision ≠ Implementation Authorization
NO AUTOMATIC SUBGATE OPEN
STOP
```

*Fim — G-D Master Implementation Plan.*
