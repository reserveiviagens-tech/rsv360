# RSV360 — PACOTE C  
## MASTER PRE-IMPLEMENTATION RECONCILIATION

| Campo | Valor |
|---|---|
| Modo | PLAN / DISCOVERY / RECONCILIATION ONLY |
| Data | 2026-10-07 |
| Remote HEAD | `be14b977591bcdd86d038efcecb42512dc7e9d71` |
| Branch | `feat/c36dd-refund-request-domain` |
| Ahead / behind | **0 / 0** |
| CODE / MIGRATION / COMMIT / PUSH | **NOT AUTHORIZED** |
| Ondas 1–3 | **REMOTE CLOSED — não reabrir** |
| Verdict | **RECONCILIATION PASS** |
| CODE GO | **NÃO EMITIDO** |

---

## 1. Executive Summary

O Pacote C **não** é o “resto sujo do working tree”. É a onda de **infraestrutura/integração membership** que foi **deliberadamente excluída** da Onda 3 porque misturava:

- barrel `membership/index.ts`;
- RoleAssignment (M5/M6 residual no WT);
- guards canônicos de domínios **fora** de Acomodações/Tarifas/Anfitrião (G-C.9);
- wiring de rotas consumidoras;
- e (em risco) superfícies dual-tree `backend/server/modules/**`.

**G-C.9 ≠ Pacote C.**  
G-C.9 = guards/routes **específicos** acomodações/tarifas/anfitrião (REMOTE CLOSED em `be14b977`).  
Pacote C = guards/domínio restantes + RoleAssignment adapter/repository + política do barrel + wiring — **sem** reabrir G-C.9/G-D e **sem** alterar `staffAuth` global.

```text
PACOTE C = NÃO PRONTO PARA CODE GO AUTOMÁTICO
         = PRONTO PARA OWNER REVIEW DESTE ARTEFATO
         = exige ODs (barrel / fatiamento / migration 0064 / dual-tree)
```

Nenhuma implementação, commit ou push foi executada nesta reconciliação.

---

## 2. Current State

```text
Remote HEAD:     be14b977  feat(acomodacoes): G-C.9 membership authority
Onda 1:          f73c0812  REMOTE CLOSED
Onda 2 / Pacote A: 58efbef2  REMOTE CLOSED (G-D)
Onda 3 / Pacote B: be14b977  REMOTE CLOSED (G-C.9)
Working tree:    DIRTY residual (Pacote C candidatos + OUT-OF-SCOPE)
Merge-base:      = HEAD = origin tip
```

Evidência Onda 3 (`WAVE_ONDA3_PAYLOAD_VALIDATION.md`):  
`membership/index.ts` excluído porque exports misturavam Pacote C; routes G-C.9 importam guards **por path direto**.

---

## 3. Provenance

| Item | Valor |
|---|---|
| `git rev-parse HEAD` | `be14b977591bcdd86d038efcecb42512dc7e9d71` |
| Tracking | `origin/feat/c36dd-refund-request-domain` UP TO DATE |
| Operações Git nesta reconciliação | **somente leitura** (`status`, `show`, `ls-tree`, `diff`) |
| Stash/rebase/push/commit | **NÃO** |

---

## 4. Package C Definition

### 4.1 O que É Pacote C

```text
C1 — RoleAssignment surface (WT untracked)
     role-assignment.repository.ts
     role-assignment.adapter.ts
     + testes dedicados

C2 — Domain membership guards NÃO-G-C.9 (WT untracked)
     crm, guest-portal-admin, multi-property, revenue, payments,
     fornecedores-hub, cms, configuracoes, notifications, campanhas,
     passageiros, logistica, relatorios, orcamentos
     + testes *-guard.test.ts

C3 — Consumer route wiring (WT modified) que passa a compor
     staffAuth legado + guard canônico (flag WS15_MEMBERSHIP_AUTHORITY)
     nos módulos acima

C-BARREL — política de export de membership/index.ts (WT modified)
           = decisão arquitetural (OD obrigatória), não “fix Onda 3”
```

### 4.2 O que NÃO é Pacote C

| Item | Classificação |
|---|---|
| Guards/routes G-C.9 (acomodacoes/tarifas/anfitrião) | **OUT-OF-SCOPE** (REMOTE CLOSED) |
| Propostas/Agentes/cotacao G-D | **OUT-OF-SCOPE** (REMOTE CLOSED) |
| Alterar export global `staffAuth` | **FUTURE-GATE** (G-C StaffAuth NOT STARTED) |
| `apps/**` UI | **OUT-OF-SCOPE** |
| Drizzle `0063` refund decisions | **FUTURE-GATE / Migration separada** |
| Drizzle `0064` enterprise_users | **Migration gate separado** (mesmo que RoleAssignment dependa) |
| Reabrir G-E / WS / S10 | **FUTURE-GATE** (OD-WAVE-04 DEFER) |

### 4.3 Subdivisão recomendada (não autorizada)

| Fatia | Conteúdo | Racional |
|---|---|---|
| **C1** | RoleAssignment repo/adapter + testes | Fecha cadeia M5→consumidores sem barrel amplo |
| **C2** | Guards domínio + testes (sem routes) | Isola contratos fail-closed |
| **C3** | Route wiring por módulo (1 PR / domínio ou lote Owner) | Blast radius controlado |
| **C-BARREL** | `index.ts` policy | Só após OD-C-01 |

---

## 5. Path Inventory

### 5.1 Membership — HEAD (committed) vs WT

| Path | HEAD | WT | Classificação | Motivo | Autoridade | Gate | Risco A/B/C |
|---|---|---|---|---|---|---|---|
| `membership/index.ts` | core exports only | +28 lines (C + G-C.9 re-exports) | **C-SHARED** | Barrel arquitetural; excluído Onda 3 | Contrato público do módulo | Pacote C / OD-C-01 | **ALTO** se reexportar G-C.9+C juntos |
| `membership.types.ts` | yes | clean | **C-SHARED** | Contrato S2 | Role/status canônicos | M0–M6 CLOSED — tocar = SHARED-RISK | ALTO |
| `membership.verdict.ts` | yes | clean | **C-SHARED** | Verdict fail-closed | Membership allow/deny | SHARED-RISK | ALTO |
| `membership.repository.ts` | yes | clean | **C-SHARED** | Port repository | Lookup membership | SHARED-RISK | ALTO |
| `membership.plug.ts` | yes | clean | **C-SHARED** | Flag `WS15_MEMBERSHIP_AUTHORITY` | Liga/desliga camada canônica | SHARED-RISK | ALTO |
| `role.context.ts` | yes | clean | **C-SHARED** | CanonicalRoleContext S5 | Contexto canônico | SHARED-RISK | ALTO |
| `role.guards.ts` | yes | clean | **C-SHARED** | `requireEnterpriseRole` S6 | Hierarquia enterprise | SHARED-RISK | ALTO |
| `rbac.mapping.ts` | yes | clean | **C-SHARED** | Mapping permissions | Derivado do role | SHARED-RISK | MÉDIO |
| `acomodacoes-*.guard.ts` (3) | yes | clean | **OUT-OF-SCOPE** | G-C.9 CLOSED | Partner/staff acomodações | — | Reabrir = BLOCKER |
| `anfitriao-*.guard.ts` (3) | yes | clean | **OUT-OF-SCOPE** | G-C.9 CLOSED | Partner anfitrião | — | Reabrir = BLOCKER |
| `tarifas-*.guard.ts` / `*.scope.ts` (6) | yes | clean | **OUT-OF-SCOPE** | G-C.9 CLOSED | Tarifas/política | — | Reabrir = BLOCKER |
| `role-assignment.repository.ts` | no | ?? | **C-CORE** | M5 persistência `enterprise_users` | RoleAssignment | C1 | MÉDIO |
| `role-assignment.adapter.ts` | no | ?? | **C-CORE** | Resolve CanonicalRoleContext | Bridge repo→S5 | C1 | MÉDIO |
| `crm.guard.ts` | no | ?? | **C-CORE** | G-B.1 complementary | Flag+enterprise ctx | C2 | MÉDIO |
| `guest-portal-admin.guard.ts` | no | ?? | **C-CORE** | G-B.2-ish | idem | C2 | MÉDIO |
| `multi-property.guard.ts` | no | ?? | **C-CORE** | Multi-property | idem | C2 | MÉDIO |
| `revenue.guard.ts` | no | ?? | **C-CORE** | Revenue | idem | C2 | MÉDIO |
| `payments.guard.ts` | no | ?? | **C-CORE** | Payments | idem | C2 + dual-tree OD | **ALTO** |
| `fornecedores-hub.guard.ts` | no | ?? | **C-CORE** | Fornecedores | idem | C2 | MÉDIO |
| `cms.guard.ts` | no | ?? | **C-CORE** | CMS | idem | C2 | MÉDIO |
| `configuracoes.guard.ts` | no | ?? | **C-CORE** | Config | idem | C2 | MÉDIO |
| `notifications.guard.ts` | no | ?? | **C-CORE** | Notifications | idem | C2 | MÉDIO |
| `campanhas.guard.ts` | no | ?? | **C-CORE** | Campanhas | idem | C2 | MÉDIO |
| `passageiros.guard.ts` | no | ?? | **C-CORE** | Passageiros | idem | C2 | MÉDIO |
| `logistica.guard.ts` | no | ?? | **C-CORE** | Logística | idem | C2 | MÉDIO |
| `relatorios.guard.ts` | no | ?? | **C-CORE** | Relatórios | idem | C2 | MÉDIO |
| `orcamentos.guard.ts` | no | ?? | **C-CORE** | Orçamentos | idem | C2 | MÉDIO |

### 5.2 Consumer routes (WT modified) — C3 candidates

| Path | Classificação | Função | Gate | Risco |
|---|---|---|---|---|
| `server/modules/crm/routes/index.ts` | **C-DEPENDENCY** / C3 | Wire CRM guard | C3 | Médio |
| `server/modules/campanhas/routes/index.ts` | C3 | Wire campanhas | C3 | Médio — local `staffAuth` array |
| `server/modules/cms/routes.ts` | C3 | Wire CMS | C3 | Médio |
| `server/modules/configuracoes/routes/index.ts` | C3 | Wire config | C3 | Médio |
| `server/modules/fornecedores-hub/routes/index.ts` | C3 | Wire hub | C3 | Médio |
| `server/modules/guest-portal/routes/admin.routes.ts` | C3 | Wire guest admin | C3 | Médio |
| `server/modules/logistica/routes/index.ts` | C3 | Wire logística | C3 | Médio — local staffAuth |
| `server/modules/multi-property/routes/index.ts` | C3 | Wire MP | C3 | Médio |
| `server/modules/notifications/{routes,management,settings}*.js` | C3 | Wire notifications | C3 | Médio |
| `server/modules/orcamentos/routes/index.ts` | C3 | Wire orçamentos | C3 | Médio |
| `server/modules/passageiros/routes/index.ts` | C3 | Wire passageiros | C3 | Médio |
| `server/modules/relatorios/routes/index.ts` | C3 | Wire relatórios | C3 | Médio — local staffAuth |
| `server/modules/revenue/routes/index.ts` | C3 | Wire revenue | C3 | Médio |
| `server/modules/partners/routes/index.ts` | **UNRESOLVED — OD** | Partner surface ≠ G-C.9 anfitrião | OD-C-06 | Alto |
| `backend/server/modules/payments/**` | **SHARED-RISK / OD** | Dual-tree payments | OD-C-05 | **Alto** |

### 5.3 Tests

| Path | Classificação | Status |
|---|---|---|
| `backend/src/__tests__/unit/{crm,campanhas,cms,configuracoes,fornecedores-hub,guest-portal-admin,logistica,multi-property,notifications,orcamentos,passageiros,payments,relatorios,revenue}-guard.test.ts` | **C-TEST** | ?? untracked |
| `backend/src/__tests__/unit/role-assignment-{adapter,repository}.test.ts` | **C-TEST** | ?? |
| `backend/src/__tests__/unit/multi-property-{identity,property-listing}.test.ts` | **C-TEST** / C-DEPENDENCY | ?? — confirmar escopo OD |
| `backend/src/__tests__/integration/membership-ws04-chain.integration.test.ts` | **C-TEST** | ?? |
| `membership-contract/repository`, `role-context`, `role-guards`, `enterprise-*` (HEAD) | **C-TEST** baseline | committed — regressão obrigatória; **não “consertar” baseline** |
| `gd*.test.ts`, `acomodacoes-*-guard`, `anfitriao-*-guard`, `tarifas-*` | **OUT-OF-SCOPE** | G-D / G-C.9 CLOSED |

### 5.4 Documentation

| Path | Classificação |
|---|---|
| `.agents/shared/PACOTE_C_MASTER_PRE_IMPLEMENTATION_RECONCILIATION.md` | **C-DOCUMENTATION** (este arquivo) |
| `WAVE_ONDA3_*`, `GD_*`, `GC9_*`, `PA-W*` | **OUT-OF-SCOPE** (ondas fechadas) |
| `G-C_STAFFAUTH_DISCOVERY_PLAN.md` | **FUTURE-GATE** |

### 5.5 Migration artifacts (não Pacote C code)

| Path | Classificação |
|---|---|
| `backend/drizzle/0063_*` + snapshot | **FUTURE-GATE** (refund) |
| `backend/drizzle/0064_enterprise_users.sql` + snapshot + journal dirty | **MIGRATION-ONLY / SEPARATE GO** |
| Durable DB apply / seed / staging | **BLOCKED** |

---

## 6. Membership Architecture

Cadeia canônica **preservada** (não reimplementar):

```text
enterprise_users.role  (0064 / M1)
        ↓
RoleAssignment Repository  (role-assignment.repository.ts — WT C1)
        ↓
MembershipRecord (+ findRole)
        ↓
role-assignment.adapter → CanonicalRoleContext  (S5)
        ↓
requireEnterpriseRole / requireEnterprisePermission  (S6 — role.guards.ts HEAD)
        ↓
domain guards (crm.guard etc.) quando flag ON
        ↓
rotas: legado requireRole/staffAuth PERMANECE; canônico é ADITIVO
```

Contratos fail-closed confirmados no código HEAD/`crm.guard.ts`:

| Regra | Estado |
|---|---|
| ausência membership → DENY (flag ON) | PRESERVED |
| `membershipVerified !== true` → DENY | PRESERVED |
| role inválida → DENY | PRESERVED (`isCanonicalRole`) |
| IDs inválidos → null → DENY | PRESERVED (repository) |
| erro repository → null → DENY | PRESERVED |
| suspended/revoked → não authorizing | PRESERVED |
| enterprise só de `authorizedEnterpriseContext` | PRESERVED (D10) |
| body/query/header ≠ autoridade | PRESERVED |
| hierarquia viewer < manager < admin (< owner) | PRESERVED (`ENTERPRISE_ROLE_RANK`) |
| flag OFF → next() (legado governa) | PRESERVED |

**Proibido no Pacote C:** criar segunda cadeia, ler `req.user.role` como enterprise authority, promover RANK local de propostas, alterar `staffAuth` export.

Nota HEAD `index.ts`: `membership.authority.ts` **não existe** — contrato S2 only; implementação autorizadora = gates S3/S4 históricos / não reabrir como “gap C”.

---

## 7. `membership/index.ts` Analysis

### HEAD (publicado)

```text
export * from membership.types | verdict | repository | plug |
                 role.context | role.guards | rbac.mapping
(+ nota: membership.authority.ts NÃO existe em S2)
```

**Não exporta** guards G-C.9 nem Pacote C — correto para isolamento.

### Working tree (dirty — NÃO commitado)

Adiciona exports de:

- RoleAssignment repo/adapter;
- **todos** os guards Pacote C;
- **e também** re-exports dos guards G-C.9 (acomodacoes/anfitriao/tarifas).

### Consumers do barrel hoje

Imports `from '.../membership'` (sem subpath) encontrados em testes:

- `membership-repository`, `membership-contract`, `role-guards`, `role-context`
- `membership-authority-plug.integration`, `legacy-isolation.integration`, `membership-ws04-chain.integration`

Rotas G-C.9 / domínio usam **path direto** (`../../membership/crm.guard` etc.) — barrel **não** é obrigatório para runtime das rotas.

### Conclusões

| # | Achado |
|---|---|
| 1 | Alterar barrel **não** é necessário para G-C.9 (já CLOSED via path imports) |
| 2 | Alterar barrel **pode** ser desejável para C1/C2 DX — mas é **mudança de contrato público** |
| 3 | Reexportar G-C.9 no mesmo commit C = **mistura A/B/C** → **DENYLIST** |
| 4 | Risco: segunda “porta” de autoridade se barrel passar a reexportar adapters sem disciplina |
| 5 | Gate: **OD-C-01** antes de qualquer CODE que toque `index.ts` |

**Recomendação (não autoriza):**  
Opção A — **não alterar** `index.ts` no Pacote C (manter path imports).  
Opção B — exportar **somente** C1/C2 (RoleAssignment + guards não-G-C.9), **nunca** reexportar G-C.9 neste gate.

---

## 8. RoleAssignment / M0–M6 Boundary

| Check | Resultado |
|---|---|
| Cadeia enterprise_users → Repository → recordRole → CanonicalRoleContext → S5/S6 | **PRESERVED** no desenho WT |
| Novo RoleAssignment paralelo? | **NÃO** observado (único `PgEnterpriseUsersRepository`) |
| Duplicar role resolution? | Adapter concentra `resolveCanonicalRoleContext` — OK se não for duplicado em rotas |
| Body/claims como autoridade? | Guards inspecionados: **NÃO** |
| Contornar CanonicalRoleContext? | `requireEnterpriseRole` só aceita contexto — OK |
| Segunda hierarquia? | Usa `ENTERPRISE_ROLE_RANK` canônico — OK |
| Conflito BLOCKER para reconciliação? | **Nenhum** |
| Risco CODE | Wiring Pool/runner ainda “unconfigured” default → fail-closed até composition — **não** inventar Pool no Pacote C sem OD |

M0–M6 permanecem CLOSED como foundation; Pacote C **consome**, não redefine.

---

## 9. G-D Boundary

| Item | Estado |
|---|---|
| G-D principal | **REMOTE CLOSED** (`58efbef2`) |
| `staffAuth` global (`server/middleware/auth.middleware.ts`) | **NÃO alterar** |
| `agentAuth` | alias local documentado ≡ `staffAuth` em propostas (OD-GD-03) |
| Partner `agente` | distinto — PA/G-C.9 |
| Pacote C reabre G-D? | **PROIBIDO** |
| Overlap staffAuth evolution | **FUTURE-GATE** G-C StaffAuth = NOT STARTED |

---

## 10. G-C.9 Boundary

| G-C.9 | Pacote C |
|---|---|
| REMOTE CLOSED (`be14b977`) | PRE-CODE / este artefato |
| paths fechados (guards+routes+tests acomodações/tarifas/anfitrião) | paths candidatos C1–C3 |
| autoridade Partner já validada | autoridade Enterprise complementar (flag) |
| **não reabrir** | **não implementar** até CODE GO + ODs |

Proibições Pacote C:

- editar guards/routes G-C.9 “enquanto faz barrel”;
- “completar” Onda 3 com `index.ts` reexportando G-C.9;
- misturar commit C + paths Onda 3.

---

## 11. Security / Authority Analysis

### Fontes proibidas (confirmado nos guards C inspecionados)

```text
req.body / query / headers como role ou enterpriseId
client-provided role
spoofed claims como enterprise authority
RANK local propostas promovido a global
```

### Fontes permitidas

```text
authorizedEnterpriseContext (D10)
enterprise_users via RoleAssignment repository
CanonicalRoleContext
requireEnterpriseRole hierarchy
flag WS15_MEMBERSHIP_AUTHORITY (OFF = legado; ON = fail-closed canônico)
```

### Dual-tree

`server/modules/**` vs `backend/server/modules/**` (payments) permanece **risco estrutural** (ADD-3 / D-ID02-NS) — **OD-C-05**; não resolver implicitamente no Pacote C.

Violação BLOCKER para CODE: nenhuma nova na reconciliação; risco residual = barrel + dual-tree + migration acoplada.

---

## 12. Shared Files

| Shared path | Owners | Contrato atual | Safe boundary | Gate |
|---|---|---|---|---|
| `membership/index.ts` | WS-15 / Pacote C | Barrel S2 core | Não reexportar G-C.9 sem OD | OD-C-01 |
| `role.guards.ts` / `role.context.ts` | S5/S6 | Fail-closed enterprise | Só extensão tipada; sem HTTP | SHARED-RISK |
| `membership.plug.ts` | S8 flag | Feature flag | Não mudar semântica OFF/ON | SHARED-RISK |
| `auth.middleware.ts` `staffAuth` | Legado / G-C futuro | JWT roles HTTP | **Denylist Pacote C** | G-C StaffAuth |
| `multi-property/.../enterprise-context*` | WS-04 / MP | Enterprise resolution | Consumir; não redefinir D10 | SHARED-RISK |
| G-C.9 guards | G-C.9 | Partner authority | **Denylist** | — |
| propostas/* | G-D | Staff/economic | **Denylist** | — |

---

## 13. Tests

### Obrigatórios (futuro CODE — não executados para “greenwash”)

**Unit C2/C1**

- cada `*-guard.test.ts` Pacote C (flag OFF passthrough; flag ON DENY paths);
- `role-assignment-repository` / `adapter` (null runner, invalid ids, revoked/suspended, cross-enterprise);
- regressão HEAD: `membership-*`, `role-guards`, `role-context`, `enterprise-*`.

**Integration**

- `membership-ws04-chain.integration.test.ts` (candidato);
- `membership-authority-plug` / `legacy-isolation` (baseline).

**Regression family**

- módulos cujas routes entram em C3;
- G-C.9 family deve permanecer **NEW FAILURES = 0** (não editar G-C.9);
- G-D `gd*` untouched;
- typecheck: registrar baseline pré-existente; não corrigir fora de escopo.

### Observação

Testes **não** foram alterados nesta reconciliação. Execução opcional de baseline = fora deste artefato (Owner pode pedir `TEST OBSERVE GO` separado).

---

## 14. Migration Analysis

```text
Pacote C code scope: does not require writing new migration SQL
RoleAssignment runtime: depends on enterprise_users (0064) existing in target env
0064 artifact in WT: migration belongs to SEPARATE GATE
0063 refund: OUT — separate gate
```

| Campo | Valor |
|---|---|
| Candidate | `0064_enterprise_users.sql` |
| Tables | `enterprise_users` |
| Nature | CREATE-only additive (header SQL) |
| Backfill/seed | NÃO neste SQL (M3 manual / Owner) |
| Authorization | **MIGRATION GO separado** — nunca embutir em CODE Pacote C |
| Apply durable/staging/prod | **NOT AUTHORIZED** |

**Veredito migration:** `migration belongs to separate gate` + `uncertain whether 0064 already applied in each env` → evidência de ambiente **fora** deste doc.

---

## 15. Owner Decisions

### OD-C-01 — Barrel `membership/index.ts`

```text
Decision: Política de export do barrel no Pacote C
Options:
  (A) Não alterar index.ts (path imports only) — RECOMMENDED
  (B) Exportar somente C1/C2 (RoleAssignment + guards não-G-C.9)
  (C) Exportar tudo inclusive G-C.9 — REJECT (mistura)
Recommendation: A
Reason: Menor blast radius; G-C.9 já path-direct; barrel HEAD estável
Risk: B muda contrato público de testes que importam barrel
Default: A se Owner silente → ainda assim NÃO implementar sem CODE GO
Status: REQUIRED antes de CODE que toque index.ts
```

### OD-C-02 — Fatiamento C1/C2/C3

```text
Decision: Emitir CODE GO monolítico ou fatiado?
Options:
  (A) C1 then C2 then C3 — RECOMMENDED
  (B) C1+C2 sem routes; C3 depois
  (C) Monólito único
Recommendation: A
Reason: Isola RoleAssignment de blast radius de 14 rotas
Risk: C monólito = review impossível
Status: REQUIRED antes de CODE GO
```

### OD-C-03 — Reexport G-C.9 no barrel

```text
Decision: Pode o Pacote C reexportar guards G-C.9?
Options: (A) NÃO — RECOMMENDED  (B) SIM em commit separado docs-only reexport
Recommendation: A (NÃO)
Status: REQUIRED se OD-C-01 = B
```

### OD-C-04 — Relação CODE Pacote C × Migration 0064

```text
Decision: CODE C pode mergear sem 0064 aplicada no env?
Options:
  (A) CODE com flag OFF default + repo unconfigured — fail-closed — RECOMMENDED
  (B) Bloquear CODE até MIGRATION GO 0064 em todos os envs
Recommendation: A (código aditivo) + Migration GO separado explícito
Status: REQUIRED
```

### OD-C-05 — Dual-tree payments (`backend/server/modules/payments`)

```text
Decision: Incluir dual-tree no Pacote C?
Options:
  (A) EXCLUIR do C — gate payments próprio — RECOMMENDED
  (B) Incluir só guard em server/modules + defer backend/server
  (C) Incluir ambas árvores
Recommendation: A ou B
Status: REQUIRED
```

### OD-C-06 — `partners/routes/index.ts` dirty

```text
Decision: partners wiring é Pacote C, G-C.9 residual, ou OUT?
Options: (A) OUT / Partner gate  (B) C3  (C) UNRESOLVED deep-dive
Recommendation: C deep-dive read-only antes de CODE — default OUT até prova
Status: REQUIRED
```

---

## 16. Future CODE Scope Candidate

> **Não autorizado.** Somente após Owner Decisions + `CODE GO — PACOTE C` (ou fatia).

### Allowlist (candidato)

```text
# C1
server/modules/membership/role-assignment.repository.ts
server/modules/membership/role-assignment.adapter.ts
backend/src/__tests__/unit/role-assignment-repository.test.ts
backend/src/__tests__/unit/role-assignment-adapter.test.ts

# C2 (guards only)
server/modules/membership/{crm,guest-portal-admin,multi-property,revenue,
  payments,fornecedores-hub,cms,configuracoes,notifications,campanhas,
  passageiros,logistica,relatorios,orcamentos}.guard.ts
backend/src/__tests__/unit/*-guard.test.ts (matching)

# C3 — somente módulos com OD-C-02/05/06 APPROVED
server/modules/<domain>/routes/... (lista fechada por GO)

# Docs
.agents/shared/PACOTE_C_* (evidence)
```

### Denylist

```text
server/modules/membership/acomodacoes-*.guard.ts
server/modules/membership/anfitriao-*.guard.ts
server/modules/membership/tarifas-*.guard.ts
server/modules/membership/tarifas-*.scope.ts
server/modules/acomodacoes/**          # G-C.9 CLOSED
server/modules/propostas/**            # G-D CLOSED
server/modules/agentes/**              # G-D CLOSED
server/middleware/auth.middleware.ts   # staffAuth global
apps/**
backend/drizzle/**                     # Migration GO only
Reexport G-C.9 em index.ts             # OD-C-03 = NÃO
```

### Separate gates

```text
G-C StaffAuth / literals
G-E / E-13
WS body gates
S10
Payments dual-tree (se OD-C-05 = A)
0063 refund migration
0064 enterprise_users migration apply
```

### Shared-risk (exige OD ou GO dedicado)

```text
membership/index.ts
membership.{types,verdict,repository,plug}
role.context.ts / role.guards.ts / rbac.mapping.ts
multi-property enterprise context
backend/server/modules/payments/**
partners/routes
```

---

## 17. Allowlist (resumo executivo)

Ver §16 Allowlist — **C1 → C2 → C3** após ODs.

---

## 18. Denylist (resumo executivo)

Ver §16 Denylist — G-C.9, G-D, staffAuth global, apps, drizzle, barrel G-C.9 reexport.

---

## 19. Blockers

| ID | Tipo | Descrição | Bloqueia |
|---|---|---|---|
| B-C-01 | PROCESS | ODs C-01…C-06 não emitidas | CODE GO |
| B-C-02 | ARCH | WT `index.ts` propõe misturar C + G-C.9 exports | CODE sem OD-C-01/03 |
| B-C-03 | ARCH | Dual-tree payments | CODE payments sem OD-C-05 |
| B-C-04 | DATA | 0064 apply ≠ CODE | MIGRATION conflacionada |
| B-C-05 | SCOPE | partners/routes classificação | C3 partners |

**Nenhum BLOCKER impede RECONCILIATION PASS** — todos bloqueiam **CODE GO**, não a reconciliação.

---

## 20. PASS / BLOCKED Verdict

```text
RECONCILIATION PASS

Motivo:
- inventário classificado
- A/B/C separados (G-D e G-C.9 CLOSED preservados)
- membership/index.ts classificado como C-SHARED arquitetural
- RoleAssignment/M6 reconciliado sem segunda autoridade
- staffAuth fora do escopo
- migrations separadas
- testes mapeados
- shared files identificados
- Owner Decisions explicitadas
- future CODE allowlist/denylist propostas
- zero implementação nesta execução
```

---

## 21. Next Gate Recommendation

```text
1) Owner revisa este artefato
2) Decision Stage (docs):
     PACOTE_C_DECISION_STAGE.md
     PACOTE_C_OWNER_DECISION_REGISTER.md
     PACOTE_C_BLOCKERS_REGISTER.md
     PACOTE_C_OWNER_BALLOT_TEMPLATE.md
     PACOTE_C_STATUS_SNAPSHOT.md
3) Owner emite OD-C-01…06 (ballot)
4) Só então: CODE GO — PACOTE C — C1 (ou escopo literal)
5) MIGRATION GO 0064 = token separado (se apply necessário)
6) NÃO emitir CODE GO amplo “Pacote C inteiro” sem fatiamento
7) PUSH GO só após commits autorizados
```

```text
DECISION STAGE = ACTIVE (ver PACOTE_C_DECISION_STAGE.md)
CODE GO        = NOT EMITTED
MIGRATION GO   = NOT EMITTED
COMMIT         = NOT AUTHORIZED
PUSH           = NOT AUTHORIZED
STOP           = ACTIVE
```

---

*Fim da Master Pre-Implementation Reconciliation — Pacote C. Integridade > velocidade.*
