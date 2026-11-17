# C36 — Next 30 Gates Plan (DC → EF)

**Date:** 2026-09-28  
**Status:** `PLAN RATIFIED / AWAITING GO PER GATE`  
**Departure:** C36-CZ/DA/DB = PASS · HEAD `95cccf10` · PR #420

## Critical resequence (owner)

```text
C36-DC ≠ payout eligibility
C36-DC = Refund Authorization Audit (first)
```

Macro order:

```text
FASE 1  Refund governance     DC → DQ
FASE 2  Controlled refund UX  (DK–DQ continue closure)
FASE 3  Payout eligibility    DR → DZ
FASE 4  Controlled payout     EA → EE
FASE 5  Financial forensic    EF
```

## Barriers (all gates)

```text
REAL_PAYOUT = BLOCKED
REAL_GATEWAY = BLOCKED
PRODUCTION = BLOCKED
0059 = IMMUTABLE
FORCE_PUSH = BLOCKED
CI_BYPASS = BLOCKED
```

**PASS ≠ next macrostage GO.** Each financial macrostage needs its own explicit GO.

## Separation of concepts

```text
REQUESTED ≠ AUTHORIZED ≠ EXECUTED ≠ REVERSED
ELIGIBLE  ≠ APPROVED   ≠ RESERVED ≠ PAID/EXECUTED
```

## Gate catalog

### FASE 1 — Refund governance

| Gate | Name |
|------|------|
| C36-DC | Refund Authorization Audit |
| C36-DD | Refund Request Domain |
| C36-DE | Permission Matrix |
| C36-DF | Human Approval Workflow |
| C36-DG | Segregation of Duties |
| C36-DH | Refund Approval Limits |
| C36-DI | Authorization Security Audit |
| C36-DJ | Authorization Persistence |

### FASE 2 — Controlled refund complete

| Gate | Name |
|------|------|
| C36-DK | Refund State Machine |
| C36-DL | Approval Idempotency |
| C36-DM | Execution Authorization Binding |
| C36-DN | Refund Audit Trail |
| C36-DO | Refund Observability |
| C36-DP | Controlled Refund UI/API Audit |
| C36-DQ | Refund Governance Closure |

### FASE 3 — Payout eligibility

| Gate | Name |
|------|------|
| C36-DR | Payout Eligibility Specification |
| C36-DS | Eligibility Rules Engine |
| C36-DT | Eligibility Reason Codes |
| C36-DU | Eligibility Idempotency |
| C36-DV | Eligibility Concurrency |
| C36-DW | Eligibility Staging Matrix |
| C36-DX | Eligibility Reconciliation |
| C36-DY | Eligibility Security Audit |
| C36-DZ | Eligibility Forensic Report |

### FASE 4 — Controlled payout

| Gate | Name |
|------|------|
| C36-EA | Payout Policy |
| C36-EB | Payout Request Domain |
| C36-EC | Payout Authorization |
| C36-ED | Payout Ledger Reservation |
| C36-EE | Payout Dry Run (never real money) |

### FASE 5 — Closure

| Gate | Name |
|------|------|
| C36-EF | Final Financial Forensic Gate |

## Added governance themes (owner)

1. Segregation of duties (`requester != approver` when policy requires)
2. Amount/role/org limits (policy-driven; no invented thresholds → `POLICY_REQUIRED`)
3. Immutable authorization evidence (no silent amount/payment/booking change post-approve)
4. Payout balance reservation (anti double-payout)
5. Deterministic eligibility `reason_code`
6. Four-way split: ELIGIBLE ≠ APPROVED ≠ RESERVED ≠ EXECUTED

## Execution protocol (per gate)

```text
RECONCILE → AUDIT → PLAN → IMPLEMENT → TEST → STAGING → RECONCILE → DOCUMENT → CLOSE
```

Artifacts under `.agents/shared/`. No parallel financial writers. Preserve C36-DB refund→reversal→debit path.

## Current operational state

```text
C36-DB = PASS
C36-DC = NOT STARTED (awaits GO → C36-DC)
C36-DR..EF = BLOCKED until prior macrostages + GO
REAL_PAYOUT / PRODUCTION / GATEWAY_REAL = BLOCKED
```

## Next formal token

```text
GO → C36-DC
```

Only then: Refund Authorization Audit (map who can request/approve/execute — **no payout**).
