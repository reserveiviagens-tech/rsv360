# G-C.9b.4 — Economic Policy Read — Implementation Plan

**Status:** `PLAN_PASS`  
**CODE:** `NOT AUTHORIZED`  
**Alvo único:** `GET /politica-desconto`  
**9b.5 PUT:** `NOT OPENED`  
**Migration / DB / Staging / Prod / Commit / Push:** `NONE`

**Autoridade de decisão:** PA-W0…W6 · PA-DEC-001…011 · OD-9b4-A..C APPROVED · G-C.9b.1–9b.3 CLOSED · Master Re-Entry  

---

## 1. Objective

Definir o plano operacional para aplicar **Modelo D** à leitura econômica de política de desconto:

```text
Enterprise Context
  + Partner Authority (legado JWT + scoping OBRIGATÓRIO sob flag ON)
  + Economic Read (exposição de tetos — sem WRITE)
```

sem alterar `PUT /politica-desconto` (9b.5), sem contaminar `GET /simular` (9b.3), sem mapear Partner → Enterprise Role.

---

## 2. Current Route Reality (PROVEN)

**Arquivo:** `server/modules/acomodacoes/routes/tarifas.routes.ts`

```text
parceiroAuth = [
  authenticateJwt,
  requireRole('anfitriao', 'corretor', 'agente', 'promotor', 'admin', 'manager'),
]

GET /politica-desconto  →  ...parceiroAuth  →  handler
```

### Handler atual (L220–228)

| Item | Evidência |
|------|-----------|
| Middlewares | `authenticateJwt` → `requireRole(...)` apenas |
| `authFromReq` | **não** usado |
| `obterUnidade` | **não** chamado |
| `scope` | `req.query.scope` (cliente) → `String` ou `undefined` |
| `scopeId` | `req.query.scopeId` (cliente) → `String` ou `undefined` |
| Service call | `rateCalendarService.getPoliticaDesconto(scope, scopeId)` |
| Side effects | nenhum no handler |

### Contraste com superfícies irmãs

| Rota | Auth array | Scoping Partner no handler |
|------|------------|----------------------------|
| `GET /simular` | `simularAuth` (+ Enterprise guard 9b.3) | `obterUnidade` se não-staff |
| `GET /politica-desconto` | `parceiroAuth` (compartilhado, **sem** guard) | **ausente** |
| `PUT /politica-desconto` | `masterAuth` | `MASTER_ROLES` no service |

---

## 3. Current Authorization Reality (PROVEN)

### Service `getPoliticaDesconto` (`rate-calendar.service.ts:1006–1017`)

```text
1. SELECT * FROM politica_desconto_parceiro WHERE ativo = true
2. Se scope informado:
     filter scope === scope AND (scopeId null → !row.scopeId | else row.scopeId === scopeId)
3. Se scope AUSENTE:
     return ALL active rows   ← dump completo
```

| Check | Presente? |
|-------|-----------|
| Auth / `userId` | **Não** |
| Partner / carteira / owner | **Não** |
| Enterprise / tenant | **Não** |
| Validação de `scope` enum | **Não** (string livre) |
| Side effects / writes | **Não** (READ puro) |

### Schema `politica_desconto_parceiro` (`backend/src/db/schema/politica-desconto.ts`)

| Coluna | Nota |
|--------|------|
| `scope` | varchar — valores usados: `global` / `empreendimento` / `acomodacao` (WRITE tipa; READ não) |
| `scopeId` | varchar nullable — hotelId ou acomodacaoId como string |
| `maxDescontoPercentual` / `maxDescontoAbsoluto` | tetos econômicos |
| `rolesPermitidos` | jsonb (usado em `resolveTetoDesconto`, **não** filtrado em `getPoliticaDesconto`) |
| **`enterprise_id`** | **AUSENTE** |

Conclusão: o recurso **não tem enterprise identificável na linha**. Isolamento cross-enterprise **não** pode ser `row.enterpriseId === callerEnterpriseId`. Deve ser derivado via **binding de `scopeId` → recurso Partner-scoped** (+ Enterprise Context do caller).

### Economic usage correlato (não é este endpoint, mas prova sensibilidade)

`resolveTetoDesconto` (:299–332) aplica as mesmas policies no fluxo de desconto — ECONOMIC WRITE path. Expor tetos via GET sem scoping = **Economic READ sensível** (PA-W2: PROVEN).

---

## 4. Enterprise Boundary

| Pergunta | Resposta evidenciada |
|----------|----------------------|
| Como Enterprise Context é resolvido? | `req.authorizedEnterpriseContext` (WS-04 / D10), igual 9b.3 |
| Fonte de autoridade | Servidor / membership — **não** query/body/header |
| `membershipVerified` | Obrigatório `=== true` sob flag ON |
| Resource enterprise na policy? | **Não existe coluna** — mismatch enterprise↔row **não aplicável diretamente** |
| Cross-enterprise | Via Partner binding: `scopeId` deve referir recurso que o ator pode ver **dentro** do contexto Enterprise autenticado; spoof de `enterpriseId` no client **ignorado** |

**Proibido (PA-DEC-007/008):** `requireEnterpriseRole` isolado; mapear anfitriao/corretor/agente/promotor → viewer/manager.

---

## 5. Partner Authority

| Actor (JWT) | Partner scope (PA-W1 / DEC-001…004) | Materialização existente | Usado no GET atual? |
|-------------|--------------------------------------|--------------------------|---------------------|
| `anfitriao` | owner-scope | `proprietarioId === userId` / `obterUnidade` | **Não** |
| `corretor` | carteira-scope | `proprietariosNaCarteira` + own | **Não** |
| `agente` | = corretor | idem | **Não** |
| `promotor` | = corretor | idem | **Não** |
| `admin`/`manager` | staff bypass unidades | `STAFF_ROLES` | Só JWT gate |

### Inputs spoofáveis hoje

| Input | Origem | Confiança |
|-------|--------|-----------|
| `scope` | query | **Não confiável** — autoridade futura: validar enum + binding |
| `scopeId` | query | **Não confiável** — deve ser checado contra Partner Authority |
| `userId` / `enterpriseId` / `partnerId` query/body/header | client | **Nunca** autoridade |

`authFromReq` **não** participa do GET atual — deve passar a participar sob flag ON para binding Partner.

---

## 6. Economic Authority

| Camada | Neste gate |
|--------|------------|
| Partner Authority | JWT `parceiroAuth` + (futuro) scoping de `scopeId` |
| Enterprise Authority | Membership context (flag ON) |
| Economic Authority | **Não há role econômica dedicada.** A autoridade econômica de READ **reside hoje** apenas em: estar autenticado com role de `parceiroAuth` + exposição de tetos via `getPoliticaDesconto`. PA-DEC-006 exige **composição**, não inventar role nova. |

**Justificativa (sem inventar role):**

```text
Economic Read Authority (GET politica)
  = Partner JWT permitido
    + (flag ON) Enterprise Context verificado
    + (flag ON) scope/scopeId bound ao Partner scope
    + READ-only (zero write / zero MASTER_ROLES mutation)
```

WRITE econômico permanece `MASTER_ROLES` + `upsertPoliticaDesconto` → **9b.5**.

---

## 7. Scope / scopeId Model

| `scope` | `scopeId` | Significado no código | Binding Partner proposto (flag ON) |
|---------|-----------|----------------------|-------------------------------------|
| omitido | — | Retorna **todas** policies ativas | **Ver OD-9b4-A** (Owner) |
| `global` | null/ausente | Policy global de teto | **Ver OD-9b4-B** |
| `empreendimento` | hotelId string | Teto por hotel | Provar que ator tem autoridade sobre ≥1 unidade daquele hotel **ou** DENY — **OD-9b4-C** |
| `acomodacao` | acomodacaoId string | Teto por unidade | Reusar padrão `obterUnidade` / `podeGerenciarUnidade` (como `/simular`) |

`rolesPermitidos` na row **não** é aplicado em `getPoliticaDesconto` hoje. Plano 9b.4 **não** exige filtrar por `rolesPermitidos` salvo Owner decidir (fora do mínimo; documentar como não-alvo).

---

## 8. Cross-Enterprise Rules

| Cenário | Esperado sob flag ON |
|---------|----------------------|
| Membership enterprise A, tenta ler policy de `acomodacao` fora do seu Partner scope | **DENY 403** |
| Membership ausente / `membershipVerified=false` | **DENY 403** |
| `scopeId` adulterado (query) apontando unidade de outro owner/carteira | **DENY 403** (Partner check) |
| `enterpriseId` / `userId` / `partnerId` spoof em query/body/header | **Ignorados**; decisão só por context + auth JWT + binding |
| Repository / DB error no binding | **DENY 403** fail-closed |
| Flag OFF | Legacy bit-a-bit (inclui dump sem scoping — contrato real atual) |

Nota: sem `enterprise_id` na tabela, “policy B de enterprise B” só é distinguível se `scopeId` liga a recurso de outra família Partner/tenant. Isolamento = **não servir rows cujo scopeId o ator não pode provar**.

---

## 9. Flag OFF / ON Contract

### Flag OFF (`WS15_MEMBERSHIP_AUTHORITY` ≠ exact `'true'`)

- Guard complementar: `next()` imediato.
- Handler: **inalterado** semanticamente vs legado (query → `getPoliticaDesconto` sem binding).
- Preserva comportamento inseguro atual **de propósito** (igual 9b.1/9b.3: legacy bit-a-bit).

### Flag ON

```text
FAIL-CLOSED se:
  - Enterprise Context ausente / membershipVerified≠true / internalEnterpriseId inválido
  - Partner Authority inválida para o scopeId (quando scoping aplicável)
  - scope inválido / inconsistente com OD-9b4-*
  - erro de repositório / exceção
```

Economic WRITE **nunca** concedido por este gate.

---

## 10. Proposed Guard / Composition

### Design recomendado (espelha 9b.3 + scoping no handler)

**A — Middleware Enterprise (novo guard)**  
`createRequireTarifasPoliticaReadPartner` — **somente** Enterprise Context (sem `requireEnterpriseRole`), montado **apenas** em array dedicado `politicaReadAuth` (não alterar `parceiroAuth` compartilhado).

**B — Handler sob flag ON**  
Após auth:

1. Resolver `authFromReq(req)`.
2. Aplicar regras OD-9b4-A/B/C (scope obrigatório / global / empreendimento / acomodacao).
3. Para `acomodacao`: `obterUnidade` (ou equivalente) → 403/404.
4. Para `empreendimento`: validação Owner-decidida (OD-9b4-C).
5. Só então `getPoliticaDesconto(scope, scopeId)` — preferir **não** retornar dump completo.

**Por que não só guard:** Partner scoping de `scopeId` exige I/O de unidades/carteira (como `/simular`); manter no handler preserva simetria e evita acoplar anfitriao.service ao membership guard.

**Wiring:**

```text
const politicaReadAuth = [
  authenticateJwt,
  requireRole('anfitriao','corretor','agente','promotor','admin','manager'),
  requireTarifasPoliticaReadPartner,  // Enterprise Context only
];
router.get('/politica-desconto', ...politicaReadAuth, handler);

parceiroAuth  → permanece para qualquer outro uso legado; NÃO recebe o guard
simularAuth   → intocado (9b.3)
masterAuth    → intocado (9b.5 PUT)
```

---

## 11. Proposed Files (futuro CODE GO)

| Arquivo | Ação futura | Motivo |
|---------|-------------|--------|
| `server/modules/membership/tarifas-politica-read.guard.ts` | CRIAR | Enterprise Context complementar |
| `server/modules/membership/index.ts` | +1 export | barrel |
| `server/modules/acomodacoes/routes/tarifas.routes.ts` | `politicaReadAuth` + handler scoping flag ON | alvo único GET |
| `backend/src/__tests__/unit/tarifas-politica-read-guard.test.ts` | CRIAR | unit Enterprise + static isolation |
| `backend/src/__tests__/unit/tarifas-politica-read.handler.test.ts` (ou extensão) | CRIAR se handler scoping | Partner/economic binding |

Possível helper **somente se OD-9b4-C exigir** e não couber em `obterUnidade`: função read-only em anfitriao/rate-calendar — **novo arquivo só com GO explícito**; default = reusar APIs existentes.

---

## 12. Out of Scope

```text
PUT /politica-desconto                          → G-C.9b.5
GET /simular / simularAuth                      → G-C.9b.3 CLOSED
staffAuth / categorias / temporadas / regras    → G-C.9b.1
anfitriao.routes.ts                             → G-C.9c
MASTER_ROLES / upsertPoliticaDesconto           → 9b.5
aplicarDesconto / validarDesconto               → fora
migrations / schema enterprise_id na policy     → fora (sem migration)
RefundService / Ledger / Earnings / Payout      → fora
commit / push / staging / prod                  → fora
```

---

## 13. Test Plan (futuro CODE)

### Guard unitário

1. Flag OFF → `next()`  
2. Flag inválida → OFF  
3. Flag ON + context OK → `next()`  
4. Membership ausente → 403  
5. `membershipVerified=false` → 403  
6. `internalEnterpriseId` inválido → 403  
7. Spoof enterprise/user/partner identifiers → não autoriza  
8. Static: `parceiroAuth` sem guard 9b.4; PUT/`simular` isolados  
9. Static: sem `requireEnterpriseRole(` / sem financial imports  

### Handler / binding (após ODs)

10. Flag ON + `scope=acomodacao` + unidade no owner-scope → ALLOW  
11. Flag ON + `scope=acomodacao` + unidade fora da carteira → DENY  
12. Flag ON + `scopeId` adulterado → DENY  
13. Flag ON + sem scope (conforme OD-9b4-A) → DENY ou subset  
14. Flag ON + `scope=global` (conforme OD-9b4-B)  
15. Flag ON + `scope=empreendimento` (conforme OD-9b4-C)  
16. Staff admin/manager com membership → conforme ODs  
17. READ sucesso **não** altera WRITE / `MASTER_ROLES`  
18. Repository failure no binding → 403  

**Nota:** corretor/agente/promotor — testes separados **somente** se o binding diferenciar (hoje indistintos na carteira; um teste de carteira cobre os três).

---

## 14. Regression Plan

```text
Dedicado:  tarifas-politica-read*
Família:   tarifas-simular-guard + tarifas-staff-guard
           + acomodacoes-import/sync-guard
Baseline:  separar NEW vs BASELINE vs ENVIRONMENTAL vs OUT-OF-SCOPE
```

Não corrigir baseline pré-existente neste gate.

---

## 15. Security / Financial Safety

Implementação futura **deve** garantir:

- zero alteração de preço / policy rows / audit write neste gate  
- zero gateway / payout / ledger / earnings  
- zero concessão de WRITE  
- `MASTER_ROLES` e PUT intocados  
- flag OFF = legacy preservado  

---

## 16. Provenance

**PA-DEC-009 = RESOLVED (EOL noise).**  
Nenhuma evidência nova contradiz.  
`PROVENANCE = UNCHANGED / RESOLVED`

---

## 17. Acceptance Criteria (CODE futuro)

- Alvo único GET fechado  
- Enterprise Context definido (igual padrão 9b.3)  
- Partner Authority + scoping obrigatório sob flag ON (após ODs)  
- Economic Read justificado por composição (sem role inventada)  
- Cross-enterprise / spoof fail-closed  
- Flag OFF/ON contrato explícito  
- Arquivos delimitados; 9b.5 isolado  
- Testes mínimos verdes  

---

## 18. STOP Conditions

STOP sem CODE se:

- tentativa de alterar PUT / `MASTER_ROLES`  
- migration / `enterprise_id` na tabela sem GO  
- mapear Partner → Enterprise Role  
- acoplar guard em `parceiroAuth` compartilhado (vaza para outros usos)  
- abrir 9b.5 / 9c  
- Owner Decisions abaixo não respondidas antes do CODE GO  

---

## 19. Owner Decisions (DECIDIDAS PELO OWNER)

| ID | Decisão | Decisão Oficial do Owner | Status |
|----|---------|--------------------------|--------|
| **OD-9b4-A** | Flag ON + request **sem** `scope` | **DENY** (`scope ausente → DENY / FAIL-CLOSED`). Proibido assumir default, retornar todas as policies, inferir scope arbitrário ou transformar ausência em acesso global. | **APPROVED** |
| **OD-9b4-B** | Flag ON + `scope=global` | **somente staff Enterprise devidamente autorizado**. Partner roles (`anfitriao`, `corretor`, `agente`, `promotor`) NÃO recebem acesso automático à política `global`. `scope=global` na query não constitui autoridade. Leitura global depende de autoridade Enterprise válida + autorização econômica existente. Sem mapeamento Partner → Enterprise Role. | **APPROVED** |
| **OD-9b4-C** | Flag ON + `scope=empreendimento` | **ALLOW somente mediante binding Partner comprovado ao empreendimento solicitado**. `scopeId` de query/body/path NÃO é autoridade. Exige: Enterprise Context válido + Partner Authority válida + binding comprovado entre Partner e empreendimento + Economic Read Authority quando aplicável. Sem binding: DENY / FAIL-CLOSED. Rejeitar scopeId adulterado, enterprise incompatível, fora de owner-scope/carteira, membership não verificada ou erros. | **APPROVED** |

---

## 20. Regra Arquitetural Consolidada

A implementação **NÃO pode tratar**:
* `scope` ou `scopeId` fornecidos pelo cliente como fonte de autoridade.

A autoridade deve ser composta por contexto confiável:
```text
Enterprise Context
  + Partner Authority
  + binding real ao recurso
  + Economic Read Authority (quando aplicável)
```

Como `getPoliticaDesconto` atualmente lê todas as policies ativas e a tabela não possui `enterprise_id`, **NÃO criar um falso isolamento baseado somente em `scopeId`**.

---

## 21. Final Verdict

```text
PLAN STATUS: PLAN_PASS
CODE:        NOT AUTHORIZED
9b.5:        NOT OPENED
ARTIFACT:    .agents/shared/GC9B4_ECONOMIC_POLICY_READ_IMPLEMENTATION_PLAN.md
```

Próximo passo operacional: aguardar autorização explícita (`OWNER GO — G-C.9b.4`) antes de qualquer alteração de código.

**STOP.**
