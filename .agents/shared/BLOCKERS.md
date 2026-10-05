# C36-DE-08 — BLOCKERS / DECISIONS

## BLOCKER FUNCIONAL DO GATE (histórico — RESOLVIDO)

```text
B1  [RESOLVIDO em 2026-10-04] `confirmed` sem `externalRef` verificável chegava a `executed`,
    persistindo receipt inválido e disparando movimentação financeira.
    Achado pelo FINAL VALIDATION GATE (reproduzido por execução, V-A: kind=executed, receipt=null).
    Correção: o receipt adotado passa por `readProviderReceipt()` antes de finalizar; se inválido
    → `still_executing` + `PROBE_UNVERIFIABLE_CONFIRMATION` + backoff/attempts existentes.
    Provas: R11 (defeito reproduzido agora coberto), R12 (caminho feliz intacto),
    R13 (retry controlado, financeiro = 0).
```

**Estado do gate:** `C36-DE-08 = PASS / CLOSED` — FINAL VALIDATION GATE #2 concluído em 2026-10-04.
Rework do B1 aplicado, validado e encerrado. **Não há rework pendente.**
Não há blocker de infraestrutura, de banco ou de ambiente aberto.

### Evidência do fechamento

```text
Code ......... PASS  (confirmed+receipt válido => executed; confirmado=>still_executing)
Tests ........ PASS  (34 passed / 6 skipped · regressão 286 passed / 22 skipped · 0 failed)
Concurrency .. PASS  (2 reconciliators => CAS => 1 vencedor => 1 movimentação)
Security ..... PASS  (confirmed sem prova => PROBE_UNVERIFIABLE_CONFIRMATION => financeiro 0)
Reconciliation PASS  (TTL+grace, lease, attempts, maxAttempts, backoff, nextEligibleAt, idempotência)
Documentation PASS  (D7 reconciliado; nenhuma afirmação de "byte-intacto" para o reconciliador)
Typecheck .... PASS  (tsc exit 0)   Guardrails ... PASS (0 ocorrências proibidas)
```

## BLOCKERS DE AMBIENTE

Nenhum. Nenhuma alteração estrutural foi necessária — sem DDL, sem migration.

## FUTURE GATE (BLOQUEADO — não é backlog informal)

```text
Se, no futuro, for requerido:
  - varrer "todos os `executing` com nextEligibleAt vencido" em escala, ou
  - indexar lease/backoff para um scheduler externo,
então será necessária coluna/índice dedicado => MIGRATION GATE PRÓPRIO, hoje BLOQUEADO.
Até lá, o worker é dirigido por chamada (uma request por vez), com estado em `metadata`.
Qualquer trabalho futuro deve nascer como NOVO GATE, com escopo e autorização próprios.
```

## DECISIONS

```text
D1  TTL + grace + lease vivem em `metadata.reconciliation` — zero DDL (respeita MIGRATION BLOCKED).
D2  Anti-falso-timeout: ausência de timestamp => `no_evidence` => NUNCA expira. Expirar sem
    evidência é justamente o que permitiria roubar uma execução saudável.
D3  Lease é um CAS em (status='executing', request_version) via `recordReceipt` — reusa o port
    existente; não inventa autoridade nova nem movimentação financeira.
D4  Budget finito: `maxAttempts` (default 5) => `attempts_exhausted`; a linha permanece
    `executing` e nada é retentado automaticamente.
D5  Backoff exponencial com teto (base 15s, max 15min); `nextEligibleAt` persistido para que
    dois ciclos do mesmo worker não colidam.
D6  Lease residual em linha terminal é INERTE (não é liberada porque o port só muta `executing`);
    reconciliador só age em `executing`, então não há efeito. Documentado em vez de mascarado.
D7  [RECONCILIADO em 2026-10-04 — a redação anterior estava ERRADA]
    NÃO propagar este worker para o núcleo de execução: `reconcileExpiredRefundRequest`
    (worker) é função SEPARADA e não toca o núcleo DE-06.
    ⚠ `reconcileRefundRequest` NÃO permanece byte-intacto: no rework autorizado do blocker B1,
    o bloco `confirmed` ganhou o guard de verificabilidade (delta único, linhas 172–187:
    `readProviderReceipt(adopted)` ⇒ `still_executing` + `PROBE_UNVERIFIABLE_CONFIRMATION`).
    O que permanece byte-intacto é o NÚCLEO DE-06:
      refund-request-execution.service.ts   (mtime 2026-09-30) — intocado
      refund-request-execution-state.ts    (mtime 2026-09-30) — intocado
      refund-request.service.ts            (mtime 2026-10-02) — intocado
    Justificativa de não-regressão: o delta só pode MIGRAR um estado — de `executed` (sem prova)
    para `still_executing` (sem prova). Nenhuma transição nova, nenhum caminho novo de
    finalização, nenhuma autoridade financeira acrescida. Coberto por R11/R12/R13.
```
