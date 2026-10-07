# RSV360 — PACOTE C OWNER DECISION REGISTER  
## OD-C-01…06

**Base:** `PACOTE_C_MASTER_PRE_IMPLEMENTATION_RECONCILIATION.md`  
**Blockers cross-ref:** `PACOTE_C_BLOCKERS_REGISTER.md`  
**Stage:** `PACOTE_C_DECISION_STAGE.md`  
**Data de fechamento:** 2026-10-07  
**Remote HEAD:** `be14b977591bcdd86d038efcecb42512dc7e9d71`  
**Branch:** `feat/c36dd-refund-request-domain`  
**Owner:** RSV360 Owner (Master Plan confirmado = ballot)

| Campo | Valor |
|---|---|
| Register status | **CLOSED / OWNER DECIDED** |
| Reconciliação | **PASS** (pré-code) |
| CODE GO | **NOT AUTHORIZED** |
| MIGRATION GO | **NOT AUTHORIZED** |
| COMMIT GO | **NOT AUTHORIZED** |
| PUSH GO | **NOT AUTHORIZED** |

> Aprovar OD-C **≠** autorizar CODE / commit / push / migration.  
> C1 permanece bloqueado até token literal `CODE GO — PACOTE C — C1`.

---

## Ballot Owner (literal)

```text
PACOTE C — Owner Ballot

OD-C-01 — A
OD-C-02 — A
OD-C-03 — A
OD-C-04 — A
OD-C-05 — A
OD-C-06 — C

Owner Decision:
As seis Owner Decisions (OD-C-01…06) estão formalmente DECIDIDAS conforme as letras acima.
CODE GO / MIGRATION GO / COMMIT GO / PUSH GO = NÃO AUTORIZADOS por este ballot.
```

Fonte: Master Plan aprovado (Decision Stage / Auto-Exec documental) + confirmação Owner 2026-10-07.

---

## Sign-off fechado

| ID | Decision | Status | Owner | Impact |
|---|---|---|---|---|
| **OD-C-01** | **A** — não alterar `membership/index.ts` | **DECIDED** | Owner | Barrel HEAD estável; path imports |
| **OD-C-02** | **A** — fatiar C1 → C2 → C3 | **DECIDED** | Owner | CODE GO por fatia (futuro) |
| **OD-C-03** | **A** — NÃO reexportar G-C.9 no barrel | **DECIDED** | Owner | Onda 3 preservada |
| **OD-C-04** | **A** — CODE aditivo + MIGRATION GO 0064 separado | **DECIDED** | Owner | DATA ≠ CODE |
| **OD-C-05** | **A** — EXCLUIR dual-tree payments do Pacote C | **DECIDED** | Owner | Payments gate próprio |
| **OD-C-06** | **C** — deep-dive read-only partners primeiro | **DECIDED** | Owner | Ver `PACOTE_C_OD_C06_PARTNERS_DEEP_DIVE.md` |

---

## Detalhe das decisões

### OD-C-01 — A (DECIDED)
Não alterar `server/modules/membership/index.ts` no Pacote C. Path imports only.

### OD-C-02 — A (DECIDED)
Ordem normativa de CODE futuro: **C1 → C2 → C3**, cada uma com CODE GO próprio.

### OD-C-03 — A (DECIDED)
Proibido reexportar guards G-C.9 no barrel neste gate.

### OD-C-04 — A (DECIDED)
CODE aditivo/fail-closed. Apply `0064_enterprise_users` exige **MIGRATION GO** separado.

### OD-C-05 — A (DECIDED)
`backend/server/modules/payments/**` **fora** do Pacote C (denylist).

### OD-C-06 — C (DECIDED)
Deep-dive read-only obrigatório antes de classificar partners.  
Partners = **PROVISIONAL DENYLIST** até o dive.  
Desfecho: ver artefato OD-C-06 deep-dive (não autoriza CODE).

---

## Estado pós-register

```text
OD-C-01…06     = DECIDED (A/A/A/A/A/C)
REGISTER       = CLOSED
CODE GO        = NOT AUTHORIZED
MIGRATION GO   = NOT AUTHORIZED
COMMIT / PUSH  = NOT AUTHORIZED
C1             = BLOCKED
STOP           = ACTIVE

NEXT POSSIBLE TOKEN (não emitido):
  CODE GO — PACOTE C — C1
```

---

*Decision ≠ Execution. Ballot ≠ CODE GO.*
