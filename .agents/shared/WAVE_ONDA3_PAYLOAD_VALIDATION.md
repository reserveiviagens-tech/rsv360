# RSV360 — ONDA 3 PAYLOAD VALIDATION  
## Pacote B / G-C.9 (acomodações · tarifas · anfitrião)

**Autorização:** Owner — `COMMIT GO — ONDA 3 (Pacote B / G-C.9)`  
**Pré-condição:** Onda 2 = `b1e0c350`  
**Não autoriza:** PUSH · rebase · merge · MIGRATION · Pacote C · CODE novo  
**HEAD baseline pré-commit:** `b1e0c350`

---

## 0. Veredito

```text
ONDA 3 PAYLOAD     = DELIMITADO + VALIDADO
SEPARATION A/B/C   = PASS
COMMIT GO — ONDA 3 = AUTHORIZED → executing this commit
PUSH               = NOT AUTHORIZED (OD-WAVE-03 = C)
```

---

## 1. Allowlist (30 paths)

Mensagem: `feat(acomodacoes): G-C.9 membership authority`

### 1.1 Routes / services (7)

| Path | Nota |
|---|---|
| `server/modules/acomodacoes/routes/anfitriao.routes.ts` | `diff -w` substancial |
| `server/modules/acomodacoes/routes/import.routes.ts` | substancial |
| `server/modules/acomodacoes/routes/index.ts` | substancial |
| `server/modules/acomodacoes/routes/sync.routes.ts` | substancial |
| `server/modules/acomodacoes/routes/tarifas.routes.ts` | substancial |
| `server/modules/acomodacoes/services/anfitriao.service.ts` | substancial |
| `server/modules/acomodacoes/services/rate-calendar.service.ts` | substancial |

### 1.2 Membership guards G-C.9 (12)

| Path |
|---|
| `server/modules/membership/acomodacoes-import.guard.ts` |
| `server/modules/membership/acomodacoes-index.guard.ts` |
| `server/modules/membership/acomodacoes-sync.guard.ts` |
| `server/modules/membership/anfitriao-read.guard.ts` |
| `server/modules/membership/anfitriao-staff.guard.ts` |
| `server/modules/membership/anfitriao-write.guard.ts` |
| `server/modules/membership/tarifas-politica-read.guard.ts` |
| `server/modules/membership/tarifas-politica-read.scope.ts` |
| `server/modules/membership/tarifas-politica-write.guard.ts` |
| `server/modules/membership/tarifas-politica-write.scope.ts` |
| `server/modules/membership/tarifas-simular.guard.ts` |
| `server/modules/membership/tarifas-staff.guard.ts` |

### 1.3 Testes (10)

| Path |
|---|
| `backend/src/__tests__/unit/acomodacoes-import-guard.test.ts` |
| `backend/src/__tests__/unit/acomodacoes-index-guard.test.ts` |
| `backend/src/__tests__/unit/acomodacoes-sync-guard.test.ts` |
| `backend/src/__tests__/unit/anfitriao-read-guard.test.ts` |
| `backend/src/__tests__/unit/anfitriao-staff-guard.test.ts` |
| `backend/src/__tests__/unit/anfitriao-write-guard.test.ts` |
| `backend/src/__tests__/unit/tarifas-politica-read.test.ts` |
| `backend/src/__tests__/unit/tarifas-politica-write.test.ts` |
| `backend/src/__tests__/unit/tarifas-simular-guard.test.ts` |
| `backend/src/__tests__/unit/tarifas-staff-guard.test.ts` |

### 1.4 Evidência (1)

| Path |
|---|
| `.agents/shared/WAVE_ONDA3_PAYLOAD_VALIDATION.md` |

---

## 2. Exclusões deliberadas

| Path / classe | Motivo |
|---|---|
| `server/modules/membership/index.ts` | Exports misturam Pacote C (crm/payments/role-assignment/…); routes importam guards por path direto |
| `desempenho.service.ts`, `disponibilidade-reserva.hook.ts`, `listing-*.util.ts` | `diff -w` vazio (CRLF only) |
| `anfitriao-403/coanfitrioes/impostos-export.routes.test.ts` | `diff -w` vazio (CRLF only) |
| `membership/{crm,payments,campanhas,…}.guard.ts` + role-assignment | Pacote C |
| `apps/**` / `backend/drizzle/**` | Pacote C / Migration |

---

## 3. Relatório

```text
COMMIT GO — ONDA 3 = EXECUTING
PUSH / Pacote C / MIGRATION / CODE = NOT AUTHORIZED
STOP after local commit
```
