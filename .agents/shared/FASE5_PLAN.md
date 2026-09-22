# FASE 5 — STATE/IMPACT AUDIT + SCOPE GATE

**Status:** `FASE5_PARTNERS_SPEC_COMPLETE` (trilha F selecionada; Spec pack entregue)  
**Agente:** Antigravity (Tech Lead)  
**Data:** 2026-09-22  
**Protocolo:** ACTIVE (`AUTONOMOUS_EXECUTION_PROTOCOL.md`)  
**Implementação Cursor:** **NÃO iniciada** — aguarda `SPEC_APPROVED` humano (HIGH)  
**Spec:** `.agents/shared/FASE5_PARTNERS_SPEC.md` · ADR: `ADR-FASE5-PARTNER-DOMAIN.md`

## Checkpoints

| Item | Estado |
|------|--------|
| Branch atual | `chore/fase4-node24-runtime` |
| HEAD / upstream | `c27c26a6c71ffb429666cd9bcd373a64ed10d13f` (==) |
| FASE 4 tip (runtime) | `4827c575` ancestral |
| FASE 0 | `c4222284` em `fix/auth-refresh-contract` — **paralela, NÃO em HEAD** |
| Working tree | limpo exceto 3 untracked protegidos |
| FASE 5 branch | **não criada** (correto até escopo) |

---

## 1. Objetivo canônico (`plano_rsv360.md`)

FASE 5 = **Hardening e negócio**, com **cinco trilhas distintas**:

| ID | Trilha | Risco típico |
|----|--------|--------------|
| **C5** | Auth — 5 cenários (login ±, refresh ±, GET /me) | **HIGH** |
| **D** | Leilões — CRUD + Zod + UI states + E2E | MEDIUM–HIGH |
| **E** | Marketplace — OpenAPI + Zod + BE/FE + `{data,pagination}` | **HIGH** |
| **F** | Partners/Affiliates — cadeia PARTNER→…→PAYOUT + distinções | **HIGH** |
| **G2** | Motion — `cubic-bezier` só onde contrato exige | LOW–MEDIUM |

**Problema de governança:** o plano canônico **não escolhe** qual trilha executar primeiro. Executar tudo de uma vez = scope creep + blast radius inaceitável.

---

## 2. Evidências por trilha (descoberta — sem inventar)

### C5 Auth — **partial** no HEAD; completo só com FASE 0

| Cenário | HEAD | Nota |
|---------|------|------|
| 1 Login válido | implemented | API v1 + E2E T1.9 |
| 2 Login inválido | partial | API 401; UI assert fraco |
| 3 Expira + refresh válido | **partial** | Backend OK; `api.ts` ainda `/api/core/refresh` no HEAD |
| 4 Expira + refresh inválido | **partial** | FASE 0 (`auth:expired`) **fora do HEAD** |
| 5 GET /me | partial | Canônico = `/api/v1/auth/session`; alias/legado misturado |

**Dependência crítica:** C5 cenários 3–4 exigem integração da FASE 0 (`c4222284`) ou reimplementação duplicada — **proibido** reabrir FASE 0 ad hoc. Orquestrador deve decidir: merge/PR FASE 0 **antes** de C5, ou adiar C5.

### D Leilões — **partial**
CRUD API + UI turismo parcial; falta Zod, página edit, E2E dashboard; site-publico stub.

### E Marketplace — **partial → missing API**
UI + SQL existem; **sem** `backend/src/api/v1/marketplace`; OpenAPI/Zod/`{data,pagination}` ausentes.

### F Partners — **partial → missing núcleo**
Partners stub; affiliates UI órfã de API; cadeia PARTNER→EARNING→PAYOUT **não unificada**.

### G2 Motion — **inventário só**
`cubic-bezier` em `design-tokens.ts`, `circular-nav.tsx`, `globals.css` — ajuste só com contrato de lib (não auditado ainda).

---

## 3. Arquitetura / inventário (contexto)

| Área | Estado |
|------|--------|
| Apps | admin, guest, site-publico, turismo (+ reservei OUT) |
| Backend | monorepo `backend/` + drizzle ~59 SQL |
| Shared | `packages/shared` |
| CI | `route-smoke`, `fase5-tests.yml` (proposta/taxa — **não** = FASE 5 plano C5–G2) |
| Runtime | Node 24 validado (FASE 4) |
| Auth | v1 routes login/refresh/session; clientes turismo divergentes |

---

## 4. Fora de escopo (até decisão)

- Qualquer implementação de produto  
- Merge/cherry-pick FASE 0 sem gate  
- Alterar `reservei`, untracked protegidos, `.env`  
- “Criar” marketplace/partners do zero sem Spec aprovada  
- FASE 6+  

---

## 5. Arquivos intocáveis agora

- FASE 0 branch / auth refresh (até decisão de integração)  
- Untracked: `Aruanda2.md`, `PROTOCOLO-*`, `test-compose.yml`  
- Enterprise rules / secrets  
- Dockerfiles/engines (FASE 4 CLOSED)  

---

## 6. Decisão Antigravity

```text
FASE5_SCOPE_DEFINITION_REQUIRED
```

**Motivo:** múltiplas trilhas HIGH/MEDIUM sem prioridade; C5 depende de FASE 0 paralela; E/F exigem Spec de domínio antes de código.

**Não** transferir para Cursor implementação.

### Informações que faltam (Orquestrador)

1. **Qual trilha é FASE 5.0?** (obrigatório escolher uma)  
   - Recomendação Tech Lead: **não** C5 até política de integração FASE 0;  
   - Alternativa LOW/MEDIUM: **G2 Motion** (menor blast) **ou** **D Leilões** fatia Zod+edit page (MEDIUM);  
   - E/F = HIGH + Spec prévia.  
2. **FASE 0:** integrar antes de C5? (PR/merge order) ou C5 adiado?  
3. **Critério de done** da fatia escolhida (testes mínimos aceitos).  

### Opções propostas (apenas seleção — sem inventar requisito novo)

| Opção | Conteúdo | Risco | Pré-requisito |
|-------|----------|-------|---------------|
| **A** | C5 Auth (5 cenários) | HIGH | Decisão FASE 0 |
| **B** | D Leilões: Zod + página edit + E2E mínimo | MEDIUM | nenhum merge FASE 0 |
| **C** | E Marketplace: Spec OpenAPI+API canônica (só Spec primeiro) | HIGH | Spec VALIDATED |
| **D** | F Partners: Spec cadeia PARTNER→PAYOUT | HIGH | Spec VALIDATED |
| **E** | G2 Motion audit+ajuste mínimo | LOW–MEDIUM | contrato lib documentado |

---

## 7. C1/C2/C3 / commit (quando houver fatia)

| Gate | Regra |
|------|-------|
| C1–C3 | Conforme protocolo + `COMMIT_MANIFEST` da fatia |
| LOW/MEDIUM | auto se dual PASS |
| HIGH (C5/E/F) | **STOP humano** para commit/push |

---

## 8. STOP

```text
STATUS: FASE5_SCOPE_DEFINITION_REQUIRED
CURSOR: idle (sem implementação)
PRÓXIMO: Orquestrador escolhe opção A–E (ou equivalente explícito)
```
