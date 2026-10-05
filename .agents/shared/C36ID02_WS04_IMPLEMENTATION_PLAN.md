# C36-ID-02 — WS-04 IMPLEMENTATION PLAN
## Authorized Enterprise Context

> **Workstream:** WS-04 — Enterprise Context
> **Wave:** 2 — Enterprise Context (Master Wave §7)
> **Gate objetivo:** `WS04-CONTEXT-PASS`
> **Natureza deste artefato:** IMPLEMENTATION PLAN (documento normativo de execução). **Não é código.**
> **Base git:** `61040b02` · branch `feat/c36dd-refund-request-domain`
> **Data de emissão:** 2026-10-03
> **Emissor:** agente executor (Cline/Cursor) sob autorização do Owner

```
CODE GATE      = CLOSED
MIGRATION GATE = CLOSED
DB GATE        = CLOSED
STAGING        = CLOSED
PRODUCTION     = CLOSED
COMMIT         = CLOSED
PUSH           = CLOSED
```

> Este documento **autoriza planejamento**, não implementação.
> A liberação do gate de código exige **PLAN VALIDATION** e **decisão separada** do Owner (§24).

---

## 0. Regra Suprema — Non-Dual-Authority

**Nenhuma implementação de `D-ID02-NS = C` será considerada válida se introduzir *dual authority*.**

```text
external ID            ≠  authorization
namespace              ≠  membership
membership             ≠  property access
property access        ≠  merely supplied propertyId
authenticated identity ≠  client-supplied enterpriseId
```

Qualquer fatia que crie uma segunda fonte concorrente de decisão de tenant
(ex.: `req.enterpriseId` **e** `req.user.enterpriseId` ambos utilizáveis como autoridade final)
é **reprovada na PLAN VALIDATION antes de gerar código**.

Esta regra existe especificamente para impedir a reintrodução do anti-pattern observado em
`server/modules/multi-property/services/tenant.service.ts` (deletado no working tree — `W0-F2`:
`return 1` + fallback de property default), e do anti-pattern vivo em
`backend/src/middleware/enterprise-context.js:12` (`'ent_1'` como fallback de segurança) e
`server/middleware/auth.middleware.ts:34,58` (`payload.enterpriseId` copiado verbatim).

Relação com as invariantes normativas (`C36ID02_SECURITY_CONTRACT.md` §25):

| Invariante | Como este plano a respeita |
|---|---|
| I-01 | Enterprise permanece o único Tenant Boundary |
| I-04 | Cliente pode **solicitar** contexto, nunca **constituir** autoridade |
| I-06 | Ausência de contexto comprovado ⇒ **DENY** |
| I-07 | `ent_1`, `userId=1`, `propertyId=1` **nunca** como fallback de segurança |
| I-08 | UUID/string não substitui autorização |
| I-14 | Nenhuma terceira árvore de autorização criada |
| I-15 | Nenhuma decisão aqui autoriza migration APPLY ou DB write |

---

## 1. Scope

### 1.1 Objetivo

Criar **um único conceito** de *Authorized Enterprise Context* (Master Wave §7), eliminando a
dupla autoridade entre `req.enterpriseId` (influenciado por path/query/header) e
`req.user.enterpriseId` (derivado da identidade autenticada) — requisito **ADD-2** do
Security Contract §24.

```text
Authenticated Identity
        ↓
Membership  (contrato definido aqui; autoridade material em WS-15)
        ↓
Selected Enterprise
        ↓
Authorization
        ↓
req.authorizedEnterpriseContext
```

### 1.2 Dentro do escopo (IN SCOPE)

```text
1. Definição do contrato de Authorized Enterprise Context (tipo + semântica).
2. Remediação de W1-F3  — carrier cliente-controlável como autoridade (tenant middleware).
3. Remediação de W1-F4  — payload.enterpriseId copiado verbatim em req.user.
4. Ponto ÚNICO de tradução external namespace → internal namespace (§9).
5. Fronteira explícita onde a validação de membership pluga (§10) — sem implementar RBAC.
6. Derivação de property/resource scope a partir do contexto autorizado (§11).
7. Fail-closed obrigatório quando o contexto não puder ser comprovado.
8. Testes (unit + integração + negativos + regressão) e CI correspondente.
```

### 1.3 Fora do escopo (OUT OF SCOPE — proibido tratar incidentalmente)

```text
× Implementação de RBAC / canonical roles / permission model        → WS-15 (§8 Wave 3)
× Property authorization final / C5 (rule de property por membership) → Wave 4
× PLATFORM_SUPER_ADMIN, Step-Up, Device Security, Critical Approval  → Wave 5 (WS-16..WS-19)
× Payments / refunds / earnings / ledger                             → WS-07, Wave 9
× C36-DE-06 (execução de refund)                                     → Wave 8, gate próprio
× Qualquer migration, DDL, DB write, index, FK                        → MIGRATION/DB GATE (CLOSED)
× Movimentação/limpeza de diretórios, relocation de `payments`        → proibido (W0 baseline)
```

`C36-DE-05` permanece **PASS / CLOSED** — não é reaberto nem utilizado como atalho para WS-04.
`DE-06` permanece **órfão existente** sob RECONCILIATION com gate próprio — não reimplementado.

### 1.4 Modelo de entrega

```text
1 fatia → 1 PR → verificar/analisar/corrigir CI → merge humano → próxima fatia
```

Escrever `SERIALIZED`. Ler/analisar/testar/documentar pode ser paralelo. Ver §15 e Anexo A.

---

## 2. Inputs / Authoritative Artifacts

Fontes **normativas** (não podem ser redefinidas por este plano):

| # | Artefato | Papel |
|---|---|---|
| A-1 | `.agents/shared/C36ID02_SECURITY_CONTRACT.md` | Contrato de segurança (ACTIVE) — invariantes I-01..I-15 |
| A-2 | `.agents/shared/C36ID02_W1_ARCHITECTURAL_DECISION_RECORD.md` | W1 ADR — D-ID02-NS = C; ADD-3; §19 OWNER DECISION RECORD |
| A-3 | `.agents/shared/RSV360_MASTER_IMPLEMENTATION_WAVE.md` | Master Wave §7 (WS-04), §3.3 Single Writer Lock, §19 CI Slice Gate, §28 Master Gate |
| A-4 | `.agents/shared/C36ID02_W0_BASELINE_CONTAMINATION_REPORT.md` | Baseline, collision graph, W0-F1..F4 |
| A-5 | `.agents/shared/C36CZ_INVARIANT_EVIDENCE_PACK.md` | Evidência de invariantes |
| A-6 | `.agents/shared/C36ID02NS_TENANT_NAMESPACE_DECISION_PACKAGE.md` | Opções A/B/C |

Decisões do Owner já registradas (inputs não negociáveis):

```text
D-ID02-NS = C   (Transitional Dual-Key / Bridge)   DECIDED BY OWNER — 2026-10-03
ADD-3     = server/modules/**                      DECIDED BY OWNER — 2026-10-03
W1-GATE   = PASS
```

---

## 3. Security Contract — cláusulas vinculantes para WS-04

Reproduzidas aqui apenas como restrição operacional (a fonte é A-1).

### 3.1 Autoridade do contexto (A-1 §6)

```text
req.enterpriseId        — influenciado por path/query/header   → NÃO pode ser autoridade final
req.user.enterpriseId   — derivado da identidade autenticada    → único ponto de partida admissível
```

O Enterprise Context efetivo deve ser: derivado de identidade autenticada · validado contra
memberships autorizados · explicitamente selecionado quando houver múltiplas Enterprises ·
validado **antes** do acesso ao recurso · **rejeitado** quando não puder ser comprovado.

### 3.2 Proibições de fallback (A-1 §5, I-07)

```text
userId = 1 · enterpriseId = 'ent_1' · propertyId = 1        → PROIBIDOS como fallback de segurança
req.body.userId · req.body.user_id · req.body.enterpriseId · req.query.enterpriseId
                                                            → PROIBIDOS como autoridade final
```

### 3.3 Resource isolation (A-1 §7)

Recurso sem relação determinística com Enterprise ⇒ `DENY`.
Proibido escolher "primeiro recurso / primeiro tenant / primeiro proprietário" como fallback.

### 3.4 Property scope (A-1 §8)

`Enterprise válida ⇏ acesso a todas as Properties`. A regra final de Property Authorization
pertence a **WS-15 / Wave 4** e **não deve ser inventada** durante WS-04. WS-04 apenas
**transporta** o contexto autorizado; não define a regra de property.

### 3.5 Non-authorization (A-1 §29)

A existência deste plano **não autoriza** criação de tabela, alteração de schema, migration,
DB write, RBAC, Platform Admin, device security, step-up, critical approval, alteração de
pagamentos, refund, staging, deploy, produção, commit ou push.

---

## 4. `D-ID02-NS = C` — Transitional Dual-Key / Bridge — implicações

### 4.1 Estado factual do namespace (evidência read-only)

Três representações de `enterpriseId` coexistem **hoje** no repositório:

| Representação | Tipo | Local de evidência |
|---|---|---|
| INTEGER `serial` | `enterprises.id` | `backend/drizzle/0000_living_makkari.sql:31` |
| UUID | `payments.enterprise_id` (**sem FK**) | `backend/server/modules/payments/schema.ts:38` |
| STRING `'ent_1'` | carriers de request/JWT/shared | `packages/shared/src/types/tenant.ts:39`, `packages/shared/src/tenant/routing.ts:59`, `backend/src/api/v1/auth/routes.js:22` |

Ambiguidade formalmente **tipada**:

```ts
// server/types/express.d.ts:13
enterpriseId?: string | number;
```

Evidência de coexistência no mesmo arquivo de migration (`E-7`):
`0062_refund_requests.sql` mistura UUID (`payments`) e INTEGER (`bookings`, `users`).

### 4.2 O que a opção C significa para WS-04

```text
EXTERNAL namespace (string: 'ent_*' | uuid)   ← fronteira de API / JWT / URL
                    │
        TRANSLATION BOUNDARY  (único ponto autorizado de conversão)  → §9
                    │
INTERNAL namespace (integer: enterprises.id serial) ← persistência / FK / integridade
```

- **Autoridade externa:** a chave externa é *carrier de contexto solicitado*; **nunca** autorização (I-08).
- **Identidade interna durante a transição:** derivada da identidade autenticada + tradução auditável.
- **Bridge transitório:** as duas chaves convivem **por decisão**, não por acidente; a convivência é
  confinada a um único boundary.
- **Proibição estrutural:** nenhum código novo pode inferir tenant por *coerção implícita*
  (`Number(x)` silencioso, `|| 'ent_1'`, `|| 1`).

### 4.3 Consequência dura: a ponte *materializada* exige DB e está bloqueada

A forma ideal da opção C (tabela de mapeamento com `UNIQUE` + FK) exige **migration** —
`MIGRATION GATE = CLOSED` e `I-15`. Portanto:

```text
Slice 1..N de WS-04  →  ponte CONTRATUAL (código puro, sem DDL, sem DB write)
                        ├── namespace externo único: string
                        ├── tradução explícita, tipada e testável
                        ├── sem tabela de mapeamento
                        └── fail-closed quando a tradução não for determinística
Slice posterior (com gate próprio de MIGRATION)  →  ponte MATERIALIZADA (tabela de mapeamento)
```

Declarar isso é obrigatório: **WS-04 não pode simular integridade referencial que só o DB oferece.**
Enquanto a ponte materializada não existir, tudo que não puder ser provado por contrato ⇒ `DENY`.

### 4.4 Itens do W1 ADR §19.6 (contrato exigido antes de qualquer código)

```text
external namespace        ✅ §9.2 (string canônica)
internal namespace        ✅ §9.3 (integer enterprises.id) — leitura apenas
translation boundary      ✅ §9.4 (ponto único + assinatura)
uniqueness                ⏳ §20 (exige índice/UNIQUE ⇒ MIGRATION GATE)
integrity                 ⏳ §20 (exige FK ⇒ MIGRATION GATE)
API contract              ✅ §8.5 (como a identidade chega)
JWT contract              ✅ §8.4 (como a identidade é representada)
membership lookup         ✅ §10 (fronteira definida; materialização ⇒ WS-15)
migration strategy        ⏳ §20 (PLAN ONLY)
rollback                  ✅ §21
ownership                 ✅ §12/§13/§14 + §15
```

---

## 5. `ADD-3 = server/modules/**` — implicações

### 5.1 Decisão normativa

```text
ÁRVORE CANÔNICA DE AUTORIZAÇÃO = server/modules/**
PROIBIDO criar uma terceira árvore apenas para authorization (I-14)
```

### 5.2 Evidência factual (read-only, 2026-10-03)

```text
server/modules/**           = 31 diretórios   (acomodacoes, agentes, auctions, bookings,
                              campanhas, cloud, cms, comissoes, communication, configuracoes,
                              cotacao-publica, crm, financeiro, fornecedores-hub, guest-portal,
                              housekeeping, logistica, marketing, multi-property, notifications,
                              orcamentos, partners, passageiros, pricing, propostas, relatorios,
                              revenue, roteiro, roteiro-analytics, tracking, vouchers)
backend/server/modules/**   =  1 diretório    (payments)   → W1-F6
```

### 5.3 Onde WS-04 vive dentro da árvore canônica

O contexto de Enterprise é, na prática, um concern de **multi-property / tenant**.
`multi-property` **já existe** dentro da árvore canônica e já hospeda:

```text
server/modules/multi-property/middleware/tenant.middleware.ts   ← C36-ID-04, endurecido (I1..I4)
server/modules/multi-property/db/property.repository.ts
server/modules/multi-property/services/index.ts
server/modules/multi-property/helpers/with-property.ts          ← FAIL-OPEN (ver §6.4)
```

**RECOMENDAÇÃO (sujeita a PLAN VALIDATION — não é decisão):**

```text
1. O resolver do Authorized Enterprise Context pertence a server/modules/multi-property/**
   (mesma árvore do tenant middleware — evita criar árvore nova).
2. A superfície de middleware compartilhado permanece server/middleware/** (auth.middleware.ts),
   que é ponto de entrada, não árvore de autorização.
3. O legado backend/src/middleware/enterprise-context.js + backend/app.js:60 NÃO é removido nesta
   fase: é declarado LEGACY CARRIER e neutralizado por flag (§7.3), com retirement em fatia própria.
```

### 5.4 O que ADD-3 **proíbe** explicitamente

```text
× criar server/authorization/**, server/authz/**, packages/authz/** ou equivalente
× mover payments entre árvores (backend/server/modules/payments ⇄ server/modules/payments)
× reimplementar a lógica de qualquer módulo existente em uma árvore paralela
× alterar a direção de dependência entre shared ↔ server ↔ backend
```

---

## 6. Remediação de `W1-F3` (CRÍTICA)

> **Achado:** tenant resolvido via `query || header` com fallback `'ent_1'` — carrier
> controlado pelo cliente **antes** de qualquer contexto autorizado.

### 6.1 Evidência literal

```js
// backend/src/middleware/enterprise-context.js:2-16   (montado em backend/app.js:60, sob /api/v1)
function enterpriseContextMiddleware(req, _res, next) {
  const header = req.header('X-Enterprise-Id') || req.header('x-enterprise-id');
  const query  = req.query?.enterpriseId ?? req.query?.enterprise_id;
  const pathMatch = (req.path || req.url || '').match(/^\/e\/([^/]+)/);
  const fromQuery = Array.isArray(query) ? query[0] : query;
  req.enterpriseId = String(
    (pathMatch && pathMatch[1]) || (typeof fromQuery === 'string' && fromQuery.trim()) ||
    (header && header.trim()) || 'ent_1'          // ← FALLBACK DE SEGURANÇA (I-07)
  ).trim();
  next();
}
```

```ts
// packages/shared/src/types/tenant.ts:34-41
export function resolveEnterpriseId(input: { query?; header?; fallback? }): EnterpriseId {
  const fromQuery = Array.isArray(input.query) ? input.query[0] : input.query;
  const fromHeader = input.header?.trim();
  return (fromQuery || fromHeader || input.fallback || 'ent_1').trim();   // ← idem
}
```

```ts
// packages/shared/src/tenant/routing.ts:57-70
export function resolveTenantRoute(input): EnterpriseId {
  const fromPath = input.pathname ? parseTenantFromPath(input.pathname) : null;
  if (fromPath) return fromPath;
  return resolveEnterpriseId({ query, header, fallback: session ?? storage ?? fallback ?? 'ent_1' });
}
```

### 6.2 Superfície de consumo (blast radius real, read-only)

| Consumidor | Uso | Risco |
|---|---|---|
| `backend/app.js:58` | `app.use('/api', tenantMiddleware)` (multi-property) | property scope |
| `backend/app.js:60` | `app.use('/api/v1', enterpriseContextMiddleware)` | **tenant authority pré-auth** |
| `server/modules/campanhas/routes/index.ts:36,115` | `Number(req.query.enterprise_id)` | tenant por query, sem membership |
| `server/modules/communication/routes/campaigns.routes.ts:25,56,100` | `req.query.enterpriseId as string` | tenant por query, sem membership |
| `server/modules/campanhas/services/campanhas.service.ts:14-16` | `where(eq(campanhas.enterpriseId, enterpriseId))` | consulta escopada por carrier de cliente |
| `packages/shared/src/types/tenant.ts` e `tenant/routing.ts` | frontend/SPA routing | path/query/storage como fonte |

### 6.3 Remediação contratual (o que a fatia deve fazer)

```text
R1. Separar NOMINALMENTE os conceitos:
      requestedEnterpriseContext   (cliente PODE pedir)
      authorizedEnterpriseContext  (servidor DECIDE)
R2. Nenhum fallback literal ('ent_1', 1, userId=1) em NENHUM caminho novo.
R3. Carrier cliente-controlável (query/header/path) DEIXA de escrever em req.enterpriseId
    como autoridade. Torna-se, no máximo, `requestedEnterpriseId`.
R4. Divergência entre requested e authorized ⇒ 403 (fail-closed), não "merge" e não "primeiro vence".
R5. Ausência de contexto autorizado ⇒ 401 (não autenticado) ou 403 (sem membership) — nunca default.
R6. O legado backend/src/middleware/enterprise-context.js passa a operar em modo LEGACY
    (flag OFF ⇒ não escreve autoridade) — sem deletar o arquivo nesta fase (§13).
```

### 6.4 Achado adicional correlato (FAIL-OPEN em `with-property.ts`)

```ts
// server/modules/multi-property/helpers/with-property.ts
export function withPropertyFilter(query: any, propertyId: number | undefined): any {
  if (propertyId) { return query.where('property_id', propertyId); }
  return query;                       // ← sem propertyId = SEM filtro (fail-open)
}
export function filterByProperty<T>(items: T[], propertyId?: number): T[] {
  if (!propertyId) return items;      // ← idem
  return items.filter(i => !i.property_id || Number(i.property_id) === Number(propertyId));
}
```

Classificação: **correlato de C5/Wave 4**, **não** é WS-04. O plano apenas o **registra** para
não perder rastreabilidade; **correção pertence a C5**. WS-04 não deve alterar este helper.

---

## 7. Remediação de `W1-F4` (HIGH)

> **Achado:** `payload.enterpriseId` é copiado verbatim para `req.user`, sem lookup de membership.

### 7.1 Evidência literal

```ts
// server/middleware/auth.middleware.ts:29-35 (authenticateJwt) e :53-59 (optionalJwt)
req.user = {
  id,
  email: payload.email,
  name: payload.name,
  role: payload.role,
  enterpriseId: payload.enterpriseId,     // ← claim JWT → req.user, sem validação
};
```

### 7.2 Análise

- O claim JWT é *mais confiável* que query/header (assinado pelo servidor) — porém:
  1. o claim pode ter sido emitido **antes** de a membership ser revogada (stale);
  2. não há verificação de que `user ↔ enterprise` ainda existe;
  3. o tipo do claim é ambíguo (`string | number`), alimentando coerção silenciosa;
  4. `optionalJwt` produz `req.user` **sem** exigir token — caminho fail-open para rotas que
     depois leiam `req.user.enterpriseId` sem checar presença de identidade.

### 7.3 Remediação contratual

```text
R7.  JWT = prova de IDENTIDADE + intenção declarada de contexto.
     JWT ≠ prova de MEMBERSHIP (I-04).
R8.  `req.user.enterpriseId` deixa de ser autoridade por si só: passa a ser
     `identity.enterpriseIdClaim` (declarado).
R9.  A autoridade final passa a ser `req.authorizedEnterpriseContext`, atribuído por UM
     resolver server-side, fail-closed.
R10. `optionalJwt` NÃO pode popular autoridade de tenant. Em rotas que exigem contexto,
     a ausência de `req.user` ⇒ 401 antes de qualquer leitura de tenant.
R11. O resolver deve operar em dois modos explícitos (transição C):
       MODE=legacy    → comportamento atual preservado (auditável), flag OFF por PR
       MODE=enforce   → claim divergente de requested ⇒ 403; ausência ⇒ 401/403
     Default de código: `legacy`. Default de teste: ambos exercitados.
     **ENFORCE = TEST-ONLY até (WS-15 PASS AND autorização explícita do Owner).**
     Promoção de default para `enforce` = fatia própria + aprovação do Owner.
     Motivo: com DenyAll transitório (§10.2), ligar `enforce` fora de teste nega
     todo acesso legítimo em massa (403 generalizado) — risco operacional real.
```

### 7.4 Restrição dura — WS-04 NÃO implementa membership lookup

A busca de membership pertence a **WS-15 / Wave 3** (Security Contract §9). WS-04 define
**onde** ela pluga e o que acontece enquanto ela não existe:

```text
enquanto membership lookup não existir:
    authorizedEnterpriseContext = f(identidade autenticada, claim de contexto)
    ⇒ identidade ausente ...................... 401
    ⇒ claim ausente ........................... 403 (fail-closed, sem default)
    ⇒ requested ≠ claim ....................... 403 (I-04)
    ⇒ caso contrário .......................... autorizado, `membershipVerified: false`
```

`membershipVerified: false` é a **dívida explícita** entregue a WS-15 — declarada, não escondida.

---

## 8. Canonical Enterprise Context

### 8.1 Contrato de tipo (proposta — tipagem, não implementação)

```ts
// Alvo: server/modules/multi-property/context/enterprise-context.types.ts  (nova superfície na árvore canônica)
// Nome/tipo EXATO é decisão de PLAN VALIDATION; a semântica abaixo é normativa.

export type ExternalEnterpriseKey = string;   // 'ent_*' | uuid  (fronteira API/JWT/URL)
export type InternalEnterpriseId  = number;   // enterprises.id (serial) — leitura apenas

export interface EnterpriseContextResolution {
  /** Contexto AUTORIZADO pelo servidor. Única autoridade de tenant após WS-04. */
  authorizedEnterpriseId: ExternalEnterpriseKey;
  /** Id interno traduzido, quando determinístico. `null` ⇒ não traduzível. */
  internalEnterpriseId: InternalEnterpriseId | null;
  /** true somente quando existir prova de membership (WS-15). Até lá: false. */
  membershipVerified: boolean;
  /** Como o contexto foi provado. Auditável. */
  source: 'jwt_claim' | 'legacy';
}

export interface RequestedEnterpriseContext {
  /** Contexto SOLICITADO pelo cliente (path/query/header). Nunca é autoridade (I-04). */
  requestedEnterpriseId: ExternalEnterpriseKey | null;
  origin: 'path' | 'query' | 'header' | null;
}
```

### 8.2 Campos de request (alvo)

```text
req.authorizedEnterpriseContext : EnterpriseContextResolution   ← ÚNICA autoridade (novo)
req.requestedEnterpriseContext  : RequestedEnterpriseContext    ← intenção do cliente (novo)
req.enterpriseId                : string  (DEPRECATED / LEGACY) ← não pode ser autoridade final
req.user.enterpriseId           : claim declarado                ← não é autoridade (R8)
```

Regra de remoção: `req.enterpriseId` só poderá ser **removido** em fatia dedicada, após
todos os consumidores migrarem para `req.authorizedEnterpriseContext` e com CI verde.
Até lá ele permanece, porém **sem** status de autoridade.

### 8.3 Contrato de tipagem (`express.d.ts`)

```text
Hoje:  enterpriseId?: string | number;         (server/types/express.d.ts:13)
Alvo:  mantém `enterpriseId` (compat) + adiciona os dois campos novos acima.
Proibido: manter `string | number` como tipo do campo de AUTORIDADE.
          A autoridade é sempre `ExternalEnterpriseKey` (string) + `internalEnterpriseId` (number|null).
```

### 8.4 Contrato JWT (como a identidade é representada)

```text
1. `payload.userId` → identidade numérica (já validada por Number.isFinite).
2. `payload.enterpriseId` → claim de contexto DECLARADO (string; nunca number).
3. O claim NUNCA é aceito como prova de membership.
4. Nenhuma mudança no formato do JWT nesta fase (assinatura, claims, DPoP ficam intactos).
5. Se o claim vier numérico (legado), é normalizado para string na fronteira (§9) e marcado
   `source: 'legacy'`.
```

### 8.5 Contrato de API (como a identidade chega ao servidor)

```text
Authorization: Bearer <JWT>              (identidade — obrigatório em rotas protegidas)
DPoP (quando flag ON)                    (enforcement existente — não alterado)
X-Enterprise-Id / ?enterpriseId / /e/:id (contexto SOLICITADO — nunca autoridade)
X-Property-Id / ?property_id             (escopo de property — ver C5, fora do WS-04)
req.body.enterpriseId                    (PROIBIDO como autoridade — A-1 §5)
```

### 8.6 Ordem canônica de resolução (normativa)

```text
1. Autenticação (identidade comprovada)                       → sem isto: 401
2. Extração do contexto SOLICITADO (path > query > header)    → apenas registro
3. Claim declarado (req.user.enterpriseId / payload)          → entrada do resolver
4. Membership (WS-15 — ainda ausente ⇒ membershipVerified=false)
5. Decisão do servidor                                        → req.authorizedEnterpriseContext
6. Tradução external → internal (§9)                          → internalEnterpriseId
7. Autorização de recurso (§10/§11)                           → ALLOW/DENY
```

**Nenhum passo pode ser pulado. Nenhum passo pode inverter 1 e 4.**

---

## 9. Fronteira de Tradução External → Internal

### 9.1 Princípio

```text
UM único ponto de tradução no servidor.
Fora dele, NENHUMA conversão external↔internal é permitida.
```

Tradução implícita (coerção, cast, `Number()`, `String()`, `as any`) é **proibida** fora deste
ponto. Grep de anti-pattern obrigatório antes do PR (§22.4).

### 9.2 External namespace (canônico)

```text
Tipo:      string
Formato:   'ent_<slug>'  |  uuid v4 em minúsculas
Fonte:     JWT claim (autoridade) · path/query/header (pedido, não autoridade)
Trim:      aplicado na fronteira; string vazia ⇒ contexto inválido (DENY)
Case:      preservado (não lowercasing silencioso)
```

`'ent_1'` **não** possui tratamento especial. É um valor como qualquer outro e **não pode**
ser usado como default (I-07).

### 9.3 Internal namespace

```text
Tipo:      integer (enterprises.id serial)
Uso:       FK / integridade / consultas internas
Acesso:    LEITURA apenas nesta fase
Uso real:  `internalEnterpriseId` no `EnterpriseContextResolution`; `null` quando
           a tradução não for determinística
```

### 9.4 Ponto único (assinatura — não implementação)

```ts
// Alvo: server/modules/multi-property/context/enterprise-key-bridge.ts
// Contrato: função PURA, sem I/O, sem DB, sem fallback.
export function translateExternalToInternal(
  externalKey: ExternalEnterpriseKey,
  lookup: EnterpriseKeyLookup        // injeção — Tabela de mapeamento (fase MIGRATION) ou mapa estático auditado
): InternalEnterpriseId | null;     // null = não traduzível ⇒ DENY no caller

export interface EnterpriseKeyLookup {
  byExternalKey(key: ExternalEnterpriseKey): InternalEnterpriseId | null;
}
```

### 9.5 Modo transitório sem DB (fase atual)

Enquanto a ponte materializada estiver bloqueada pelo MIGRATION GATE:

```text
- `EnterpriseKeyLookup` é injetado, não importado de um singleton.
- Implementação disponível: mapa estático AUDITADO (allowlist explícita) OU `null` lookup.
- Mapa estático SEM entradas ⇒ toda tradução retorna null ⇒ DENY (fail-closed).
- Nenhum valor é derivado por parsing numérico do externalKey.
```

### 9.6 Proibições absolutas na fronteira

```text
× Number(externalKey) / parseInt / '+' coercion
× externalKey || 'ent_1' / ?? 1 / || 1
× lookup retornando "primeiro" / "default" / "1"
× tradução ocorrendo em route handler, service de domínio ou componente de UI
× cache global mutável sem invalidação determinística
× leitura de DB nesta fatia (DB GATE = CLOSED)
```

### 9.7 Duas chaves, uma autoridade

```text
        externalKey ──────────────┐
                                  ├──► authorizedEnterpriseId   (AUTORIDADE)
        internalId  ──────────────┘
```

Ter duas **chaves** é permitido (decisão C). Ter duas **autoridades** é proibido (§0).
`internalEnterpriseId` é **derivado** de `authorizedEnterpriseId` — nunca concorrente.

### 9.8 API de migração futura (PLAN ONLY — §20)

```text
O bridge só se torna MATERIAL quando existir:
  - tabela de mapeamento external_key ↔ internal_id  (MIGRATION GATE)
  - UNIQUE(external_key) e integridade referencial    (DB GATE)
  - backfill auditado
Nada disso é executado nesta onda.
```

---

## 10. Membership / Authorization Boundary

### 10.1 Princípio

```text
WS-04 define a FRONTEIRA. WS-15 preenche a AUTORIDADE.
Quem é o owner da pergunta "este usuário pertence a esta Enterprise?" é WS-15.
WS-04 só garante que NENHUMA autorização aconteça sem passar por essa pergunta.
```

### 10.2 A fronteira (assinatura — não implementação)

```ts
// Contrato: ponto único onde a validação de membership pluga.
export interface EnterpriseMembershipPort {
  hasMembership(userId: number, externalEnterpriseKey: ExternalEnterpriseKey): Promise<boolean>;
}
```

Comportamento **nesta fase** (membership ainda não existe):

```text
- Implementação disponível: `DenyAllMembershipPort` (sempre false) OU `NoMembershipEvidencePort`.
- Resolver continua funcional em modo `legacy`; em modo `enforce`, ausência de prova ⇒ 403.
- **MODO `enforce` = TEST-ONLY até WS-15 PASS + autorização do Owner (R11).**
- `membershipVerified` permanece `false` até WS-15 entregar a implementação real.
- WS-15 substitui APENAS a implementação do port — nunca reescreve o resolver.
```

### 10.3 Respostas às 13 perguntas mínimas

```text
1. Autoridade para o external enterprise ID .... JWT claim assinado pelo servidor (server-side).
2. Identidade interna durante a transição ...... enterprises.id (serial) via bridge §9.
3. Onde ocorre a tradução ..................... ÚNICO boundary §9.4 (server-side).
4. Unicidade .................................. ⏳ UNIQUE na ponte materializada (§20).
5. Integridade/Referencialidade ............... ⏳ FK na ponte materializada (§20).
6. Como a API recebe a identidade ............. Bearer JWT + contexto SOLICITADO (path/query/header).
7. Como JWT/session representa a identidade ... payload.userId + payload.enterpriseId (declarado).
8. Como membership é resolvido ................ PORT §10.2 (implementação real ⇒ WS-15).
9. Como tenant/property scope é derivado ...... contexto autorizado ⇒ property via tenant.middleware (§11).
10. Futura migração ........................... §20 (PLAN ONLY).
11. Rollback .................................. §21.
12. Proprietário de cada camada ............... §12/§13/§14 + §15.
13. (extra) Como o contexto é AUDITADO ........ campo `source` + log de decisão no resolver.
```

### 10.4 Regras que impedem escopo-deriva

```text
× WS-04 NÃO define roles canônicos ( PRESIDENT/DIRECTOR/... pertencem a WS-15, Wave 3 §8).
× WS-04 NÃO reconcilia vocabulários de roles (admin/manager/user etc. — ADD-1).
× WS-04 NÃO define PLATFORM_SUPER_ADMIN (Wave 5, WS-16).
× Frontend permissions NÃO constituem autoridade (I-13).
```

---

## 11. Property / Resource Scope

### 11.1 Como tenant deriva property (sem inventar regra)

```text
req.authorizedEnterpriseContext (WS-04)
        ↓
server/modules/multi-property/middleware/tenant.middleware.ts  (JÁ endurecido, C36-ID-04)
        ├── identidade SOMENTE de req.user.id  (I1)
        ├── sem identidade ⇒ nenhum escopo de property (I2)
        ├── NUNCA propertyId = 1 (I3)
        └── erros propagam, nunca viram default (I4)
        ↓
req.propertyId  (proveniente de X-Property-Id / ?property_id + validateUserAccess)
        ↓
⛔ REGRA FINAL DE PROPERTY PERTENCE A C5 (Wave 4) — WS-04 NÃO a define
```

Requisitos que C5 vai impor (registrados aqui apenas como restrição de não-regressão):

```text
× nunca `first property` / `first active property` / `propertyId = 1` como fallback
× Enterprise authorization e Property authorization verificadas INDEPENDENTEMENTE
× propertyId fornecido ≠ propertyId autorizado
```

### 11.2 Resource scope (A-1 §7)

```text
Recurso protegido ⇒ relação determinística com Enterprise ⇒ Caller === Resource : ALLOW/DENY.
Consumidores conhecidos que HOJE escopam por carrier de cliente (campanhas, communication)
permanecem INALTERADOS nesta fase; serão migrados para `req.authorizedEnterpriseContext`
em fatia dedicada (§14 mantém seus arquivos como read-only até lá).
```

### 11.3 O que WS-04 NÃO toca neste tópico

```text
× server/modules/multi-property/helpers/with-property.ts   (fail-open registrado em §6.4 → C5)
× server/modules/multi-property/db/property.repository.ts  (leitura pertencente a C5/WS-15)
× qualquer regra de `/:id`, `/:id/settings`, `/:id/users`, property switching
```

---

## 12. Allowed Files (escrita autorizada — SOMENTE após CODE GATE)

> Escrita **serializada**, uma fatia por vez, sob Single Writer Lock (§15).
> Qualquer arquivo fora desta lista exige aditivo ao plano antes do PR.

| # | Arquivo | Finalidade na fatia |
|---|---|---|
| F-1 | `server/types/express.d.ts` | Declarar `authorizedEnterpriseContext` / `requestedEnterpriseContext`; manter compat de `enterpriseId` |
| F-2 | `server/middleware/auth.middleware.ts` | Ajustar `authenticateJwt`/`optionalJwt` por R8–R11 (claim declarado; optionalJwt sem autoridade de tenant) |
| F-3 | `server/modules/multi-property/context/enterprise-context.types.ts` | **NOVO** — tipos §8.1 (puro, sem runtime) |
| F-4 | `server/modules/multi-property/context/enterprise-key-bridge.ts` | **NOVO** — tradução §9.4 (função pura, sem I/O/DB) |
| F-5 | `server/modules/multi-property/context/enterprise-context.resolver.ts` | **NOVO** — resolver server-side fail-closed (§7.3/§8.6) |
| F-6 | `server/modules/multi-property/context/enterprise-membership.port.ts` | **NOVO** — port §10.2 + implementação `DenyAll` transitória |
| F-7 | `server/modules/multi-property/context/authorized-context.middleware.ts` | **NOVO** — middleware que popula `req.authorizedEnterpriseContext` |
| F-8 | `server/modules/multi-property/index.ts` | Exportar a nova superfície (registro do módulo) |
| F-9 | `backend/src/__tests__/unit/enterprise-context-resolver.test.ts` | **NOVO** — testes unit do resolver/bridge (§17) |
| F-10 | `backend/src/__tests__/integration/authorized-enterprise-context.integration.test.ts` | **NOVO** — testes de integração (§17) |
| F-11 | `backend/app.js` | SOMENTE leitura de flag `AUTHZ_ENTERPRISE_CONTEXT_MODE` (montagem/neutralização do legacy — sem reescrever rotas) |

Limites por arquivo:

```text
F-2 : proibido alterar lógica de JWT verify, DPoP, extractBearerToken, requireRole.
F-8 : proibido alterar registro de outros módulos.
F-11: proibido mover/remover mounts; proibido alterar ordem de /api e /api/v1.
```

---

## 13. Read-Only Files (leitura obrigatória — escrita PROIBIDA)

> Estes arquivos são contexto normativo ou legacy sensível. O executor DEVE lê-los,
> NÃO pode modificá-los nesta onda. Qualquer necessidade de mudança ⇒ aditivo ao plano.

| # | Arquivo | Motivo |
|---|---|---|
| R-1 | `backend/src/middleware/enterprise-context.js` | Legacy carrier (W1-F3). Neutralização SOMENTE via flag lida em F-11; arquivo intacto |
| R-2 | `server/modules/multi-property/middleware/tenant.middleware.ts` | Já endurecido (C36-ID-04). Não regredir I1..I4 |
| R-3 | `server/modules/multi-property/db/property.repository.ts` | Autoridade de leitura de property → pertence a C5/WS-15 |
| R-4 | `server/modules/multi-property/helpers/with-property.ts` | Fail-open registrado (§6.4) → correção pertence a C5 |
| R-5 | `packages/shared/src/types/tenant.ts` | `resolveEnterpriseId` legacy (frontend/shared). Mudança de shared = blast radius cruzado |
| R-6 | `packages/shared/src/tenant/routing.ts` | Roteamento de tenant do cliente. Nunca autoridade (I-04) |
| R-7 | `backend/src/api/v1/auth/routes.js` | Emissor do claim `'ent_1'` (W1-F1). Mudança de emissão = escopo de WS-15/auth |
| R-8 | `backend/src/api/v1/auth/jwt-verify` | Verificação de JWT. Intocado (risco de quebrar identidade) |
| R-9 | `backend/src/api/v1/auth/dpop.service` | DPoP enforcement. Intocado |
| R-10 | `server/modules/multi-property/db/schema/index.ts` | Schema. Qualquer DDL ⇒ MIGRATION GATE |
| R-11 | `backend/server/modules/payments/**` | Árvore não-canônica (W1-F6) + domínio financeiro. Intocado |
| R-12 | `backend/src/db/schema/payments.ts` | Schema duplicado de `refund_requests` (W1-F5 — ADD-4). Reconciliação futura |
| R-13 | `server/modules/communication/**` | Consumidores de query-tenant (§6.2). Migração em fatia dedicada futura |
| R-14 | `server/modules/campanhas/**` | Idem R-13 |
| R-15 | `backend/drizzle/**` | Journal de migrations (ADD-4). Intocado |
| R-16 | `.cursor/rules/**`, `AGENTS.md` | Protegidos por política enterprise (sem token do owner) |
| R-17 | `.agents/shared/**` (exceto este plano) | Evidência de baseline; só PLAN VALIDATION pode emendar normativos |

---

## 14. Forbidden Files (proibição absoluta nesta onda)

```text
MIGRATION / DB
  backend/drizzle/** · backend/server/modules/payments/schema.ts · backend/src/db/schema/**
  server/modules/**/db/schema/** · qualquer *.sql · qualquer seed com DB write
  ⛔ MOTIVO: MIGRATION GATE = CLOSED · DB GATE = CLOSED · I-15
```

```text
FINANCIAL
  backend/server/modules/payments/** · earnings · ledger · reversal · settlement · payout
  qualquer gateway real/mock financeiro · qualquer rota de refund/execução
  ⛔ MOTIVO: FINANCIAL = BLOCKED · WS-07/Wave 9 · C36-DE-06 tem gate próprio
```

```text
IDENTITY EMISSION
  backend/src/api/v1/auth/routes.js (emissão de claim) · jwt-verify · dpop.service
  packages/shared/src/auth/** · login/MFA/2FA · user_2fa · login_2fa_challenges
  ⛔ MOTIVO: mudar emissão de identidade sem WS-15 = criar autoridade paralela (§0)
```

```text
INFRA / DEPLOY / SECRETS
  .env* · secrets · credenciais · CI de deploy (cd-production.yml, cd-staging.yml)
  Docker/VPS/workflows de staging · votos de produção
  ⛔ MOTIVO: STAGING/PRODUCTION = BLOCKED · sem deploy automático
```

```text
BASELINE / EVIDÊNCIA
  131 untracked do baseline · stashes · arquivos dirty pré-existentes
  ⛔ MOTIVO: preservar — não limpar, não mover, não add, não commit (§26 do Master Wave)
```

```text
OUTRAS WORKSTREAMS
  qualquer arquivo cujo owner seja WS-15, C5, WS-16..19, WS-07, DE-14 fora de §12
  ⛔ MOTIVO: Single Writer Lock (§15) — superfícies compartilhadas, escrita serializada
```

**Qualquer violação desta seção reprova o PR independentemente do estado dos testes.**

---

## 15. Single Writer Lock

### 15.1 Regra (Master Wave §3.3)

```text
Arquivos compartilhados por authentication · authorization · enterprise context ·
multi-property · payments · drizzle · security middleware
NÃO podem ser modificados simultaneamente por agentes independentes.
Paralelismo permitido:  DISCOVERY · ANALYSIS · TEST DESIGN · DOCUMENTATION
Escrita:                 SERIALIZED
```

### 15.2 Aplicação a WS-04

```text
1. Uma única fatia ativa por vez (Anexo A). A próxima só inicia após merge humano da anterior.
2. Superfícies F-1/F-2/F-8/F-11 são COMPARTILHADAS (auth, types, registro, app mount):
   qualquer toque nelas exige declarar no PR: antes/depois + prova de não-regressão + CI verde.
3. F-3..F-7 são superfície NOVA (dono exclusivo WS-04): menor risco de colisão, prioridade de entrega.
4. Nenhum agente pode tocar simultaneamente R-* ou Forbidden (§13/§14) — mesmo em "modo leitura ativa".
5. Worktrees isolados + collision analysis prévia são PRÉ-REQUISITO de qualquer paralelismo futuro
   (Master Wave §19) — não autorizados nesta fase.
```

### 15.3 Dono por superfície (quem pode escrever, quando)

```text
server/middleware/auth.middleware.ts .......... WS-04 (fatia própria) · depois: só WS-15 com aditivo
server/types/express.d.ts ..................... WS-04 (fatia própria) · contrato compartilhado
server/modules/multi-property/context/** ..... WS-04 (dono exclusivo)
server/modules/multi-property/middleware/** .. C36-ID-04 / C5 (WS-04: só leitura)
server/modules/campanhas|communication/** .... WS-07/futuro (WS-04: só leitura)
backend/src/middleware/enterprise-context.js . LEGADO (WS-04: só leitura; neutralização via flag)
backend/app.js ................................ WS-04 (somente flag — §12 F-11)
backend/drizzle/** · schemas ................. NINGUÉM (MIGRATION/DB CLOSED)
backend/server/modules/payments/** ........... NINGUÉM (W1-F5/F6 — reconciliação futura)
```

---

## 16. Collision Map

### 16.1 Colisões conhecidas (evidência read-only 2026-10-03)

| # | Superfície | Escritores potenciais | Risco | Mitigação neste plano |
|---|---|---|---|---|
| C-1 | `server/middleware/auth.middleware.ts` | WS-04 (R8–R11) × WS-15 (membership) × C36-ID-04 | **ALTO** — auth compartilhado | Fatia dedicada; toque mínimo; sem alterar verify/DPoP |
| C-2 | `server/types/express.d.ts` | WS-04 × WS-15 × C5 | **ALTO** — tipo global | Declarar campos novos; não renomear/remover existentes |
| C-3 | `backend/app.js` (:58/:60 mounts) | WS-04 (flag) × qualquer onda que monte rota | **MÉDIO** | Somente leitura de env; sem reordenar mounts |
| C-4 | `server/modules/multi-property/index.ts` | WS-04 (exports) × C5 | **MÉDIO** | Export aditivo; sem reorganizar |
| C-5 | `backend/src/middleware/enterprise-context.js` | WS-04 (neutralizar) × legado ativo | **MÉDIO** | Arquivo intacto; comportamento via flag fora dele |
| C-6 | `packages/shared/src/**` | WS-04 × frontend × auth | **ALTO** | Read-only total nesta onda (R-5/R-6) |
| C-7 | `backend/server/modules/payments/**` | WS-04 × WS-07 × DE-14 | **CRÍTICO** | Forbidden total — zero toque |
| C-8 | `backend/drizzle/**` + schemas | WS-04 × ADD-4 × WS-07 | **CRÍTICO** | Forbidden total — zero toque |

### 16.2 Regra de detecção

Antes de CADA fatia, o executor roda o **collision check**:

```text
1. git status --porcelain -- F-*  → algum Allowed File foi tocado fora da fatia ativa?
2. grep da assinatura nova (authorizedEnterpriseContext) fora de F-* → vazamento de autoridade?
3. grep de anti-pattern (§22.4) → nova ocorrência introduzida?
Se qualquer resposta for SIM fora do contratado ⇒ parar, reportar, aguardar Owner.
```

---

## 17. Test Strategy

### 17.1 Onde os testes vivem

```text
Runner:   jest (`backend/package.json` → "test": "jest --runInBand")
Roots:    backend/src · backend/server · packages/shared/src   (backend/jest.config.js)
Match:    **/__tests__/**/*.test.ts
Setup:    backend/src/test/env-defaults.ts · setup.ts · global-teardown.ts
Precedentes de padrão:  backend/src/__tests__/unit/multi-property-tenant-middleware.test.ts
                        backend/src/__tests__/integration/tenant-v1-context.integration.test.ts
```

Os testes NOVOS (F-9/F-10) seguem o mesmo padrão: app Express real + dependências falsas
injetadas (repo/lookup/port), **sem DB, sem migration, sem gateway**.

### 17.2 Camadas de teste

```text
UNIT (F-9)
  ├── translateExternalToInternal: chave válida → id; inválida → null; vazia → null
  ├── resolver: matriz identidade×claim×requested×modo (legacy/enforce) → decisão
  ├── membership port DenyAll: sempre false (prova de fail-closed)
  └── NENHUM fallback literal em nenhum caminho (I-07)

INTEGRAÇÃO (F-10)
  ├── authenticateJwt → authorized-context middleware → probe route
  ├── claim ausente ⇒ 403 em modo enforce
  ├── requested ≠ claim ⇒ 403
  ├── sem token ⇒ 401
  └── modo legacy preserva comportamento atual (prova de não-regressão)

STATIC SCOPE SCAN (CI — §22.4)
  ├── grep de anti-pattern antes/depois de cada fatia
  └── type-check: `authorizedEnterpriseContext` tipado; autoridade nunca `string|number`
```

### 17.3 Cobertura mínima exigida

```text
Resolver + bridge: 100% de branches (funções puras — sem desculpa).
Middleware novo:   todos os ramos de decisão cobertos (401/403/allow/legacy/enforce).
Threshold global do backend (jest.config.js): branches 50 · functions 50 · lines 70 · statements 70.
Nenhuma fatia pode REDUZIR a cobertura existente.
```

---

## 18. Negative / Security Tests (obrigatórios)

Cada item abaixo é um caso de teste NOMEADO. Sem eles, a fatia não fecha.

```text
N-01  query ?enterpriseId=ent_X com JWT de ent_Y (enforce) ............ ⇒ 403
N-02  header X-Enterprise-Id: ent_X com JWT de ent_Y (enforce) ........ ⇒ 403
N-03  path /e/ent_X com JWT de ent_Y (enforce) ........................ ⇒ 403
N-04  JWT sem claim enterpriseId (enforce) ............................ ⇒ 403 (sem default)
N-05  sem token em rota protegida ..................................... ⇒ 401
N-06  req.body.enterpriseId como única fonte .......................... ⇒ ignorado (nunca autoridade)
N-07  optionalJwt sem token ⇒ req.user populado? ...................... ⇒ NÃO (R10)
N-08  claim numérico legado (enterpriseId: 1) ......................... ⇒ string '1' + source:'legacy'
N-09  externalKey desconhecida no bridge .............................. ⇒ null ⇒ DENY
N-10  externalKey vazia / espaços ..................................... ⇒ DENY
N-11  'ent_1' como fallback automático em qualquer caminho novo ....... ⇒ PROIBIDO (I-07)
N-12  lookup de membership indisponível (enforce) ..................... ⇒ 403 (fail-closed)
N-13  membershipVerified .............................................. ⇒ false até WS-15
N-14  requested ausente + claim presente (enforce) .................... ⇒ ALLOW (claim governa)
N-15  claim ausente + requested presente (enforce) .................... ⇒ 403 (pedido ≠ prova)
N-16  `Number()`/coerção implícita em código novo ..................... ⇒ grep falha o CI
N-17  `|| 'ent_1'` / `|| 1` / `?? 1` em código novo .................... ⇒ grep falha o CI
N-18  `req.enterpriseId` lido como autoridade em código novo .......... ⇒ PROIBIDO (só legacy)
```

---

## 19. Regression Tests

### 19.1 Suítes que DEVEM permanecer verdes

```text
1. backend/src/__tests__/unit/multi-property-tenant-middleware.test.ts        (C36-ID-04: I1..I4)
2. backend/src/__tests__/integration/tenant-v1-context.integration.test.ts   (tenant v1)
3. backend/src/__tests__/unit/refund-request-tenant.routes.test.ts
4. backend/src/__tests__/unit/calendario-contexto.util.test.ts
5. backend/src/__tests__/unit/cotacao-entrada-contextual.test.ts
6. packages/shared/src/http/__tests__/metrics-auth.test.ts
7. packages/shared/src/auth/__tests__/*.test.ts (dpop, jwt-secrets)
```

### 19.2 Regra de não-regressão

```text
- Nenhuma fatia pode quebrar teste existente sem justificativa aprovada em PLAN VALIDATION.
- Se o modo `legacy` (default) alterar qualquer comportamento observável ⇒ a fatia está ERRADA.
- Mudança de comportamento só é aceitável em modo `enforce`, atrás de flag, com teste dedicado.
- `npm run test --workspaces --if-present` verde é PRÉ-REQUISITO de PR, não aspiração.
```

---

## 20. Migration Strategy — PLAN ONLY (execução PROIBIDA)

> Esta seção descreve o que **será** necessário quando (e se) o MIGRATION GATE for aberto.
> Nenhum passo aqui é autorizado. I-15 permanece em vigor.

### 20.1 O que a ponte materializada exige

```text
M-1. Tabela de mapeamento external_key ↔ internal_id:
       - external_key TEXT UNIQUE NOT NULL   (garante unicidade — responde §19.6/item 4)
       - internal_id  INTEGER NOT NULL REFERENCES enterprises(id)  (integridade — item 5)
       - created_at / created_by (auditoria de quem registrou cada chave)
M-2. Backfill auditado: cada external_key existente mapeada para enterprises.id,
     SEM inferência automática (nenhum `Number(externalKey)`; cada linha revisada).
M-3. FK de payments.enterprise_id → enterprises (fecha W1-F2) — APÓS reconciliação de tipos
     (UUID × serial), o que por si só exige decisão de migração dedicada.
M-4. Índices: UNIQUE(external_key) + index(internal_id).
M-5. Formalização do journal (ADD-4): registro da migration antes de qualquer nova alteração.
```

### 20.2 Sequência (quando autorizada — NÃO agora)

```text
1. Implementation Plan de MIGRATION dedicado (gate próprio, fora deste plano).
2. Migration DRY-RUN em ambiente descartável (nunca staging/prod primeiro).
3. Backfill + verificação de unicidade/integridade com evidência.
4. Cutover do `EnterpriseKeyLookup` (estático → DB) atrás de flag, com rollback pronto (§21).
5. Reconciliação do schema duplicado de `refund_requests` (W1-F5 — ADD-4).
```

### 20.3 O que este plano EXIGE das fatias atuais por causa do §20

```text
- O bridge (§9.4) recebe `EnterpriseKeyLookup` por INJEÇÃO — nunca importa DB diretamente.
  Assim, o cutover futuro troca a implementação, não o contrato.
- Nenhum código novo pode ASSUMIR que a tabela existe.
- Documentar em cada PR: "esta fatia funciona com lookup estático vazio ⇒ DENY".
```

---

## 21. Rollback Strategy

### 21.1 Propriedade fundamental

```text
WS-04 (fatia contratual) NÃO escreve DB, NÃO aplica migration, NÃO altera schema.
Logo: rollback = reversão de código + flag. Sem plano de reversão de dados.
```

### 21.2 Mecanismos

```text
1. FLAG `AUTHZ_ENTERPRISE_CONTEXT_MODE` (env, default `legacy`):
     legacy   → comportamento pré-WS-04 preservado bit-a-bit.
     enforce  → novo comportamento fail-closed.
   Reversão operacional: voltar a flag para `legacy` (sem redeploy, se env for dinâmico;
   com redeploy do artefato anterior, caso contrário).
2. Reversão de PR: cada fatia é 1 PR pequeno e autocontido (Anexo A) ⇒ `revert` limpo.
3. Sem estado persistente novo ⇒ nenhum dado órfão, nenhuma migração reversa.
4. Se uma fatia introduzir superfície nova (F-3..F-7) e ela precisar sair:
   remover os arquivos novos + exports (F-8) + tipos (F-1) não quebra o legado,
   DESDE QUE nenhum consumidor tenha migrado para a nova superfície ainda.
   (Consumidores só migram em fatia dedicada futura — nunca na mesma fatia que cria a API.)
```

### 21.3 Critério de rollback automático

```text
Se, após merge de uma fatia:
  - qualquer teste de §19 falhar em main, OU
  - o modo `legacy` divergir do comportamento pré-fatia em qualquer rota monitorada, OU
  - o CI slice gate (§22) ficar vermelho sem causa externa comprovada,
⇒ REVERT imediato da fatia + post-mortem documentado antes da próxima tentativa.
```

### 21.4 O que NÃO é rollback aceitável

```text
× "corrigir para frente" com hotfix direto em main sem PR.
× deixar flag `enforce` ligada enquanto investiga falha.
× reverter parcialmente (manter tipos novos + remover resolver).
```

---

## 22. CI Implications

### 22.1 Pipeline por fatia (Master Wave §19 — gate de primeira classe)

```text
Implementation Slice
        ↓
Tests (unit + integração + negativos §18 + regressão §19)
        ↓
Typecheck (`npm run type-check --workspaces --if-present`)
        ↓
Lint (`npm run lint --workspaces --if-present`)
        ↓
Static Scope Scan (§22.4)
        ↓
Security Regression (§22.5)
        ↓
PR (pequeno, com evidência)
        ↓
CI (ci.yml · security.yml · route-smoke.yml · fase4/fase5-tests · e2e)
        ↓
Gate (humano: merge) → Next Slice
```

### 22.2 Workflows existentes relevantes (não criar novos sem necessidade)

```text
ci.yml · security.yml · security-scan.yml · route-smoke.yml · e2e.yml
fase4-tests.yml · fase5-tests.yml · gitleaks.yml · gitleaks-history.yml
c36-staging-* (NÃO disparam nesta onda — staging bloqueado)
cd-production.yml / cd-staging.yml (NÃO disparam — deploy bloqueado)
```

### 22.3 Comandos de validação obrigatórios por fatia (antes do PR)

```text
npm run test --workspaces --if-present
npm run type-check --workspaces --if-present
npm run lint --workspaces --if-present
npm run build --workspaces --if-present
```

### 22.4 Static Scope Scan (grep de anti-pattern — obrigatório)

Rodar ANTES e DEPOIS de cada fatia; o diff NÃO pode conter linhas novas com:

```text
PATTERN                                              MOTIVO
|| 'ent_1'  ·  ?? 'ent_1'                            I-07
|| 1  ·  ?? 1  (em contexto de tenant/property)      I-07 / W0-F2
Number(req.query  ·  Number(req.body                coerção de carrier (W1-F3)
req.body.enterpriseId (como autoridade)              A-1 §5
req.query.enterpriseId (como autoridade)             A-1 §5 / W1-F3
as any (em retorno de framework/middleware)          proibição enterprise
catch silencioso retornando default/vazio            proibição enterprise
nova ocorrência de `string | number` p/ autoridade   §8.3
```

Exceção: ocorrências PRÉ-EXISTENTES listadas em §6.1/§6.4 permanecem até sua fatia de
remediação — o scan falha somente se o COUNT aumentar.

### 22.5 Security regression

```text
- gitleaks verde (sem secrets/commit acidental).
- security.yml / security-scan.yml verdes.
- Nenhum teste de §18 pulado, mutado para passar, ou marcado `.skip`/`.todo`.
- `membershipVerified: false` presente e testado (N-13).
```

### 22.6 Regra de CI vermelho

```text
Checks críticos vermelhos ⇒ PROIBIDO iniciar a próxima fatia sem plano ou PR de correção
(enterprise-ci-slice-gate). Dispensa SOMENTE com autorização explícita do Owner.
```

---

## 23. Executor Instructions

### 23.1 Antes de escrever qualquer linha

```text
1. Ler A-1 (Security Contract), A-2 (W1 ADR §19), A-3 (Master Wave §7/§28), este plano.
2. Rodar collision check (§16.2) e static scope scan baseline (§22.4). Guardar os counts.
3. Confirmar: HEAD = 61040b02 (ou registrar novo HEAD com proveniência); CODE GATE ainda CLOSED.
4. Declarar a fatia ativa (Anexo A) — UMA por vez.
```

### 23.2 Durante a fatia

```text
1. Escrever SOMENTE em arquivos §12, SOMENTE o contratado na fatia ativa.
2. Não redefinir arquitetura, não alterar contratos, não ampliar escopo (Master Wave §3.2).
3. `membershipVerified` permanece false; documentar como dívida, não contornar.
4. Nenhum `as any` em retorno de framework; nenhum catch silencioso.
5. Testes novos seguem o padrão dos precedentes (§17.1): Express real + fakes injetados.
```

### 23.3 Antes do PR

```text
1. `npm run lint` + `npm run test` + `npm run build` + `npm run type-check` verdes.
2. Static scope scan: count de anti-pattern NÃO aumentou.
3. Collision check repetido: sem vazamento de autoridade para fora de F-*.
4. PR pequeno, com: escopo / arquivos / invariantes respeitadas / testes / rollback (§21.2).
5. Revisão humana obrigatória. Sem auto-merge. Sem push force em branch protegida.
```

### 23.4 Proibições do executor (qualquer violação = parar e reportar)

```text
× interpretar este plano como autorização de CODE (CODE GATE = CLOSED até §24).
× tocar R-* ou Forbidden "só para testar".
× aplicar migration, seed com write, ou qualquer DB write.
× limpar/mover/adicionar os 131 untracked do baseline.
× commit/push sem autorização explícita posterior.
× implementar RBAC, roles, PLATFORM_SUPER_ADMIN, step-up, device, approval "de passagem".
```

---

## 24. CODE GATE — CLOSED

```text
╔══════════════════════════════════════════════════════════════╗
║  WS-04 CODE GATE = CLOSED                                    ║
║  Este plano NÃO autoriza implementação.                      ║
║  Abertura exige, NESTA ORDEM:                                ║
║    1. PLAN VALIDATION deste documento pelo Owner;            ║
║    2. decisão SEPARADA e EXPLÍCITA de abertura do CODE GATE; ║
║    3. designação da fatia inicial (Anexo A, S1).             ║
║  Sem 1+2+3, qualquer código escrito sob este plano é         ║
║  NÃO-AUTORIZADO e deve ser descartado, não mergeado.         ║
╚══════════════════════════════════════════════════════════════╝
```

Fronteiras que permanecem intactas independentemente deste plano:

```text
WS-15 = PLAN AUTHORIZED / CODE BLOCKED · C5 = PLAN AUTHORIZED / CODE BLOCKED
DE-14 = PLAN AUTHORIZED / CODE BLOCKED · MIGRATION = BLOCKED · DB = BLOCKED
STAGING = BLOCKED · PRODUCTION = BLOCKED · FINANCIAL = BLOCKED
```

---

## 25. Exit Criteria (`WS04-CONTEXT-PASS`)

O gate só pode ser declarado PASS quando TODOS os itens abaixo forem verdade:

```text
E-01  req.authorizedEnterpriseContext existe, é a ÚNICA autoridade, e está tipado (§8).
E-02  ESCOPO: aplica-se à nova superfície (F-3..F-7) e às rotas efetivamente migradas
      (N-01..N-06 verdes). Consumidores legados NÃO migrados (§6.2, lista fechada)
      permanecem sob a dívida E-13 até S8 — NÃO constituem FAIL de E-02.
E-03  W1-F3 remediado: sem fallback 'ent_1'/1 em caminho novo; legacy neutralizável por flag.
E-04  W1-F4 remediado: claim é declarado, não autoridade; optionalJwt sem autoridade (N-07).
E-05  Bridge §9 existe como ponto único, puro, sem I/O/DB, com 100% de branches (N-09/N-10).
E-06  Membership port definido com DenyAll transitório; membershipVerified=false testado (N-13).
E-07  Regra §0 verificada: nenhuma dual authority introduzida (auditoria de código + testes).
E-08  ADD-2 fechado — VERIFICAÇÃO MECÂNICA (as 3 condições, em AND):
      (a) N-18 = PASS;
      (b) scope scan: count(req.enterpriseId lido como autoridade em código novo) = 0;
      (c) remoção definitiva de req.enterpriseId agendada para S10 (Anexo A).
      "Deprecated/documentado" sem (a)+(b)+(c) NÃO fecha E-08.
E-09  Todos os testes de §18 verdes; todos os de §19 verdes.
E-10  CI slice gate verde em TODAS as fatias (§22); nenhum CI vermelho pendente.
E-11  Rollback exercitado ao menos em DRY-RUN (flag legacy↔enforce) com evidência.
E-12  Dívida explícita entregue a WS-15: membership lookup real + roles + RBAC.
E-13  Dívida explícita entregue a C5: consumidores campanhas/communication + with-property.ts.
E-14  Dívida explícita entregue a MIGRATION: ponte materializada (§20) com plano dedicado.
E-15  Working tree preservado: baseline reconciliado, 131 untracked intactos, sem dirty novo
      sem proveniência.
```

E-08 fecha formalmente o **ADD-2** do Security Contract §24.

---

## 26. Evidence Required for Next Gate

Para declarar `WS04-CONTEXT-PASS` e habilitar o plano de WS-15, o executor entrega:

```text
1. PRs mergeados das fatias (Anexo A), cada um com CI verde + revisão humana.
2. Relatório de testes: unit + integração + N-01..N-18 + regressão §19 (logs anexados).
3. Static scope scan antes/depois (counts + diff), provando E-03/E-07.
4. Type-check + lint + build verdes na HEAD de cada merge.
5. Matriz de decisão do resolver (identidade×claim×requested×modo) publicada.
6. Prova de rollback DRY-RUN (E-11).
7. Declaração de dívidas: WS-15 (E-12), C5 (E-13), MIGRATION (E-14).
8. Baseline final: HEAD, git status, prova de preservação dos untracked (E-15).
9. Nenhum arquivo R-* ou Forbidden tocado (collision check final).
10. Registro de PLAN VALIDATION + decisão de CODE GATE (histórico de gates).
```

---

## Anexo A — Decomposição em Fatias (1 fatia → 1 PR)

> Fatias são PROPOSTA de sequenciamento. A ordem e o conteúdo exato de cada fatia são
> confirmados na PLAN VALIDATION. Nenhuma fatia inicia com CODE GATE CLOSED.

```text
S1  Tipos + contrato (F-3, F-1-parcial)
    └── enterprise-context.types.ts + campos em express.d.ts (só declaração)
    └── teste: type-check compila; nenhum runtime alterado
S2  Bridge puro + testes (F-4, F-9-parcial)
    └── translateExternalToInternal + EnterpriseKeyLookup estático auditado
    └── teste: 100% branches; N-08..N-11, N-16, N-17
S3  Membership port + DenyAll (F-6, F-9-parcial)
    └── EnterpriseMembershipPort + implementação transitória
    └── teste: sempre-false; N-12, N-13
S4  Resolver fail-closed (F-5, F-9-restante)
    └── matriz §8.6 + modos legacy/enforce + source auditável
    └── teste: matriz completa; N-01..N-05, N-14, N-15
S5  Middleware autorizado (F-7, F-8, F-10)
    └── authorized-context.middleware.ts + exports + integração
    └── teste: F-10 completa; N-01..N-07; regressão §19 intacta
S6  Auth claim declarado (F-2)
    └── R8–R11 em authenticateJwt/optionalJwt (toque mínimo, superfície compartilhada)
    └── teste: N-07; regressão auth/dpop/jwt; CI completo
S7  Flag + neutralização do legacy (F-11)
    └── AUTHZ_ENTERPRISE_CONTEXT_MODE lido em backend/app.js; legacy neutralizável
    └── teste: DRY-RUN legacy↔enforce (E-11); prova de não-regressão em legacy
S8  (futura, fora deste gate) Migração de consumidores campanhas/communication → contexto autorizado
S9  (futura, MIGRATION GATE) Ponte materializada (§20) + cutover do lookup
S10 (futura, fatia dedicada) Remoção de req.enterpriseId após S8
```

Ordem recomendada: S1 → S2 → S3 → S4 → S5 → S6 → S7 (dependência crescente, risco crescente).
S6 e S7 tocam superfícies compartilhadas (C-1/C-3) — vão por último de propósito.

---

## Anexo B — Registro de Gates deste Plano

```text
2026-10-03  W0-GATE = PASS / CLOSED                              (Master Wave §28)
2026-10-03  W1-GATE = PASS (D-ID02-NS=C · ADD-3=server/modules/**, Owner §19)
2026-10-03  WS-04 = PLAN AUTHORIZED / CODE BLOCKED                (Master Wave §28)
2026-10-03  Este plano emitido (Implementation Plan — sem código)
2026-10-03  Emendas F-1/F-2/F-3 incorporadas (autorização Owner) — validação dirigida: F-1 PASS / F-2 PASS / F-3 PASS
2026-10-03  PLAN VALIDATION = PASS (E-01..E-15 = PASS)
PENDING     CODE GATE — CLOSED até autorização explícita da S1 (Owner)
PENDING     WS04-CONTEXT-PASS (critérios §25)
```

---

## Anexo C — Estado do Working Tree na Emissão

```text
HEAD: 61040b02 (feat/c36dd-refund-request-domain) — inalterado
git status --porcelain: 218 entradas (baseline W0: 88 tracked modified + 131 untracked)
Este plano é um arquivo NOVO e UNTRACKED em .agents/shared/** — não altera código,
não altera baseline de código, não requer commit.
Stashes: preservados. Nenhum reset/restore/clean/stash/add/commit/push executado.
```

---

*Fim do WS-04 Implementation Plan. CODE GATE = CLOSED. Aguardando PLAN VALIDATION.*



















