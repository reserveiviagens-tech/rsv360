# RSV360 — PACOTE C MASTER IMPLEMENTATION PLAN

| Campo | Valor |
|---|---|
| Status | **PLAN_PASS / PLAN_READY** |
| CODE C1 | **REMOTE CLOSED** (`7ae07c76`) |
| CODE C2 | **REMOTE CLOSED** (`745040a7`) |
| CODE C3 | **GO RECEIVED — VALIDATED** (waiting COMMIT GO) |
| MIGRATION / COMMIT / PUSH | **NOT AUTHORIZED** |
| Ballot | OD-C-01…06 = **A/A/A/A/A/C** DECIDED |
| Remote HEAD | `be14b977` |
| Data | 2026-10-07 |

**Bases:**  
`PACOTE_C_MASTER_PRE_IMPLEMENTATION_RECONCILIATION.md` ·  
`PACOTE_C_OWNER_DECISION_REGISTER.md` ·  
`PACOTE_C_OD_C06_PARTNERS_DEEP_DIVE.md`

---

## 1. Decisões travadas

| OD | Decisão |
|---|---|
| OD-C-01 | **A** — não alterar `membership/index.ts` |
| OD-C-02 | **A** — C1 → C2 → C3 |
| OD-C-03 | **A** — sem reexport G-C.9 |
| OD-C-04 | **A** — CODE aditivo; 0064 = MIGRATION GO separado |
| OD-C-05 | **A** — dual-tree payments FORA |
| OD-C-06 | **C** → dive → partners **OUT** (denylist definitiva) |

Blockers B-C-01…05 = **CLEARED**.  
Clear ≠ CODE GO.

---

## 2. Ordem normativa

```text
C1  RoleAssignment surface     ← REMOTE CLOSED (7ae07c76)
C2  Domain guards (não-G-C.9)  ← REMOTE CLOSED (745040a7)
C3  Consumer route wiring      ← CODE GO DONE — WAITING COMMIT GO — PACOTE C — C3
```

Cada fatia exige token literal próprio. Sem monólito.

---

## 3. Allowlist C1 (CODE GO validado — ver `PACOTE_C_C1_IMPLEMENTATION_RESULT.md`)

**Somente estes 4 paths:**

```text
server/modules/membership/role-assignment.repository.ts
server/modules/membership/role-assignment.adapter.ts
backend/src/__tests__/unit/role-assignment-repository.test.ts
backend/src/__tests__/unit/role-assignment-adapter.test.ts
```

**Explicitamente fora de C1:**

```text
membership/index.ts
qualquer outro membership/*.guard.ts
server/modules/partners/**
backend/server/modules/payments/**
backend/drizzle/**
apps/**
G-C.9 / G-D paths
```

---

## 4. Denylist global (Pacote C)

```text
# Ondas fechadas
server/modules/membership/acomodacoes-*.guard.ts
server/modules/membership/anfitriao-*.guard.ts
server/modules/membership/tarifas-*.{guard,scope}.ts
server/modules/acomodacoes/**
server/modules/propostas/**
server/modules/agentes/**

# Barrel / staffAuth
server/modules/membership/index.ts          # OD-C-01 = A
server/middleware/auth.middleware.ts        # staffAuth global — G-C futuro

# OD-C-05 / OD-C-06
backend/server/modules/payments/**
server/modules/partners/**                  # OUT definitiva (deep-dive)

# DATA / UI
backend/drizzle/**
apps/**
```

---

## 5. Allowlist C2 / C3

### C2 (CODE GO validado — ver `PACOTE_C_C2_IMPLEMENTATION_RESULT.md`)

Guards: crm, guest-portal-admin, multi-property, revenue, payments (**somente** `server/modules/membership/payments.guard.ts`), fornecedores-hub, cms, configuracoes, notifications, campanhas, passageiros, logistica, relatorios, orcamentos + testes `*-guard.test.ts` correspondentes. **167 PASS.**

### C3 (CODE GO validado — ver `PACOTE_C_C3_IMPLEMENTATION_RESULT.md`)

13 rotas com wiring C2. **Exceto:** partners, `backend/server/modules/payments/**`, `notifications/{routes,management-routes}.js` (C36-ID-05 property-scope — gate separado).

---

## 6. Tokens futuros (não automáticos)

| Token | Efeito |
|---|---|
| `CODE GO — PACOTE C — C1` | Implementar/commitar allowlist C1 apenas após GO + COMMIT GO se separado |
| `CODE GO — PACOTE C — C2` | Guards C2 |
| `CODE GO — PACOTE C — C3` | Routes C3 |
| `MIGRATION GO — 0064` | Apply `enterprise_users` (OD-C-04) |
| `COMMIT GO — …` | Commit da fatia |
| `PUSH GO — …` | Push |

---

## 7. Critérios PASS por fatia (quando CODE GO existir)

```text
allowlist only (git diff audit)
dedicated tests PASS
family regression NEW FAILURES = 0
G-C.9 / G-D untouched
membership/index.ts untouched
drizzle not staged
partners / dual-tree payments not staged
```

---

## 8. Cadeia de autoridade (não reimplementar)

```text
enterprise_users → RoleAssignment Repository → MembershipRecord
  → CanonicalRoleContext → requireEnterpriseRole → domain guards (flag ON)
```

Fail-closed preservado. Sem segunda autoridade. Body/query/header ≠ authority.

---

## 9. Estado

```text
PLAN_PASS / PLAN_READY
C1           = REMOTE CLOSED
C2           = REMOTE CLOSED
CODE GO C3   = EXECUTED (13 routes validated)
C3           = READY FOR COMMIT GO
MIGRATION GO = NOT AUTHORIZED
COMMIT/PUSH  = NOT AUTHORIZED
STOP         = ACTIVE

NEXT TOKEN POSSÍVEL (Owner):
  COMMIT GO — PACOTE C — C3
```

---

*PLAN_PASS ≠ CODE GO. Integridade > velocidade.*
