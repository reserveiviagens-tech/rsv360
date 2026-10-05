# C36 — ESTADO OFICIAL DOS GATES

```text
C36-DD       PASS
C36-DE-05    PASS
C36-DE-06    PASS / CLOSED
C36-DE-07    PASS / CLOSED
C36-DE-08    PASS / CLOSED      ← VALIDATION: COMPLETE · REWORK: COMPLETE · DOCUMENTATION: RECONCILED
```

Registro de topo para o próximo trabalho:

```text
C36-DE-08
STATUS: PASS / CLOSED
VALIDATION: COMPLETE
REWORK: COMPLETE
DOCUMENTATION: RECONCILED

NEXT WORK:
NOVO GATE — não parte do escopo DE-08.

INHERITED BLOCKERS:
- MIGRATION APPLY = BLOCKED
- DURABLE DB = BLOCKED
- GATEWAY = BLOCKED
- STAGING = BLOCKED
- DEPLOY = BLOCKED
- PRODUCTION = BLOCKED

BASELINE:
HEAD = 61040b02
BRANCH = feat/c36dd-refund-request-domain
WORKING TREE = preservar integralmente
```

## Invariante herdada do DE-08

```text
Uma futura necessidade de varredura/indexação em escala por `nextEligibleAt`
exige NOVO MIGRATION GATE. NÃO deve ser incorporada retroativamente ao DE-08.
```

## Fluxo de gate (modelo vigente)

```text
GATE CLOSED → NOVO GATE → READ-ONLY DISCOVERY → IMPLEMENTATION PLAN
→ CODE CHANGE + LOCAL TEST → VALIDATION → CLOSED
```

Nenhum gate seguinte herda automaticamente a autorização do DE-08.

## Alerta de baseline (preservar, não commitar acidentalmente)

```text
backend/drizzle/meta/_journal.json  →  modificação PRÉ-EXISTENTE no working tree
                                      (já `M` na evidência de boundary do início do DE-08).
                                      Provado que a suíte de testes NÃO altera o journal.
                                      Não incluir em commit sem decisão explícita.
```

## Cadeia financeira comprovada e fechada

```text
confirmed + receipt VÁLIDO    → executed            → financeiro = 1x
confirmed + receipt INVÁLIDO  → PROBE_UNVERIFIABLE_CONFIRMATION → still_executing
                             → backoff/attempts      → financeiro = 0
2 reconciliators simultâneos → CAS                  → 1 vencedor → 1 movimentação
```