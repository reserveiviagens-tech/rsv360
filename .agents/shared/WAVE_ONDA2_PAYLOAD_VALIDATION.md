# RSV360 — ONDA 2 PAYLOAD VALIDATION  
## Pacote A / G-D (código + testes)

**Autorização:** Owner — `COMMIT GO — ONDA 2` (sessão 2026-10-07)  
**Pré-condição:** Onda 1 = `7fad5ffc`  
**Não autoriza:** PUSH · rebase · merge · MIGRATION · Onda 3 · CODE novo  
**HEAD baseline pré-commit:** `7fad5ffc`

---

## 0. Veredito

```text
ONDA 2 PAYLOAD     = DELIMITADO + VALIDADO
SEPARATION A/B/C   = PASS
COMMIT GO — ONDA 2 = AUTHORIZED → executing this commit
PUSH               = NOT AUTHORIZED (OD-WAVE-03 = C)
```

---

## 1. Allowlist (20 paths)

Mensagem: `feat(propostas): G-D authority wave (D.0–D.10)`

### 1.1 Código G-D (8)

| Path | Status | Nota |
|---|---|---|
| `server/modules/propostas/rbac.ts` | M | substancial (`diff -w`) |
| `server/modules/propostas/proposta-access.ts` | M | substancial |
| `server/modules/propostas/mgm.ts` | M | substancial |
| `server/modules/propostas/routes/index.ts` | M | substancial |
| `server/modules/propostas/economic-authority.ts` | ?? | novo |
| `server/modules/agentes/instrutor/papel.ts` | M | substancial |
| `server/modules/agentes/routes/index.ts` | M | substancial |
| `server/modules/cotacao-publica/routes/index.ts` | M | G-D.9 markers (`diff -w`: +5/−2); CRLF noise coexiste |

### 1.2 Testes dedicados gd* (8)

| Path | Status |
|---|---|
| `backend/src/__tests__/unit/gd0-foundation-contract.test.ts` | ?? |
| `backend/src/__tests__/unit/gd1-matriz-http-contract.test.ts` | ?? |
| `backend/src/__tests__/unit/gd2-rank-adapter-formal.test.ts` | ?? |
| `backend/src/__tests__/unit/gd3-proposta-access-staff-contract.test.ts` | ?? |
| `backend/src/__tests__/unit/gd6-economic-authority-contract.test.ts` | ?? |
| `backend/src/__tests__/unit/gd8-agentes-auth-contract.test.ts` | ?? |
| `backend/src/__tests__/unit/gd9-cotacao-propostas-boundary.test.ts` | ?? |
| `backend/src/__tests__/unit/gd10-mgm-indicador-binding.test.ts` | ?? |

### 1.3 Testes família G-D dirty (4)

| Path | Status | Nota |
|---|---|---|
| `backend/src/__tests__/unit/mgm.test.ts` | M | `diff -w` substancial |
| `backend/src/__tests__/unit/agentes-routes.test.ts` | M | substancial |
| `backend/src/__tests__/unit/agentes-instrutor-routes.test.ts` | M | substancial |
| `backend/src/__tests__/unit/agentes-instrutor-triagem.test.ts` | M | substancial |

### 1.4 Evidência operacional (1)

| Path | Status |
|---|---|
| `.agents/shared/WAVE_ONDA2_PAYLOAD_VALIDATION.md` | este arquivo |

**TOTAL = 21 paths**

---

## 2. Exclusões (contaminação / Pacote C)

| Path | Motivo |
|---|---|
| `server/modules/cotacao-publica/schemas/gerar-proposta.schema.ts` | `diff -w` = vazio (só whitespace/CRLF) |
| `server/modules/cotacao-publica/services/montar-roteiro.ts` | `diff -w` = vazio (só whitespace/CRLF) |
| `server/modules/membership/**` | Pacote B → Onda 3 |
| `apps/**` / `backend/drizzle/**` | Pacote C / Migration |

---

## 3. Relatório

```text
COMMIT GO — ONDA 2 = EXECUTING
PUSH / ONDA 3 / MIGRATION / CODE = NOT AUTHORIZED
STOP after local commit
```
