# C36-ID-02 / WS-15 — S1 Discovery / Authority Inventory

```text
WS-15 PLAN VALIDATION = PASS
WS-15 S1 CODE GATE    = OPEN — AUDIT ONLY (Discovery)
MODE                  = READ-ONLY · nenhum código de produto, migration ou DB
HEAD                  = 61040b02 (feat/c36dd-refund-request-domain) — inalterado
Data                  = 2026-10-03
```

S1 é **inventário de autoridade**. Nenhuma escrita de código nesta fatia. Este documento é a
única entrega: catálogo reconciliado para S2 (Membership Contract).

---

## 1. Namespace canônico (ADD-3)

`server/modules/` — **30 módulos** (evidência literal):

```text
acomodacoes · agentes · auctions · bookings · campanhas · cloud · cms · comissoes
communication · configuracoes · cotacao-publica · crm · financeiro
fornecedores-hub · guest-portal · housekeeping · logistica · marketing
multi-property · notifications · orcamentos · partners · passageiros · pricing
propostas · relatorios · revenue · roteiro · roteiro-analytics · tracking · vouchers
```

Módulo canônico candidato para WS-15: `server/modules/membership/` (**não existe ainda**).
Proibido `backend/server/modules/authorization/**` (W1-F6, árvore não-canônica).

## 2. Superfície de contexto herdada do WS-04 (read-only nesta fatia)

`server/modules/multi-property/context/` — 6 arquivos, todos validados em WS04-CONTEXT-PASS:

```text
enterprise-context.types.ts · enterprise-key-bridge.ts · enterprise-membership.port.ts
enterprise-context.resolver.ts · authorized-context.middleware.ts · enterprise-claim.ts
```

`server/middleware/`: `auth.middleware.ts`, `create-ip-rate-limit.ts`, `get-client-ip.ts`,
`mp-webhook-ip-limiter.ts`, `public-limiter.ts`, `socket-handshake-rate-limit.ts`,
`turnstile.middleware.ts`.
`backend/src/middleware/`: `canonical-redirect.js`, **`enterprise-context.js` (LEGADO)**,
`security-config.js`, `security-headers.js`.

---

## 3. AUDIT-A — Autoridade de identidade e enterprise

| # | Entidade | Evidência | Estado |
|---|---|---|---|
| A-1 | `users` | INTEGER/serial | canônica |
| A-2 | `enterprises` | INTEGER/serial (`enterprises.id`) | canônica (alvo da tradução S2 do WS-04) |
| A-3 | `enterprise_users` / `memberships` | **NENHUMA ocorrência no repositório** | ❌ **AUSENTE** |
| A-4 | `permissions` (tabela) | **NENHUMA ocorrência** | ❌ **AUSENTE** |
| A-5 | `roles` (tabela) | **NENHUMA ocorrência** | ❌ **AUSENTE** |
| A-6 | `organizations` / `tenants` (tabelas) | **NENHUMA ocorrência** | ❌ **AUSENTE** |

**Conclusão A:** hoje **não existe** autoridade de membership nem de RBAC em forma de tabela.
Uma tabela nova em S3 não nasce como segunda autoridade concorrente — mas também **não há
fonte existente a reconciliar**, o que torna o backfill (§7) obrigatório e não opcional.

## 4. AUDIT-B — Única relação usuário→escopo existente

`PropertyUser` (`server/modules/multi-property/db/schema/index.ts`) — única relação real
user↔escopo do projeto:

```text
id · property_id · user_id
role: 'owner'|'admin'|'manager'|'staff'|'housekeeper'|'receptionist'
permissions?: string[]            ← campo opcional, NÃO populado por contrato
invited_by? · invited_at? · accepted_at? · is_active: boolean
created_at · updated_at
```

Consumidores: `db/property.repository.ts`, `db/schema/index.ts`,
`services/property.service.ts`, `smoke-tests.ts`.

**Três fontes de papel, incompatíveis entre si:**

```text
PropertyUser.role (6 valores, por property, PERSISTIDO)
      ×
propostas/rbac.ts ROLE_RANK (user/operador/manager/supervisor/admin, hierárquico, volátil)
      ×
auth.middleware requireRole (allowlist de string, vindo de req.user.role = CLAIM do JWT)
```

⇒ **Nenhum é autoridade.** `PropertyUser` é o único persistido, mas é **property-scoped**
(não enterprise-scoped) ⇒ pertence a **C5**. `rbac.ts` e `requireRole` são convenções voláteis.

---

## 5. AUDIT-C — Mecanismos de role existentes (todos derivados de claim)

| # | Mecanismo | Origem do valor | Persistido? | Autoridade? |
|---|---|---|---|---|
| C-1 | `requireRole(...roles)` (`server/middleware/auth.middleware.ts`) | `req.user.role` = claim JWT | ❌ | ❌ NÃO |
| C-2 | `staffAuth = [authenticateJwt, requireRole('admin','manager','user')]` | idem | ❌ | ❌ NÃO |
| C-3 | `rankRole` / `hasMinRole` / `requireRoleMin` (`server/modules/propostas/rbac.ts`) | `req.user?.role` | ❌ | ❌ NÃO (rank 0 nega; convenção C36 local) |
| C-4 | `hk-auth.middleware.ts` (housekeeping) | claim | ❌ | ❌ NÃO |

**Divergência crítica:** `requireRole` aceita `'user'` como staff autorizado; `rbac.ts` classifica
`user` como rank 1. Um usuário que passa em `staffAuth` pode falhar em `requireRoleMin`.
É exatamente a "segunda convenção" que o WS-15 deve reconciliar — **sem promover nenhuma das
duas a contrato global** (plano §14).

**Consumers de `req.user.role` / `requireRole` (24 arquivos):** acomodacoes (4), cms, comissoes,
configuracoes, crm, fornecedores-hub, guest-portal/admin, housekeeping (7), multi-property
(middleware + routes), partners, propostas (routes + rbac), revenue.

## 6. AUDIT-D — Consumidores legados de carrier de tenant (catálogo S9)

| Classe | Arquivos | Veredito preliminar |
|---|---|---|
| **Query/header tenant** | `server/modules/campanhas/routes/index.ts`; `communication/routes/{campaigns,email,inbox,push,sms,templates,webhooks,whatsapp}.routes.ts`; `orcamentos/routes/index.ts`; `passageiros/routes/index.ts`; `propostas/routes/index.ts` | **MIGRATE S8** (dívida E-13 do WS-04) |
| **Legado backend** | `backend/src/api/v1/tenant/routes.js`; `backend/src/api/v1/auctions/routes.js`; `backend/src/middleware/enterprise-context.js` | **DEPRECATE** (WS-04 R-1) — intocado |
| **Já WS-04** | `multi-property/context/authorized-context.middleware.ts` (menções = doc de proibição) | **SAFE / NO ACTION** |

Nenhum consumidor foi migrado nem tocado nesta fatia.

---

## 7. Implicação de dados para WS-15 (MIGRATION = BLOCKED — apenas impacto)

Como A-3..A-5 são **ausentes**, autoridade real de membership **exigirá estrutura nova**:

```text
1. membership/enterprise_users(user_id, enterprise_id, status, created_*, updated_*)
   com FK → users(id) e → enterprises(id)  [W1-F2 mantém enterprises.id = serial]
2. role assignments por membership (papéis reconciliados de PropertyUser.role ∪ rbac ROLE_RANK)
3. (condicional) permission set — ou contrato mínimo, decidido em S2
4. ponte external_key ↔ internal_id (UNIQUE + FK) — dívida WS-04 §20, ainda MIGRATION
```

Impacto documentado, **não autorização**. `MIGRATION APPLY` e `DB APPLY` permanecem BLOCKED.
S2 deve fechar o contrato **antes** de qualquer desenho de tabela.

## 8. Riscos que S2 deve resolver

```text
R-1 PropertyUser é property-scoped ⇒ NÃO pode servir de fonte de membership enterprise-level
    sem decisão explícita (risco: membership de A autoriza B — I-06).
R-2 Propagar PropertyUser.role para RBAC global = promover convenção C36 a contrato (proibido).
R-3 Papéis divergentes (6 valores vs 5 valores vs allowlist livre) ⇒ taxonomia única necessária.
R-4 permissions?: string[] em PropertyUser é campo órfão ⇒ verificar populamento real antes de
    decidir entre "reusar" e "criar contrato mínimo" (plano §15).
R-5 users/enterprises serial × UUID coexistindo em payments (W1-F2/F5) ⇒ WS-15 deve usar
    internalEnterpriseId (serial) e jamais derivar de externalKey.
```

## 9. Não-duplicação (§23) — resposta à pergunta obrigatória

*"Essa autoridade já existe em algum lugar do RSV360?"*

```text
Identity   (users)         → EXISTE (serial)                  → reutilizar
Enterprise (enterprises)   → EXISTE (serial)                  → reutilizar
User↔Scope (PropertyUser)  → EXISTE, mas property-scoped (C5) → NÃO usar como membership
Roles      (tabela)        → NÃO EXISTE                       → criar (S3, MIGRATION gate)
Permissions(tabela)        → NÃO EXISTE                       → decidir em S2 (mínimo)
Guard      (requireRole)   → EXISTE, claim-derived, volátil    → substituir, nunca estender
```

**Veredito:** nenhuma autoridade paralela será criada sem necessidade; duas estruturas novas são
inevitáveis (membership + roles) e ambas ficam atrás do MIGRATION GATE.

## 10. Evidência de escopo desta fatia

```text
git status --porcelain : 228 entradas (baseline preservado; nenhuma escrita de código S1)
git rev-parse HEAD     : 61040b02 (inalterado)
commits S1             : ZERO
arquivos de código     : ZERO criados/modificados nesta fatia
migration / DB write   : ZERO
```

---

## 11. Entrega de S1 → entrada de S2

```text
S1 (Discovery / Authority Inventory) = PASS / CLOSED
      ↓
S2 — Membership Contract   [ NÃO autorizado · CODE GATE S2 = CLOSED ]
     inputs: AUDIT-A..D + riscos R-1..R-5 + catálogo S9
     perguntas: taxonomia única de papéis · status de membership · formato do veredict ·
                reuso (ou não) de PropertyUser · permission: tabela ou contrato mínimo
```

Estado ao encerrar: `WS-15 PLAN = PASS · WS-15 S1 = PASS/CLOSED · WS-15 S2 = BLOCKED`.
C36-DE-05 = PASS/CLOSED (intocado) · DE-06 = BLOCKED/gate próprio · C5 = BLOCKED ·
MIGRATION/DB/STAGING/PRODUCTION = BLOCKED.



