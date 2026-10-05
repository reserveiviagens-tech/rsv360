# C36-DE-08 — HANDOFF (reconciliation worker: timeout recovery)

Status: **PASS / CLOSED** (FINAL VALIDATION GATE #2, 2026-10-04) · HEAD `61040b02`
· branch `feat/c36dd-refund-request-domain`
Sem commit · sem push · sem migration · sem gateway real · sem staging/produção.

```text
Migration Apply = BLOCKED · DB Durável = BLOCKED · Gateway Sandbox/Real = BLOCKED
Staging = BLOCKED · Deploy = BLOCKED · Production = BLOCKED
Próximo trabalho = NOVO GATE, com escopo e autorização próprios.
```

## Rework de 2026-10-04 (FINAL VALIDATION GATE → NEEDS_REWORK → corrigido)

Defeito real de segurança financeira, reproduzido por execução:

```text
confirmed + externalRef=""  →  kind=executed  |  receipt=null  |  financeiro disparado
```

Correção mínima no caminho `confirmed` de `reconcileRefundRequest`:

```text
const verifiable = readProviderReceipt({ [EXECUTION_METADATA_KEY]: { receipt: adopted } });
if (verifiable === null) {
  return { kind: 'still_executing', request: current, detail: 'PROBE_UNVERIFIABLE_CONFIRMATION' };
}
```

Sem receipt persistido, sem mudança de status, sem dinheiro; backoff/attempts existentes
assumem a próxima tentativa. Provas: **R11** (caso inválido), **R12** (caminho feliz intacto),
**R13** (retry controlado, financeiro = 0).

## O que existe agora

| Camada | Arquivo | Papel |
|---|---|---|
| Policy (puro) | `backend/server/modules/payments/lib/refund-request-reconciliation-policy.ts` | TTL/grace, backoff exponencial com teto, attempts, lease claim, merge de metadata |
| Serviço (núcleo) | `.../services/refund-request-reconciliation.service.ts` | `reconcileRefundRequest` (probe read-only + tricotomia + CAS) — alterado **apenas** no guard `confirmed` do rework B1 (delta único, linhas 172–187) |
| Serviço (worker) | idem | `reconcileExpiredRefundRequest` (expiração + lease CAS + attempts + backoff) |
| Probe double | `.../lib/reconciliation-probe.double.ts` | Provider offline (sem I/O/rede/credencial) |
| Testes unit | `.../unit/refund-request-reconciliation.test.ts` (R1–R10) · `...reconciliation-worker.test.ts` (W1–W15) | provas puras |
| Teste integração | `.../integration/refund-request-reconciliation.postgres.integration.test.ts` (P0–P5) | PG efêmero |

## Comportamento (invariante financeira)

```text
executing vivo       -> not_expired        (nada acontece; anti-falso-timeout)
executing sem prova  -> not_expired        (no_evidence NUNCA expira)
executing expirado   -> lease (CAS) -> probe
     probe confirmed -> receipt (CAS) -> financial (1x) -> executed
     probe denied    -> failed (0 movimentacao)
     probe unknown   -> segue `executing`, attempts+1, backoff, 0 movimentacao
attempts >= max      -> attempts_exhausted (segue `executing`, nada retentado)
backoff ativo        -> backoff_wait       (não toca provider)
```

- **Nenhuma movimentação financeira nova:** o worker não expõe `createRefund` (assert estrutural
  em R6/W15) e só finaliza `executed` com confirmação verificável.
- **Dois reconciliadores concorrentes:** lease via CAS em `(status='executing', request_version)`;
  um prossegue, o outro recebe `conflict`/`lease_lost` — provado em W11 (`executed` exatamente 1x,
  financeiro exatamente 1x).

## Limite do modelo atual (sem migration)

O estado de reconciliação (attempts, backoff, lease) vive em `metadata` (JSON já existente).
**Nenhuma coluna/tabela nova.** Se o negócio exigir consulta por `nextEligibleAt` em escala,
seria preciso índice/coluna — isso é um gate de MIGRATION próprio, ainda BLOQUEADO.

## Próximo gate (não iniciado)

`VALIDATION` pelo Owner/Antigravity → depois, e somente depois, avaliação de gateway sandbox.
Nada de DE-06, C5, WS-07, staging, deploy ou pagamento real.
