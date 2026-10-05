# C36-ID-02-NS — TENANT NAMESPACE DECISION PACKAGE

Status: `PENDING_OWNER_DECISION`
Escopo: documento decisório read-only. NÃO contém código, migration, DDL, DB write ou alteração de schema.
Base git preservada: `61040b0` (branch `feat/c36dd-refund-request-domain`)
Renomeação: `C36-ID-02-C` → `C36-ID-02-NS` (correção do Owner: `D-ID02-C` permanece reservado ao sentido original; a decisão de namespace passa a ser **D-ID02-NS**).
Contrato normativo associado: `.agents/shared/C36ID02_SECURITY_CONTRACT.md` (F-0 RESOLVIDO).
Arquivo renomeado fisicamente para `C36ID02NS_TENANT_NAMESPACE_DECISION_PACKAGE.md` (alinhado a `D-ID02-NS`).

| Gate | Estado |
|---|---|
| CODE | NÃO AUTORIZADO |
| MIGRATION APPLY | BLOQUEADO |
| DATABASE WRITE | BLOQUEADO |
| STAGING | BLOQUEADO |
| DEPLOY | BLOQUEADO |
| PRODUCTION | BLOQUEADO |
| REAL GATEWAY / REAL REFUND / PAYOUT | BLOQUEADOS |
| COMMIT / PUSH | BLOQUEADOS |

---

## 0. Precondição

Nenhuma mutação de estado foi executada para produzir este pacote.
Somente leituras (`read_files`), buscas (`git grep`, `Select-String`, `git ls-files`) e listagens.

Os quatro achados ADD-1..ADD-4 são registrados aqui como **requisitos de reconciliação**, não como trabalho a executar.

---

## F-0 — ACHADO DE RECONCILIAÇÃO DOCUMENTAL — **RESOLVIDO** (espelhamento autorizado pelo Owner)

Situação original: a afirmação de que `c36-id-02-security-contract.md` "já foi persistido" **não era confirmada pelo repositório**.

Evidência literal (estado anterior ao espelhamento):

```
> git ls-files | Select-String 'id-02|id02|ID02|security.contract|namespace'
apps/site-publico/k8s/namespace.yaml          <-- único match (não relacionado)

> git ls-files --others --exclude-standard | Select-String 'id-02|id02|ID02|security.contract|namespace'
(vazio)

> Get-ChildItem -Recurse -File | Where Name -match 'id-02|id02|security-contract'
(vazio)

> .agents/shared/  -> 117 arquivos; nenhum contém 'C36-ID-02' ou 'Security Contract'
> grep 'Security Contract|D-ID02|ID02' em .agents/shared/*.md, docs/**/*.md, *.md -> 0 hits
```

**Resolução:** o Owner forneceu o texto normativo e autorizou o espelhamento, que foi executado nesta sessão para:

```
.agents/shared/C36ID02_SECURITY_CONTRACT.md     (29 seções, 809 linhas)
```

Estado do item: `Security Contract = ACTIVE / PENDING_NAMESPACE_AND_AUTHORIZATION_TREE_RESOLUTION`
Localização normativa: `.agents/shared/C36ID02_SECURITY_CONTRACT.md` (`VERIFIED_IN_REPO`)

O risco de divergência entre agentes (R-6, R-2) fica mitigado: existe agora uma única fonte de verdade acessível na árvore de trabalho.

> Nota de estado: o arquivo espelhado está **untracked** (não commitado). Permanece sujeito ao bloqueio de `COMMIT / PUSH` da Seção 7. Sua existência on-disk é suficiente para os agentes desta árvore, mas a persistência definitiva em git depende de gate próprio.

---

## 1. Registro de Evidências

### E-1 — Domínio Enterprise: `INTEGER` / `serial`, com FK declarada (canônico provável)

`backend/drizzle/0000_living_makkari.sql` (sistema ativo):
```
2:    "id" serial PRIMARY KEY NOT NULL,
30:   CREATE TABLE "enterprises" (
31:     "id" serial PRIMARY KEY NOT NULL,
63:   CREATE TABLE "properties" (
64:     "id" serial PRIMARY KEY NOT NULL,
65:     "enterprise_id" integer NOT NULL,
145:  "enterprise_id" integer,
172:  "enterprise_id" integer,
196:  "enterprise_id" integer,
227:  "enterprise_id" integer,
```

`database/migrations/*.sql` (legado) — **13 FKs `REFERENCES enterprises(id)`, todas INTEGER**:
```
001_create_enterprises_and_accommodations.sql:119  CONSTRAINT fk_property_enterprise FOREIGN KEY (enterprise_id)
                                                   REFERENCES enterprises(id) ON DELETE CASCADE
001_create_enterprises_and_accommodations.sql:199  FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE SET NULL
001_create_enterprises_and_accommodations.sql:289  REFERENCES enterprises(id) ON DELETE CASCADE,
003_create_auctions_tables.sql:8                   enterprise_id INTEGER REFERENCES enterprises(id) ON DELETE CASCADE,
003_create_auctions_tables.sql:63                  enterprise_id INTEGER REFERENCES enterprises(id) ON DELETE CASCADE,
004_create_flash_deals_tables.sql:8                enterprise_id INTEGER REFERENCES enterprises(id) ON DELETE CASCADE,
004_create_flash_deals_tables.sql:41               enterprise_id INTEGER REFERENCES enterprises(id) ON DELETE CASCADE,
004_create_flash_deals_tables.sql:74               enterprise_id INTEGER REFERENCES enterprises(id) ON DELETE CASCADE,
007_create_marketplace_tables.sql:8                enterprise_id INTEGER NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
007_create_marketplace_tables.sql:72               enterprise_id INTEGER NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
008_create_affiliates_tables.sql:41                enterprise_id INTEGER REFERENCES enterprises(id) ON DELETE SET NULL,
008_create_affiliates_tables.sql:96                enterprise_id INTEGER NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
009_create_voice_commerce_tables.sql:11            enterprise_id INTEGER REFERENCES enterprises(id) ON DELETE SET NULL,
```
Arquivos-fonte (6): `001_`, `003_`, `004_`, `007_`, `008_`, `009_` — 13 ocorrências, todas `INTEGER`.

D-1: qualquer hipótese de "enterpriseId é uuid" é incompatível com 13 FKs `integer` **já materializadas** no domínio.

### E-2 — Domínio Payments: `uuid`, sem FK

`backend/drizzle/0058_payments_tables.sql`:
```
66:  ALTER TABLE public.payments RENAME TO payments_legacy_gateway;
70:  CREATE TABLE IF NOT EXISTS "payment_customers" (
72:    "enterprise_id" uuid NOT NULL,
85:  CREATE TABLE IF NOT EXISTS "payments" (
87:    "enterprise_id" uuid NOT NULL,
133: CREATE TABLE IF NOT EXISTS "subscription_plans" (
135:   "enterprise_id" uuid NOT NULL,
153: CREATE TABLE IF NOT EXISTS "subscriptions" (
155:   "enterprise_id" uuid NOT NULL,
170: CREATE TABLE IF NOT EXISTS "refunds" (
183: CREATE TABLE IF NOT EXISTS "disputes" (
198: CREATE TABLE IF NOT EXISTS "webhook_events" (
```
D-2: **nenhuma** dessas 4 colunas declara `REFERENCES`. Não há FK. `payments_legacy_gateway` indica que a tabela anterior foi apenas renomeada, não migrada.

### E-3 — Domínio Auth: literal `'ent_1'` (string), banido por contrato

```
backend/src/api/v1/auth/login.service.js:194,229      enterpriseId: user.enterprise_id ?? 'ent_1'
backend/src/api/v1/auth/refresh-token.service.js:198  enterpriseId: decoded.enterpriseId ?? 'ent_1'
backend/src/api/v1/auth/register.service.js:105       enterpriseId: 'ent_1'
server/modules/.../routes.js (11+ sítios)             enterpriseId ... ?? 'ent_1'
backend/src/api/v1/tenant/routes.js:8                 const enterpriseId = req.enterpriseId || 'ent_1';
backend/src/middleware/enterprise-context.js:8        req.enterpriseId = String(... || 'ent_1').trim();
```
D-3: `users.enterprise_id` **não existe** no schema → `?? 'ent_1'` dispara sempre → todo caller autenticado é `'ent_1'`.

### E-4 — Dois carriers de tenant em `req`, hoje desconectados (ADD-2)

`backend/src/middleware/enterprise-context.js` (arquivo integral, ~20 linhas):
```js
const header = req.header('X-Enterprise-Id') || req.header('x-enterprise-id');
const query  = req.query?.enterpriseId ?? req.query?.enterprise_id;
const pathMatch = (req.path || req.url || '').match(/^\/e\/([^/]+)/);
const fromQuery = Array.isArray(query) ? query[0] : query;
req.enterpriseId = String(
    (pathMatch && pathMatch[1]) ||
    (typeof fromQuery === 'string' && fromQuery.trim()) ||
    (header && header.trim()) ||
    'ent_1'
).trim();
```

| Carrier | Origem | Autoridade | Consumido por |
|---|---|---|---|
| `req.enterpriseId` | path / query / **header** | **cliente (não confiável)** | `backend/src/api/v1/tenant/routes.js:8` |
| `req.user.enterpriseId` | JWT/sessão | servidor, mas **constante `'ent_1'`** | `backend/server/modules/payments/routes/refund-request.routes.ts:253` |

```
backend/server/modules/payments/routes/refund-request.routes.ts:253   const raw = req.user?.enterpriseId;
backend/src/api/v1/tenant/routes.js:8                                 const enterpriseId = req.enterpriseId || 'ent_1';
backend/src/middleware/enterprise-context.js:8                        req.enterpriseId = String(...)
```
D-4: dois conceitos distintos coexistem sob nome idêntico. Nenhum dos dois é autoridade válida. São consumidos por módulos **diferentes** → conflito **latente**. `enterprise-context.js` é superfície a ser **substituída/reconciliada**, não contrato a preservar.

### E-5 — Vocabulários de RBAC divergentes (ADD-1)

`grep -E 'PRESIDENT|DIRECTOR|SUPERVISOR|OPERATOR|ENTERPRISE_ADMIN'` em `apps/ backend/ server/ packages/` → **0 hits reais**.

Vocabulários vivos:
```
apps/turismo/src/components/auth/RoleBasedAccess.tsx:74    export type UserRole = 'admin' | 'manager' | 'user';
apps/turismo/src/components/auth/RoleBasedAccess.tsx:11-71 Permission (41 literais: dashboard:*, users:*, finance:refunds, deploy:rollback, ...)
apps/turismo/src/components/auth/RoleBasedAccess.tsx:77    export const ROLE_PERMISSIONS: Record<UserRole, Permission[]>
apps/site-publico/components/tickets/TicketDetail.tsx:213  currentUserRole === 'admin' || 'staff'
apps/turismo/pages/users.tsx:287                           getUserRole(user)  -> implementação própria
server/modules/comissoes/routes/index.ts:163               role !== 'admin' && role !== 'manager'
server/modules/notifications/routes.js:51                  role === 'admin' || 'manager'
server/modules/propostas/.../proposta-chat.socket.ts:998   role === 'user' ? 'client' : 'agent'
apps/turismo/BACKUP_SRC_COMPONENTS/.../RoleBasedAccess.tsx  cópia BACKUP (código morto)
```
D-5: **três** vocabulários (`admin/manager/user` · `admin/staff` · `user/agent/client`) + matriz de permissões viva no frontend. A matriz é **evidência de contrato funcional/UI** — **não é autoridade de segurança** (roda no browser).

### E-6 — Registro de migration (ADD-4)

```
backend/drizzle/**       -> True   ATIVO   (meta/_journal.json idx 0..63; última 0063_refund_request_decisions)
database/migrations/**   -> True   LEGADO  (13 arquivos SQL puros; 001..011, 0014_, create-website-...)
backend/migrations/**    -> False
migrations/**            -> False
```
`enterprises` e `properties` estão definidos nas **duas** árvores, ambas com `serial` (consistente, E-1).
`payments` uuid existe **somente** em drizzle 0058.

D-6: `backend/drizzle` é o sistema de registro operacional (journal). `database/migrations` é legado/histórico. Sem declaração explícita, dois agentes criarão a mesma tabela em árvores diferentes.

### E-7 — Precedente exato para N:N (favorece D-ID02-A)

`backend/drizzle/0059_partner_domain.sql:36-48`:
```sql
CREATE TABLE IF NOT EXISTS partner_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_memberships_partner_user_unique UNIQUE (partner_id, user_id),
  CONSTRAINT partner_memberships_role_check
    CHECK (role IN ('owner', 'partner_admin', 'ops', 'finance', 'member'))
);
```
D-7: forma **idêntica** à de `enterprise_memberships(user_id, enterprise_id, role)`. N:N é viável com padrão já provado no repo. `enterprise_memberships` e `user_enterprises` → **0 hits** (greenfield).

### E-8 — Base de MFA já existe (favorece D-ID02-I)

`backend/drizzle/0007_create_user_2fa.sql`:
```sql
CREATE TABLE IF NOT EXISTS "user_2fa" (
  "user_id" integer PRIMARY KEY NOT NULL,
  "totp_secret_encrypted" text, "enabled_at" timestamptz,
  "backup_codes_hash" jsonb, ... );
CREATE TABLE IF NOT EXISTS "login_2fa_challenges" (
  "id" serial PRIMARY KEY NOT NULL, "temp_token_hash" text NOT NULL, "user_id" integer NOT NULL,
  "expires_at" timestamptz NOT NULL, "consumed_at" timestamptz, ... );
```
Somado a `0040_pr06c_login_protection_mfa.sql`, `mfa-audit.js`, `mfa-policy.js`, `change-password.service.js` (totp_code) e aos testes `two-factor-pr06c`, `mfa-policy-pr06c`, `mfa-audit-pr06c`, `change-password-f5`.
D-8: D-ID02-I tem fundação real; **J (Step-Up), K (quádrupla), L (auditoria privilegiada), G/H (device/MAC)** → 0 hits = greenfield.

## 2. Requisitos de Reconciliação (ADD-1..ADD-4)

Nenhum destes requisitos autoriza implementação. Todos são **entradas obrigatórias** para o Security Contract e para os Implementation Plans.

### ADD-1 — WS-15 deve reconciliar os vocabulários de RBAC

Os 7 papéis propostos (`PRESIDENT · DIRECTOR · MANAGER · SUPERVISOR · OPERATOR · USER · PARTNER`) **não substituem** o existente. Arrasar e renomear está proibido nesta fase.

Sequência obrigatória do WS-15:
```
WS-15
 |- inventariar vocabulários existentes      (3 confirmados — E-5)
 |- inventariar permissões existentes        (41 literais em apps/turismo/src/...)
 |- identificar equivalências
 |- identificar conflitos
 |- definir canonical roles
 |- definir canonical permissions
 |- definir migration/compatibility strategy
 |- criar autorização SERVER-SIDE
```
Restrição de fronteira: a matriz `ROLE_PERMISSIONS` de `apps/turismo/src/components/auth/RoleBasedAccess.tsx` é **contrato funcional/UI**, não autoridade de segurança. O backend deve possuir a autoridade efetiva. Hoje **não existe middleware de autorização** — `backend/src/middleware/` contém apenas `canonical-redirect.js`, `enterprise-context.js`, `security-config.js`, `security-headers.js`.

### ADD-2 — WS-04 deve eliminar a dupla autoridade de Enterprise

Desenho-alvo:
```
                Authentication
                      |
                      v
             authenticated user
                      |
                      v
             Enterprise Membership
                      |
                      v
            authorized Enterprise Context
                      |
                      v
                  req context
                      |
         +------------+------------+
         v                         v
   resource lookup          authorization
```
Proibido:
```
query -+
header +--> req.enterpriseId --> ALLOW
path  -+

JWT --> 'ent_1' --> ALLOW
```
Regra: `req.enterpriseId` **não** é confiável por existir. O contexto deve ser derivado e validado server-side a partir de:
```
authenticated identity + Enterprise membership + requested Enterprise context + authorization
```
com `contexto não comprovado -> DENY`.
`backend/src/middleware/enterprise-context.js` é tratado como **superfície a substituir/reconciliar** (E-4), não como contrato a preservar.

### ADD-3 — Árvore canônica de `authorization/**`

```
server/modules/            -> 38 módulos (multi-property, notifications, partners, ...)
backend/server/modules/    -> payments (1)
```
`backend/server/modules/authorization/**`, `server/modules/authorization/**`, `packages/authorization/**`, `backend/src/modules/authorization/**` -> **nenhum existe** (verificado).

Decisão de localização: **PENDING ARCHITECTURAL DECISION**. A escolha não deve ser feita por contagem de módulos, e o diretório **não será criado** apenas para destravar o gate. Primeiro define-se qual árvore é canônica para serviços server-side transversais; caso contrário cria-se um **terceiro padrão** e agrava-se R-2.

### ADD-4 — Registro de migration

```
database/migrations/**  -> legado SQL (histórico)
backend/drizzle/**      -> sistema de registro ativo (journal 0..63)
```
Registro arquitetural: para novas mudanças de schema, `backend/drizzle/**` é o sistema de registro, **sujeito à confirmação do fluxo de migrations existente**. `database/migrations/**` permanece legado/histórico até decisão formal em contrário.
Isto **não** autoriza criar `enterprise_memberships` ainda.

## 3. A Decisão de Namespace (D-ID02-NS)

Estado atual da evidência — **a incompatibilidade é real, não nomenclatura**:

```
ENTERPRISE DOMAIN           PAYMENTS DOMAIN              AUTH
  INTEGER / SERIAL            UUID                         'ent_1'
   |- properties              |- payment_customers         (string)
   |- accommodations          |- payments                      ^
   |- marketplace             |- subscription_plans        PROIBIDO
   |- affiliates              |- subscriptions
   |- auctions                (sem FK declarada)
   |- flash_deals
   |- voice_commerce
   |- invoice_commerce
   13 FKs declaradas
```
Nenhuma conversão de Payments ou de Enterprises será executada neste pacote.

### Opções apresentadas (não escolhidas)

**OPÇÃO A — `INTEGER` canônico; reconciliação de Payments como workstream gated**
- Escolhe `enterprises.id serial` como fronteira de tenant.
- `payments.enterprise_id uuid` (4 tabelas) passa a ser **dívida explícita** com contrato-ponte `int <-> uuid` (nova coluna `enterprise_id_int` + backfill + FK) sob gate próprio.
- Custo: migração de dados em 4 tabelas de pagamento; risco financeiro; exige `MIGRATION APPLY` (hoje BLOQUEADO).
- Reversibilidade: alta (aditivo, coluna nova; uuid legado preservado).

**OPÇÃO B — `UUID` canônico; migração de `enterprises.id int -> uuid`**
- Contraria 13 FKs `integer` já materializadas (E-1) e `properties.enterprise_id integer NOT NULL`.
- Custo: conversão de toda a cadeia de FKs, `properties`, `notifications`, e 11+ sítios de auth.
- Reversibilidade: **baixa**; blast radius máximo; toca dados de produção.
- Exige reescrita de `database/migrations` legado ou aceitação de divergência permanente.

**OPÇÃO C — `INTEGER` canônico e reconciliação de Payments DENTRO do WS-04**
- Igual a A, mas sem workstream próprio: o contrato-ponte entra no escopo do Enterprise Context.
- Risco: mistura duas camadas em 1 PR, contra `AGENTS.md` ("Mais de 1 camada em 1 PR sem racional explícito") e o `enterprise-ci-slice-gate.mdc`.

### Critérios de decisão (para o Owner)

| Critério | A | B | C |
|---|---|---|---|
| Alinhamento com evidência existente (13 FKs) | forte | fraco | forte |
| Blast radius | médio | **máximo** | médio |
| Reversibilidade | alta | **baixa** | alta |
| Camadas em 1 PR | 1 | 1 | **2 (viola)** |
| Exige DB write | sim | sim | sim |

Observação: **as três opções exigem `MIGRATION APPLY`**, hoje BLOQUEADO. Nenhuma é executável neste gate.

---

## 4. Regra de Resolução (obrigatória, independente da opção)

```
callerEnterprise válido
+
resourceEnterprise válido
+
callerEnterprise === resourceEnterprise
---------------------------------------
ALLOW

qualquer ausência, inconsistência ou impossibilidade de prova
---------------------------------------
DENY
```
Autoridades de Tenant **proibidas**:
```
ent_1
userId = 1
propertyId = 1
enterpriseId fornecido pelo cliente
first enterprise
first property
fallback implícito
```

---

## 5. Impacto na Cascata

```
C36-ID-02  -- A=N:N (decidido)  B=Tenant (decidido)  NS=namespace (PENDENTE — D-ID02-NS)
     |
     +-- Security Contract: ACTIVE / PENDING_NAMESPACE_AND_AUTHORIZATION_TREE_RESOLUTION
     |      (.agents/shared/C36ID02_SECURITY_CONTRACT.md — F-0 RESOLVIDO)
     |
     +-- ADD-1..ADD-4: requisitos de reconciliacao, nao implementacao
     |
     v
WS-04 Enterprise Context          BLOCKED
     |   (nao pode remover 'ent_1' nem unificar carrier sem namespace unico)
     v
WS-15 RBAC Contract               MAPPED
     v
C5 Property Authorization         BLOCKED
     v
DE-14 Tenant Reconciliation       BLOCKED
     |   (o plano atual, que aceita tenant quando enterpriseId esta definido,
     |    e INCOMPATIVEL com o contrato fail-closed e deve ser corrigido
     |    antes do CODE GATE)
     v
New Implementation Plan
     v
CODE GATE                         NOT AUTHORIZED
```

### Riscos abertos

| ID | Risco | Status |
|---|---|---|
| R-1 | Namespace indefinido (integer x uuid x 'ent_1') | ABERTO — este pacote |
| R-2 | Duas árvores server-side (`server/modules` 38 x `backend/server/modules` 1) | ABERTO — ADD-3 |
| R-3 | `enterprise-context.js` deixa o cliente ditar o tenant | ABERTO — ADD-2 |
| R-4 | Dois sistemas de migration coexistem | ABERTO — ADD-4 |
| R-5 | Três vocabulários de RBAC sem autoridade server-side | ABERTO — ADD-1 |
| R-6 | Security Contract não localizável no repo | **RESOLVIDO** — espelhado em `.agents/shared/C36ID02_SECURITY_CONTRACT.md` |
| R-7 | Árvore de trabalho suja pré-existente (88 modificados, 127 untracked), incluindo arquivo protegido `.cursor/rules/enterprise-pr-policy.mdc` | ABERTO — Seção 9 |

---

## 6. C36-DE-05 — PERMANECE PASS (não reaberto)

```
48/48   decision route tests
2/2     separation tests
131/131 refund-related tests

invariantes: /execute 0 · RefundService 0 · getPaymentProvider 0
             ledger 0 · payout 0 · settlement 0 · gateway 0
```
`C36-DE-05 = PASS` permanece fechado. A nova arquitetura de Tenant **não** reabre DE-05.
`DE-14`, por ser superfície posterior e ainda bloqueada, deverá incorporar o novo Security Contract.

---

## 7. Decisão de Gate

**Avançar para o D-ID02-NS Namespace Decision Package** — este documento — sem código, sem migration, sem DB write, sem staging e sem tocar arquivos protegidos.

NÃO autorizado:

```
CODE                                 NOT AUTHORIZED
enterprise_memberships (DDL)         NOT AUTHORIZED
WS-04 implementacao                  NOT AUTHORIZED
WS-15..WS-19 implementacao           NOT AUTHORIZED
MIGRATION APPLY                      BLOCKED
DATABASE WRITE                       BLOCKED
STAGING / DEPLOY / PRODUCTION        BLOCKED
REAL GATEWAY / REAL REFUND / PAYOUT  BLOCKED
COMMIT / PUSH                        BLOCKED
```

---

## 8. O que o Owner precisa decidir

1. **D-ID02-NS** — opção A, B ou C (Seção 3).
2. **ADD-3** — árvore canônica de `authorization/**`.
3. ~~**F-0** — caminho do Security Contract~~ — **FECHADO**: espelhado em `.agents/shared/C36ID02_SECURITY_CONTRACT.md`.

> Nota de nomenclatura: a decisão de namespace é **D-ID02-NS**. O identificador **D-ID02-C permanece reservado** ao seu sentido original (cardinalidade/N:N), não devendo ser reutilizado para namespace.

---

## 9. Testemunho de não-mutação

Ações executadas nesta sessão:
```
ARQUIVOS DE CODIGO ALTERADOS/CRIADOS : 0
SCHEMA / MIGRATION / DDL             : 0
DATABASE WRITE                       : 0
git add / commit / push / restore    : NAO executado
staging / VPS / deploy / producao    : NAO executado
AGENTS.md / MEMORIES.md              : NAO tocados (mtime 2026-09-10 / 2026-07-24, anteriores a esta sessao)
```
Único artefato produzido: este documento (mtime `2026-10-03 02:43:10`).

Base git: `HEAD = 61040b02` · branch `feat/c36dd-refund-request-domain` (inalterados).

### ⚠ Observação obrigatória: a árvore de trabalho NÃO está limpa (pré-existente)

`git diff --stat` reporta **88 arquivos trackeados modificados** e **127 untracked**, estado **anterior** a esta sessão:

```
> git diff --name-only | Measure-Object
88
> git ls-files --others --exclude-standard | Measure-Object
127
> git diff --name-only | Select-String 'AGENTS.md|\.cursor/'
.cursor/rules/enterprise-pr-policy.mdc          <-- ARQUIVO PROTEGIDO (AGENTS.md)
```
Evidência de autoria (mtimes em bloco, anteriores a esta sessão):
```
2026-10-02 15:15:01  .cursor/rules/enterprise-pr-policy.mdc
2026-10-02 15:15:01  .github/workflows/cd-staging.yml
2026-10-03 02:43:10  .agents/shared/C36ID02C_TENANT_NAMESPACE_DECISION_PACKAGE.md   <-- este documento (criado)
                      -> renomeado nesta sessao para C36ID02NS_TENANT_NAMESPACE_DECISION_PACKAGE.md
```
Os 88 arquivos compartilham o timestamp de lote `2026-10-02 15:15` — origem em sessão anterior, **não atribuível a este pacote**.

Isto é registrado como **R-7** porque `.cursor/rules/enterprise-pr-policy.mdc` consta na lista de Arquivos Protegidos de `AGENTS.md` e aparece modificado sem token de owner no working tree. Requer reconciliação do Owner (`git diff -- .cursor/rules/enterprise-pr-policy.mdc`) antes de qualquer próximo gate.

Base git preservada: `61040b0`.

---

*Fim do pacote. AGUARDANDO DECISÃO DO OWNER.*