# RSV360 — W1 ARCHITECTURAL DECISION RECORD (ADR)

> **Origem:** ADR fornecido pelo Owner/Gatekeeper, persistido integralmente.
> **Wave:** W1 — Architectural Decisions
> **Prerequisite:** `W0-GATE = BASELINE_RECONCILED` ✅ (ver `C36ID02_W0_BASELINE_CONTAMINATION_REPORT.md`)
> **Persistido em:** `.agents/shared/C36ID02_W1_ARCHITECTURAL_DECISION_RECORD.md`
> **Status:** `W1-GATE = PASS` — decisões `D-ID02-NS = C` e `ADD-3 = server/modules/**` registradas em **§19** (Owner, 2026-10-03)

```
Decisão:    REGISTRADA (§19) — D-ID02-NS = C · ADD-3 = server/modules/**
W1-GATE:    PASS

Código:     NÃO AUTORIZADO
Migration:  NÃO AUTORIZADA
DB:         NÃO AUTORIZADO
Staging:    NÃO AUTORIZADO
```

---

## 1. Objetivo

Resolver formalmente os dois bloqueios arquiteturais necessários para abrir:

```
WS-04
WS-15
C5
DE-14
```

Decisões: `D-ID02-NS` e `ADD-3`.

---

## 2. D-ID02-NS — Enterprise Namespace

### 2.1 Alternativa A — INTEGER

Manter o identificador inteiro como namespace principal.

**Vantagens:** compatibilidade imediata com `enterprises`; menor transformação estrutural; menor impacto inicial no legado.

**Riscos:** exposição direta de identificadores sequenciais; maior acoplamento entre API e representação interna; incompatibilidade arquitetural com partes do domínio que já trabalham com UUID; maior dificuldade de evolução para uma fronteira externa independente.

**Importante:** INTEGER **não é, por si só, vulnerabilidade de autorização**. A autorização continuará dependendo do Enterprise Context e das permissões.

---

## 3. Alternativa B — UUID

Adotar UUID como namespace único.

**Vantagens:** alinhamento com partes do domínio de payments; namespace externo não sequencial; melhor separação entre identidade externa e representação legada; reduz necessidade de expor IDs sequenciais.

**Riscos:** impacto elevado no legado; maior superfície de migração; necessidade de reconciliar FKs; risco de transformar uma decisão de namespace em **migração física prematura**; payments já utiliza UUID em determinadas superfícies, enquanto enterprises/properties possuem legado integer.

**UUID também não resolve autorização.**

---

## 4. Alternativa C — Transitional Dual-Key / Bridge

Separar explicitamente:

```
Internal Legacy Identity
        +
External Enterprise Namespace
```

com tradução controlada no boundary.

Modelo conceitual:

```
External Enterprise UUID
        ↓
Server-side translation
        ↓
Internal Enterprise Identity
        ↓
Membership / Authorization
        ↓
Resource Scope
```

**Vantagens:** preserva compatibilidade com o legado; permite evolução progressiva; reduz necessidade de big-bang migration; acomoda payments UUID; permite APIs externas independentes do identificador interno; permite futura remoção gradual do legado; mantém autorização separada do namespace.

**Riscos:** dois identificadores durante a transição; exige regras explícitas de tradução; exige uniqueness/index/integrity; exige boundaries claros; aumenta temporariamente a complexidade arquitetural.

**Invariante:**

> A existência de duas chaves **não** significa duas autoridades.

A autoridade continua:

```
Authenticated Identity
→ Membership
→ Authorized Enterprise Context
→ Permission
→ Resource Scope
```

---

## 5. Recomendação D-ID02-NS

```
STATUS         = DECIDED BY OWNER — ver §19 (Owner Decision Record)
DECISION       = C — Transitional Dual-Key / Bridge
RECOMMENDATION = C — Transitional Dual-Key / Bridge
```

**Motivo arquitetural:** o estado atual contém simultaneamente `Legacy Enterprise INTEGER`, `Payments UUID`, `Legacy migrations`, `Drizzle migrations`, `Existing APIs` e `Existing JWT/session assumptions`.

A opção **C** permite estabelecer uma fronteira externa consistente **sem exigir uma substituição física imediata de todo o legado**.

**Condição:** C somente poderá ser implementada mediante contrato específico contendo: external namespace; internal namespace; translation boundary; uniqueness; integrity; API contract; JWT contract; membership lookup; migration strategy; rollback; ownership.

> **Nenhuma dessas mudanças está autorizada nesta W1.**

---

## 6. ADD-3 — Canonical Authorization Tree

Existem atualmente duas superfícies:

```
server/modules/**
backend/server/modules/**
```

O W0 confirmou colisão real em vários Workstreams.

---

## 7. ADD-3 — Alternativa A — `server/modules/**`

**Características observadas:**

- maior árvore modular;
- aproximadamente **31 diretórios** relevantes no inventário W1;
- contém `multi-property`, `notifications`, `partners` e outros módulos de domínio;
- já representa a maior parte do runtime modular.

**Vantagens:** consolidação; evita terceira árvore; menor fragmentação; `authorization` pode ser transversal aos módulos existentes; maior alinhamento com a superfície modular dominante.

**Risco:** payments atualmente possui implementação em `backend/server/modules/payments/**`. Portanto, payments precisa de **plano de convergência**, não de movimentação improvisada.

---

## 8. ADD-3 — Alternativa B — `backend/server/modules/**`

**Estado atual:**

```
backend/server/modules/**
└── payments
```

**Vantagens:** payments já reside nessa árvore; pode parecer mais natural para backend-specific modules.

**Riscos:** transformaria uma árvore de **apenas um módulo** em nova raiz canônica; deixaria a maior parte dos módulos existentes fora da árvore; exigiria convergência de dezenas de módulos; aumenta o risco de uma migração arquitetural transversal; conflita com o princípio de reduzir fragmentação.

---

## 9. Decisão arquitetural recomendada

```
STATUS         = DECIDED BY OWNER — ver §19 (Owner Decision Record)
DECISION       = server/modules/**
RECOMMENDATION = server/modules/**
```

**Razão:** `31 dirs` vs. `1 dir`, e principalmente porque `server/modules/**` já constitui a **árvore modular dominante do domínio**.

A existência de `backend/server/modules/payments/**` deve ser tratada como **superfície divergente a reconciliar**, não como justificativa para criar uma terceira árvore.

---

## 10. ADD-3 — Regra de Convergência

A escolha de `server/modules/**` **não autoriza mover payments imediatamente**.

Primeiro deverão ser produzidos: dependency map; import map; runtime ownership; CODEOWNERS reconciliation; CI impact; migration impact; test impact; rollback strategy.

Somente depois um Implementation Plan poderá autorizar eventual convergência.

---

## 11. Relação entre D-ID02-NS e ADD-3

As decisões são **independentes**, mas **interdependentes operacionalmente**.

```
D-ID02-NS
    ↓
Enterprise identity representation

ADD-3
    ↓
Authorization/runtime ownership
```

Ambas precisam estar decididas antes de WS-04/WS-15.

---

## 12. W1 Gate

```
D-ID02-NS
CURRENT  = DECIDED BY OWNER
DECISION = C

ADD-3
CURRENT  = DECIDED BY OWNER
DECISION = server/modules/**
```

Portanto:

```
W1-GATE = PASS
```

Registro formal da decisão em **§19**.

> **Nota de governança (histórica):** durante toda a coleta de evidência, vigorou `RECOMMENDATION ≠ DECISION` — este ADR **não** registrou C nem `server/modules/**` como decisão antes do pronunciamento do Owner. Nenhum executor podia tratar a recomendação como autorização. A decisão só passou a valer com o registro em §19. E a decisão **não** autoriza código nesta W1 (§19.4).

---

## 13. Pós-W1

Quando ambas forem decididas:

```
W1-GATE
   ↓
WS-04 Implementation Plan
   ↓
WS-15 Implementation Plan
   ↓
C5 Implementation Plan
   ↓
DE-14 Replan
```

Nenhuma dessas etapas deve alterar migration/DB automaticamente.

---

## 14. Preservação do W0

Os seguintes achados permanecem **deliberadamente intactos**:

```
CRLF churn
tenant.service.ts deletion
0063 untracked
DE-06 untracked
stashes
root contamination
protected rule
dirty allowed files
```

**Não executar:**

```
reset
restore
clean
stash
add
commit
push
```

como parte desta W1.

---

## 15. W1 EVIDENCE PACK — verificação read-only

> Evidência coletada **estritamente read-only** durante a W1. Não houve escrita em código,
> migration, DB ou branch. Cada item referencia o artefato original.

### E-1 — Coexistem **três** representações de identidade de enterprise (não duas)

| Representação | Evidência literal |
|---|---|
| INTEGER (`serial`) | `backend/drizzle/0000_living_makkari.sql:31` → `"id" serial PRIMARY KEY NOT NULL` (tabela `enterprises`) |
| INTEGER (FK legado) | `backend/drizzle/0000_living_makkari.sql:65,145,172,196,227` e `backend/drizzle/0008_modulos_novos_0008.sql:3,43,83,96,125,143,161` → `"enterprise_id" integer` |
| UUID | `backend/server/modules/payments/schema.ts:38,54,101,119` → `enterpriseId: uuid('enterprise_id').notNull(),` · `server/modules/marketing/db/schema/communication.ts:57,78` |
| STRING `ent_1` | `packages/shared/src/types/tenant.ts:39` · `packages/shared/src/tenant/routing.ts:59` · `packages/shared/src/auth/session.ts:55` · `backend/src/api/v1/auth/routes.js:22,254,269,288` · `backend/src/api/v1/tenant/routes.js:8` · `backend/src/middleware/enterprise-context.js:8` |
| **UNION (ambiguidade admitida no tipo)** | `server/types/express.d.ts:13` → `enterpriseId?: string \| number;` — comentário na linha 12: *"Runtime uses string enterprise ids (e.g. 'ent_1'); do not narrow to number."* |

**Consequência:** não se trata de escolher entre INTEGER e UUID. O runtime **já opera em três
representações simultâneas**, e a ambiguidade está **formalmente tipada** (`string | number`).
Isto é evidência material a favor de **C** — e não de A nem B isoladamente.

### E-2 — Divergência de namespace **sem integridade referencial**

`backend/server/modules/payments/schema.ts:37-38`:

```ts
id: uuid('id').defaultRandom().primaryKey(),
enterpriseId: uuid('enterprise_id').notNull(),     // sem .references()
```

O namespace UUID de `enterprise_id` em payments **não declara FK** para `enterprises.id`
(`serial`/INTEGER). Não há *matching* de tipo nem de integridade entre os dois namespaces.

### E-3 — Tenant derivado de fonte controlada pelo cliente (`query || header` + fallback aberto)

`packages/shared/src/types/tenant.ts:37-39`:

```ts
const fromQuery = Array.isArray(input.query) ? input.query[0] : input.query;
const fromHeader = input.header?.trim();
return (fromQuery || fromHeader || input.fallback || 'ent_1').trim();
```

`packages/shared/src/tenant/routing.ts:57-59` → `input.storageEnterpriseId ?? input.fallback ?? 'ent_1'`.

**Consequência:** a resolução de tenant admite `query`/`header` como carrier **antes** do
contexto autorizado, com fallback aberto `'ent_1'`. É precisamente a superfície que **WS-04**
deve fechar. Nenhuma correção é autorizada nesta W1.

### E-4 — Claim JWT copiada verbatim para autoridade de request

`server/middleware/auth.middleware.ts:34` e `:58`:

```ts
enterpriseId: payload.enterpriseId,
```

`backend/src/api/v1/auth/routes.js:22` → `payload.enterpriseId ?? payload.enterprise_id ?? 'ent_1'`.

**Consequência:** o enterpriseId de request é derivado do token (e, na ausência, de `'ent_1'`),
sem etapa de *Membership lookup*. Reforça o **Invariante** da §4: duas chaves ≠ duas autoridades.

### E-5 — Dupla fonte de verdade de schema para as mesmas tabelas (ADD-3 / ADD-4)

- `backend/server/modules/payments/schema.ts:151` →
  `/** C36-DD — request domain (not execution). Mirrors backend/src/db/schema/payments.ts */`
- `backend/src/db/schema/payments.ts:156` → `export const refundRequests = pgTable('refund_requests', {`

A tabela `refund_requests` está declarada em **dois** arquivos de schema Drizzle.
Risco direto para ADD-3/ADD-4 (ownership de runtime e de migration).

### E-6 — Contagem de árvores (base da §9)

```
server/modules/**           = 31 dirs
backend/server/modules/**   =  1 dir  (payments) — 0 arquivos soltos
server/ top-level           = lib, middleware, modules, queues, scripts, types, app.ts
```

### E-7 — Dois namespaces **dentro de uma única migration** (`0062`)

`backend/drizzle/0062_refund_requests.sql`:

```sql
CREATE TABLE IF NOT EXISTS refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  booking_id integer REFERENCES bookings(id) ON DELETE RESTRICT,
  requested_by integer REFERENCES users(id) ON DELETE SET NULL,
  request_version integer NOT NULL DEFAULT 1,
```

UUID (`payments`) e INTEGER (`bookings`, `users`) coexistem na mesma migration.
Evidência factual e não opinativa de que a convivência de namespaces é o **estado atual**.

---

## 16. W1 FINDINGS (novos, derivados da evidência)

- **W1-F1 (ALTA)** — Três representações concorrentes de enterpriseId (INTEGER / UUID / `'ent_1'`)
  com ambiguidade tipada em `server/types/express.d.ts:13`. → sustenta **C**.
- **W1-F2 (ALTA)** — `payments.enterprise_id` é UUID **sem FK** para `enterprises.id` serial.
  → namespace divergente sem integridade; exige contrato de tradução (C).
- **W1-F3 (CRÍTICA — escopo WS-04)** — tenant resolvido por `query || header` com fallback
  `'ent_1'` (`packages/shared/src/types/tenant.ts:39`). → alvo primário de WS-04; **não corrigir agora**.
- **W1-F4 (ALTA — escopo WS-04)** — `payload.enterpriseId` copiado verbatim para `req.user`
  (`auth.middleware.ts:34,58`). → ausência de membership lookup.
- **W1-F5 (ALTA — ADD-3/ADD-4)** — `refund_requests` declarada em dois schemas ("Mirrors").
  → duas fontes de verdade; bloqueia ownership de migration.
- **W1-F6 (MÉDIA)** — `backend/server/modules/**` contém exatamente **1** módulo.
  → Alternativa B canonizaria uma árvore de 1 módulo.

---

## 17. Declaração de não-autorização

```
Durante a execução read-only da W1:
  - NÃO foi criada branch
  - NÃO foi executado reset / restore / clean / stash / add / commit / push
  - NÃO foi alterado código, migration, DB, staging ou produção
  - NÃO foi movido payments
  - NÃO foi criada terceira árvore de módulos
  - NÃO houve autoatribuição de decisão de Owner pelo agente
```

O agente **não** converteu sua própria recomendação em decisão. A decisão foi emitida pelo
Owner somente **após** a W1 read-only, e está registrada em **§19**.

A autorização de **decisão** obtida em §19 **não** constitui autorização de **código** (§19.4).

---

## 18. W1 — Resultado

```
W1-GATE = PASS
```

Decisões registradas em §19:

1. **D-ID02-NS** — `C — Transitional Dual-Key / Bridge` — **DECIDED BY OWNER**
2. **ADD-3** — `server/modules/**` — **DECIDED BY OWNER**

Com o gate aberto, os **Implementation Plans** de `WS-04` e `WS-15` ficam autorizáveis
**como artefatos de plano**, um por fatia (Single Writer Lock / 1 fatia → 1 PR → CI → merge humano).

```
W1-GATE
   ↓
WS-04 Implementation Plan
   ↓
WS-15 Implementation Plan
   ↓
C5 Implementation Plan
   ↓
DE-14 Replan
```

Código, migration, DB, staging e produção permanecem **desautorizados** até que cada
Implementation Plan decline explicitamente seu próprio `CODE gate` (§19.4).

---

## 19. OWNER DECISION RECORD

```
EMITIDO POR = Owner
DATA        = 2026-10-03 11:23 (-03:00)
CANAL       = confirmação explícita na sessão W1
BASE        = W1 Evidence Pack (§15) + W1 Findings (§16)
```

### 19.1 Declaração literal do Owner

> "DECIDO: D-ID02-NS = C e ADD-3 = server/modules/** (recomendação técnica)"

### 19.2 Decisões registradas

```
D-ID02-NS
STATUS      = DECIDED
DECISION    = C — Transitional Dual-Key / Bridge
DECIDED BY  = Owner

ADD-3
STATUS      = DECIDED
DECISION    = server/modules/**
DECIDED BY  = Owner
```

### 19.3 Efeito do registro

- `W1-GATE` transita de `BLOCKED` → **`PASS`**.
- Habilita a produção dos **Implementation Plans** (artefatos de plano), na ordem
  `WS-04` → `WS-15` → `C5` → `DE-14 Replan`, uma fatia por vez.
- **Não** habilita, por si só: escrita de código, migration, DB, staging, produção,
  movimentação de `payments` ou criação de terceira árvore de módulos.

### 19.4 CODE gate — permanece FECHADO

```
CODE           = NOT AUTHORIZED
MIGRATION      = NOT AUTHORIZED
DB             = NOT AUTHORIZED
STAGING        = NOT AUTHORIZED
PRODUCTION     = NOT AUTHORIZED
COMMIT / PUSH  = NOT AUTHORIZED  (.agents/shared/** segue untracked)
```

A decisão autoriza a **forma arquitetural**, não a **execução**. Cada Implementation Plan
deverá declarar seus próprios `allowed files`, `read-only files`, `forbidden files`,
`invariants`, `tests`, `collision controls`, `rollback` e `explicit CODE gate`.

### 19.5 Invariantes que a decisão NÃO revoga

```
Uma chave a mais ≠ uma autoridade a mais.
Autoridade = Authenticated Identity → Membership → Authorized Enterprise Context
             → Permission → Resource Scope.
```

Achados que permanecem **abertos** e não foram corrigidos nesta W1 (§16):

- **W1-F3** — tenant resolvido por `query || header` com fallback `'ent_1'` (escopo WS-04).
- **W1-F4** — `payload.enterpriseId` copiado para `req.user` sem membership lookup (escopo WS-04).
- **W1-F5** — `refund_requests` declarada em dois schemas (ADD-3/ADD-4).

### 19.6 Condição pendente para implementar C

`C` **não** é implementável enquanto não existir contrato específico contendo:
`external namespace`; `internal namespace`; `translation boundary`; `uniqueness`; `integrity`;
`API contract`; `JWT contract`; `membership lookup`; `migration strategy`; `rollback`; `ownership`.

Esse contrato pertence ao **WS-04 Implementation Plan**, não a esta W1.

### 19.7 Preservação

Os achados da W0 (§14) e as descobertas da W1 (§16) permanecem **intactos**.
`C36-DE-05` permanece `PASS / CLOSED` e não é reaberto.
`DE-06` permanece separado e **não** será reimplementado sobre o código órfão achado no W0.
