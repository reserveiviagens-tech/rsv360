# G-C.9b.5 — Economic Policy Write — Implementation Plan

**Status:** `PLAN_PASS`  
**CODE:** `AUTHORIZED` via `OWNER GO — G-C.9b.5 — IMPLEMENT` (após PLAN_PASS + OD-9b5-A/B/C)  
**Alvo único:** `PUT /politica-desconto`  
**GET /politica-desconto:** `G-C.9b.4 — PASS / CLOSED — NÃO ALTERAR`  
**GET /simular:** `G-C.9b.3 — PASS / CLOSED — NÃO ALTERAR`  
**G-C.9c:** `BLOCKED / NOT OPENED`  
**Migration / DB / Staging / Prod / Commit / Push:** `NONE`

**Autoridade de decisão:** PA-W0…W6 · PA-DEC-001…011 · OD-9b5-A..C APPROVED · G-C.9b.1–9b.4 CLOSED · Master Re-Entry  

**Governance note (CONDITION-01):** Este artefato é a **restauração/persistência em disco** do plano oficial consolidado que estava em `PLAN_PASS` quando o OWNER GO de implementação foi concedido. **Sem replanejamento**, sem nova discovery e sem alteração de decisões. Conteúdo alinhado às ODs e ao GO formalmente registrados na esteira.

---

## 1. Objective

Aplicar **Modelo D** à escrita econômica de política de desconto:

```text
Enterprise Context
  + Economic Write Authority (MASTER_ROLES + binding de escopo)
  + Atomicidade Flag ON (upsert + audit na mesma db.transaction)
```

sem alterar `GET /politica-desconto` (9b.4), sem contaminar `GET /simular` (9b.3), sem mapear Partner → Enterprise Role, sem migration/schema.

---

## 2. Current Route Reality (PROVEN — pré-CODE)

**Arquivo:** `server/modules/acomodacoes/routes/tarifas.routes.ts`

```text
masterAuth = [
  authenticateJwt,
  requireRole('anfitriao', 'admin', 'manager'),
]

PUT /politica-desconto  →  ...masterAuth  →  upsertPoliticaDesconto(auth, body)
```

| Item | Evidência pré-CODE |
|------|--------------------|
| Middlewares | JWT + MASTER roles apenas |
| Enterprise Context | **ausente** |
| Binding de escopo | **ausente** no handler (service checa só `MASTER_ROLES`) |
| Atomicidade upsert+audit | **não** transacional (duas operações sequenciais em `db`) |
| GET / politicaReadAuth | irmão 9b.4 — isolado |
| /simular / simularAuth | irmão 9b.3 — isolado |

---

## 3. Current Authorization Reality (PROVEN — pré-CODE)

### Service `upsertPoliticaDesconto`

```text
1. MASTER_ROLES.has(auth.role) senão forbidden
2. Validar maxDescontoPercentual em [0, 100]
3. SELECT existing by scope (+ scopeId IS NULL | = scopeId)
4. UPDATE ou INSERT politica_desconto_parceiro
5. INSERT politica_desconto_audit (fora de transaction)
```

| Check | Presente? |
|-------|-----------|
| Auth role MASTER | **Sim** |
| Enterprise Context | **Não** |
| Binding anfitriao↔acomodacao ownership | **Não** |
| Binding staff↔empreendimento/acomodacao | **Não** |
| Atomic upsert+audit | **Não** |

### Schema

Tabela `politica_desconto_parceiro` **sem** `enterprise_id`. Isolamento cross-enterprise deriva de Enterprise Context do caller + binding de `scopeId` a recurso server-side — **não** de coluna tenant na policy.

---

## 4. Enterprise Boundary

| Pergunta | Resposta |
|----------|----------|
| Como Enterprise Context é resolvido? | `req.authorizedEnterpriseContext` (WS-04 / D10), igual 9b.3/9b.4 |
| Fonte de autoridade | Servidor / membership — **não** query/body/header |
| `membershipVerified` | Obrigatório `=== true` sob flag ON |
| Spoof `enterpriseId` / `userId` / `partnerId` | **Ignorados** como autoridade |
| Cross-enterprise | Fail-closed via context + binding de recurso |

**Proibido (PA-DEC-007/008):** `requireEnterpriseRole` isolado; mapear anfitriao/corretor/agente/promotor → roles Enterprise.

---

## 5. Economic Write Authority (Modelo D)

```text
Economic Write Authority (PUT politica)
  = JWT MASTER_ROLES (admin | manager | anfitriao)
    + (flag ON) Enterprise Context verificado
    + (flag ON) binding econômico de scope/scopeId (OD-9b5-*)
    + (flag ON) upsert + audit atomicamente transacional
```

| Actor (JWT) | Flag ON — Write |
|-------------|-----------------|
| `corretor` / `agente` / `promotor` | **DENY** (não-MASTER) |
| `admin` / `manager` | ALLOW com Enterprise Context + binding econômico por scope |
| `anfitriao` + `global` | **DENY absoluto** (OD-9b5-A) |
| `anfitriao` + `empreendimento` | **DENY** (OD-9b5-B) |
| `anfitriao` + `acomodacao` própria | **ALLOW** só se `proprietarioId === auth.userId` (OD-9b5-C) |
| `anfitriao` + `acomodacao` de terceiro | **DENY** |

**Ownership write ≠ cohost read:** para anfitrião, provar ownership via lookup server-side de `proprietarioId` — **não** reutilizar `obterUnidade`/`podeVerUnidade` (que podem incluir cohost).

Staff (`admin`/`manager`) nos scopes:

| scope | Binding |
|-------|---------|
| `global` | ALLOW (staff + Enterprise Context) |
| `empreendimento` | `hasEmpreendimentoAccess` / equivalente server-side |
| `acomodacao` | unidade existe + staff pode ver (`obterUnidade`) |

---

## 6. Flag OFF / ON Contract

### Flag OFF (`WS15_MEMBERSHIP_AUTHORITY` ≠ exact `'true'`)

- Guard complementar: `next()` imediato.
- Handler: **legado bit-a-bit** — sem authorize de escopo novo, sem `{ atomic: true }`.
- `upsertPoliticaDesconto` sem opção atomic → caminho **não** transacional (semântica pré-existente).
- **Proibido** introduzir transaction ou mudança silenciosa de semântica no OFF.

### Flag ON

```text
FAIL-CLOSED se:
  - Enterprise Context ausente / membershipVerified≠true / internalEnterpriseId inválido
  - role não-MASTER
  - OD-9b5-* DENY
  - recurso inexistente / binding falha / erro de repositório
```

Atomicidade **obrigatória** no ON:

```text
db.transaction:
  upsert politica_desconto_parceiro
  + insert politica_desconto_audit
```

Falha da auditoria **deve** reverter o upsert.

### Gatekeeper STOP (não adaptar sozinho)

Se a implementação descobrir que `db.transaction` **não** pode ser aplicado ao caminho ON **sem** alterar inadvertidamente o comportamento OFF → **STOP imediato** e retorno para decisão do Owner. Não adaptar por conta própria.

---

## 7. Proposed Guard / Composition

### A — Middleware Enterprise (novo guard)

`createRequireTarifasPoliticaWritePartner` — **somente** Enterprise Context (sem `requireEnterpriseRole`), montado **apenas** em array dedicado de WRITE.

### B — Scope binding (novo módulo)

`authorizePoliticaDescontoWrite(auth, scope, scopeId, ports)` — OD-9b5-A/B/C + staff binding. Ports:

- `obterUnidade` — staff path
- `getUnitOwner` — anfitrião ownership-only
- `hasEmpreendimentoAccess` — staff empreendimento

### C — Wiring

```text
const masterAuth = [authenticateJwt, requireRole('anfitriao','admin','manager')];
// composição mínima: NÃO mutar masterAuth in-place com guard se isso vazar;
// preferir array dedicado:
const politicaWriteAuth = [...masterAuth, requireTarifasPoliticaWritePartner];

router.put('/politica-desconto', ...politicaWriteAuth, handler);

parceiroAuth / simularAuth / politicaReadAuth / staffAuth → INTOCADOS
GET /politica-desconto → INTOCADO
GET /simular → INTOCADO
```

Handler sob flag ON: authorize → `upsertPoliticaDesconto(..., { atomic: true })`.  
Handler sob flag OFF: `upsertPoliticaDesconto(...)` sem options (legado).

---

## 8. Proposed Files (CODE frontier)

| Arquivo | Ação | Motivo |
|---------|------|--------|
| `server/modules/membership/tarifas-politica-write.guard.ts` | CRIAR | Enterprise Context complementar |
| `server/modules/membership/tarifas-politica-write.scope.ts` | CRIAR | OD-9b5-A/B/C + binding |
| `server/modules/membership/index.ts` | +exports | barrel |
| `server/modules/acomodacoes/routes/tarifas.routes.ts` | `politicaWriteAuth` + handler flag ON | alvo único PUT |
| `server/modules/acomodacoes/services/rate-calendar.service.ts` | `getUnitOwner` + `options.atomic` | ownership + atomic ON-only |
| `backend/src/__tests__/unit/tarifas-politica-write.test.ts` | CRIAR | suíte dedicada |

**Qualquer necessidade de sair dessa fronteira = STOP e solicitar decisão.**

Não inventar `clientIp`, `correlationId` ou infraestrutura inexistente.

---

## 9. Out of Scope

```text
GET /politica-desconto                         → G-C.9b.4 CLOSED
GET /simular / simularAuth                     → G-C.9b.3 CLOSED
staffAuth / categorias / temporadas / regras   → G-C.9b.1 CLOSED
anfitriao.routes.ts                            → G-C.9c BLOCKED
parceiroAuth compartilhado                     → não alterar
migrations / schema / enterprise_id na policy  → fora
RefundService / Ledger / Earnings / Payout     → fora
staging / prod / commit / push                 → fora
limpeza de typecheck pré-existente fora do gate→ fora
```

---

## 10. Test Plan (mínimo)

### Guard

1. Flag OFF → `next()` (legado)  
2. Flag inválida → OFF  
3. Flag ON + context OK → `next()`  
4. Membership ausente → 403  
5. `membershipVerified !== true` → 403  
6. Cross-enterprise / `internalEnterpriseId` inválido → 403  
7. Anti-spoofing body/query/header → não autoriza  
8. Static: PUT usa write auth; GET/simular/parceiroAuth isolados; `masterAuth` base sem guard embutido  

### Scope (OD-9b5-*)

9. non-MASTER (corretor/agente/promotor) → DENY  
10. anfitriao + global → DENY absoluto (OD-A)  
11. anfitriao + empreendimento → DENY (OD-B)  
12. anfitriao + acomodacao própria → ALLOW (OD-C)  
13. anfitriao + acomodacao terceiro → DENY  
14. admin/manager nos três scopes (com/sem binding)  
15. recurso inexistente → 404  
16. limites 0–100 preservados no service  

### Atomicidade

17. Static: `db.transaction` **somente** se `options.atomic === true`  
18. Static: handler passa `{ atomic: true }` **somente** sob flag ON  
19. Contrato: falha de audit propaga e implica rollback na tx  

### Regressão

```text
Dedicado:  tarifas-politica-write
Família:   tarifas-staff-guard + tarifas-simular-guard + tarifas-politica-read
Typecheck: 0 erros novos nos arquivos do gate (baseline pré-existente fora = não limpar neste gate)
```

---

## 11. Security / Financial Safety

- zero gateway / payout / ledger / earnings / refund  
- query/body/header **nunca** autoridade para `enterpriseId` / `userId`  
- ownership anfitrião **não** via spoof de `proprietarioId` no body  
- flag OFF = legado preservado  
- flag ON = fail-closed + atomic  

---

## 12. Owner Decisions (DECIDIDAS PELO OWNER)

| ID | Decisão | Decisão Oficial do Owner | Status |
|----|---------|--------------------------|--------|
| **OD-9b5-A** | `anfitriao` + `scope=global` | **DENY ABSOLUTO**. Anfitrião nunca escreve política global. | **APPROVED** |
| **OD-9b5-B** | `anfitriao` + `scope=empreendimento` | **DENY**. Anfitrião não escreve política de empreendimento. | **APPROVED** |
| **OD-9b5-C** | `anfitriao` + `scope=acomodacao` | **ALLOW somente** com comprovação server-side `proprietarioId === auth.userId`. Acomodação de terceiro → DENY. **CONSTRAINT:** regra efetiva sob **Flag ON** (com Enterprise Context + fail-closed). Flag OFF permanece legado bit-a-bit. | **APPROVED WITH FLAG-ON CONSTRAINT** |

---

## 13. Regra Arquitetural Consolidada

```text
Enterprise Context
  + MASTER JWT (admin | manager | anfitriao)
  + binding econômico real ao recurso
  + (Flag ON) atomic upsert + audit
```

Cliente **não** é autoridade.  
`scope` / `scopeId` / `enterpriseId` / `userId` em query/body/header **não** concedem WRITE.

---

## 14. Acceptance Criteria

- Alvo único PUT fechado na fronteira de arquivos  
- OD-9b5-A/B/C respeitadas  
- Flag OFF bit-a-bit; Flag ON fail-closed + atomic  
- GET / simular / 9c intocados funcionalmente  
- Sem migration / DB apply / staging / prod / commit / push  
- Testes dedicados + família + typecheck aplicável (sem limpar baseline alheio)  
- STOP sem abrir G-C.9c automaticamente  

---

## 15. STOP Conditions

STOP sem CODE / durante CODE se:

- tentativa de alterar GET / `/simular` / 9c  
- mutation de `parceiroAuth` compartilhado  
- transaction no OFF ou semântica OFF alterada para caber no ON  
- migration / schema  
- inventar infra (`clientIp`, `correlationId`, etc.)  
- sair da fronteira de arquivos sem decisão  
- mapear Partner → Enterprise Role  

---

## 16. Final Verdict

```text
PLAN STATUS: PLAN_PASS
OD-9b5-A:    APPROVED — DENY ABSOLUTO
OD-9b5-B:    APPROVED — DENY
OD-9b5-C:    APPROVED WITH FLAG-ON CONSTRAINT
ARTIFACT:    .agents/shared/GC9B5_ECONOMIC_POLICY_WRITE_IMPLEMENTATION_PLAN.md
9c:          BLOCKED / NOT OPENED
```

**CONDITION-01 (governança):** artefato persistido para proveniência. Fechamento formal `PASS / CLOSED` do gate permanece decisão do Gatekeeper após validação deste arquivo.

**STOP** — sem CODE adicional, sem G-C.9c.
