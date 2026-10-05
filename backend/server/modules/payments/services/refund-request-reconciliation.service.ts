/**
 * C36-DE-08 — RefundRequest RECONCILIATION service (timeout recovery).
 *
 * Recovers requests stuck in `executing` after a crash/timeout between the
 * provider call and the financial update. The money-moving call is never
 * made here — the provider is only QUERIED (read-only probe) and
 * a refund is only finalized as `executed` with a verifiable confirmation
 * (persisted receipt or a `confirmed` probe answer).
 *
 *   confirmed --> adopt/persist receipt (CAS) --> financial update --> executed
 *   denied    --> finalize `failed` (nothing moves, provider refused)
 *   unknown   --> STAY `executing` (safe, resumable, no money retried)
 *
 * Single writer: every mutation is a CAS on (status, request_version), so an
 * executor racing the reconciler loses one side with a conflict, never a
 * duplicate. Idempotent: `executed`/`failed` are terminal no-ops; repeating a
 * reconciliation reuses the persisted receipt + idempotent financial update.
 *
 * ISOLATION: no provider/factory/HTTP/env/DB import. All via deps.
 */

import { canExecuteRefundRequest, execucaoPermitida } from '../lib/refund-request-execution-state';
import {
  evaluateExecutingExpiry,
  isAttemptsExhausted,
  isInBackoff,
  leaseClaimState,
  nextAttemptState,
  readReconciliationState,
  withReconciliationMetadata,
} from '../lib/refund-request-reconciliation-policy';
import {
  EXECUTION_METADATA_KEY,
  readExecutionMetadata,
  readProviderReceipt,
  withExecutionMetadata,
  type ApplyFinancialUpdate,
  type FinancialUpdateOutcome,
  type ProviderReceipt,
  type RefundExecutionPorts,
} from './refund-request-execution.service';
import type { RefundRequestRow } from './refund-request.service';

/** Read-only view of the provider state for one request. Never moves money. */
export type ReconciliationProbeRequest = {
  requestId: string;
  paymentId: string;
  amount: string;
  currency: string;
  idempotencyKey: string;
};

export type ReconciliationProbeOutcome =
  | { kind: 'confirmed'; externalRef: string; providerStatus: string; confirmedAt: string }
  | { kind: 'denied'; code: string; message: string }
  | { kind: 'unknown'; detail: string };

export type ReconciliationProbe = {
  readonly name: string;
  queryRefund(request: ReconciliationProbeRequest): Promise<ReconciliationProbeOutcome>;
};

export type RefundReconciliationDeps = {
  ports: RefundExecutionPorts;
  probe: ReconciliationProbe;
  applyFinancialUpdate: ApplyFinancialUpdate;
};

export type ReconcileRefundRequestInput = {
  requestId: string;
  actorId: number;
  actorRole: string;
  expectedVersion?: number;
};

export type ReconcileRefundRequestResult =
  | { kind: 'executed'; request: RefundRequestRow; receipt: ProviderReceipt; detail?: string }
  | { kind: 'failed'; request: RefundRequestRow; detail: string }
  | { kind: 'still_executing'; request: RefundRequestRow; detail: string }
  | { kind: 'already_executed'; request: RefundRequestRow }
  | { kind: 'already_failed'; request: RefundRequestRow }
  | { kind: 'not_executing'; request: RefundRequestRow; detail: string }
  | { kind: 'conflict'; current: RefundRequestRow | null; detail: string }
  | { kind: 'not_found'; detail: string }
  | { kind: 'refused'; detail: string };

export const REFUND_RECONCILIATION_HTTP_STATUS = {
  executed: 200,
  failed: 200,
  still_executing: 200,
  already_executed: 200,
  already_failed: 409,
  not_executing: 409,
  conflict: 409,
  not_found: 404,
  refused: 403,
} as const;

function executionIdempotencyKey(requestId: string): string {
  return `refund_request_execution:${requestId}`;
}

/** Reconciles one request. Never retries the refund; only `executing` rows qualify. */
export async function reconcileRefundRequest(
  input: ReconcileRefundRequestInput,
  deps: RefundReconciliationDeps,
): Promise<ReconcileRefundRequestResult> {
  if (!canExecuteRefundRequest(input.actorRole)) {
    return { kind: 'refused', detail: 'FORBIDDEN' };
  }
  const current = await deps.ports.findById(input.requestId);
  if (!current) return { kind: 'not_found', detail: 'REFUND_REQUEST_NOT_FOUND' };
  if (input.expectedVersion !== undefined && current.requestVersion !== input.expectedVersion) {
    return { kind: 'conflict', current, detail: 'STALE_VERSION' };
  }
  if (current.status === 'executed') return { kind: 'already_executed', request: current };
  if (current.status === 'failed') return { kind: 'already_failed', request: current };
  if (current.status !== 'executing') {
    return { kind: 'not_executing', request: current, detail: 'NOT_EXECUTING' };
  }

  const receipt = readProviderReceipt(current.metadata);
  if (receipt) {
    return finishFromReceipt({ row: current, receipt, deps, actorId: input.actorId });
  }

  let probeOutcome: ReconciliationProbeOutcome;
  try {
    probeOutcome = await deps.probe.queryRefund({
      requestId: current.id,
      paymentId: current.paymentId,
      amount: current.amount,
      currency: current.currency,
      idempotencyKey: executionIdempotencyKey(current.id),
    });
  } catch {
    return { kind: 'still_executing', request: current, detail: 'PROBE_UNKNOWN' };
  }

  if (probeOutcome.kind === 'unknown') {
    return { kind: 'still_executing', request: current, detail: probeOutcome.detail };
  }

  if (probeOutcome.kind === 'denied') {
    const finalized = await deps.ports.finalize({
      requestId: current.id,
      executedBy: input.actorId,
      expectedVersion: current.requestVersion,
      next: 'failed',
      metadata: withExecutionMetadata(current.metadata, {
        gatewayAccepted: false,
        failureReason: probeOutcome.code,
        failureDetail: `reconciled: ${probeOutcome.message}`,
        failedAt: isoNow(),
        reconciliation: { probe: deps.probe.name, outcome: 'denied', reconciledAt: isoNow() },
      }),
    });
    if (finalized.kind === 'conflict') {
      return { kind: 'conflict', current: finalized.current, detail: 'RECONCILIATION_RACE_LOST' };
    }
    return { kind: 'failed', request: finalized.request, detail: probeOutcome.code };
  }

  const adopted: ProviderReceipt = {
    accepted: true,
    provider: deps.probe.name,
    externalRef: probeOutcome.externalRef,
    providerStatus: probeOutcome.providerStatus,
    acceptedAt: probeOutcome.confirmedAt,
  };

  // C36-DE-08 VALIDATION: um `confirmed` sem prova verificavel NAO pode finalizar `executed`.
  // O receipt adotado passa pelo MESMO validador usado na leitura do metadata
  // (`readProviderReceipt`): se ele for invalido, nao ha prova, logo nao ha `executed`,
  // nao ha movimentacao financeira e nao ha receipt persistido. A linha permanece `executing`
  // e o backoff/attempts existentes cuidem da proxima tentativa.
  const verifiable = readProviderReceipt({
    [EXECUTION_METADATA_KEY]: { receipt: adopted },
  });
  if (verifiable === null) {
    return {
      kind: 'still_executing',
      request: current,
      detail: 'PROBE_UNVERIFIABLE_CONFIRMATION',
    };
  }

  const recorded = await deps.ports.recordReceipt({
    requestId: current.id,
    executedBy: input.actorId,
    expectedVersion: current.requestVersion,
    metadata: withExecutionMetadata(current.metadata, {
      receipt: adopted,
      gatewayAccepted: true,
      reconciliation: { probe: deps.probe.name, outcome: 'confirmed', reconciledAt: isoNow() },
    }),
  });
  if (recorded.kind === 'conflict') {
    return { kind: 'conflict', current: recorded.current, detail: 'RECONCILIATION_RACE_LOST' };
  }
  return finishFromReceipt({ row: recorded.request, receipt: adopted, deps, actorId: input.actorId });
}

async function finishFromReceipt(args: {
  row: RefundRequestRow;
  receipt: ProviderReceipt;
  deps: RefundReconciliationDeps;
  actorId: number;
}): Promise<ReconcileRefundRequestResult> {
  const { row, receipt, deps, actorId } = args;
  let outcome: FinancialUpdateOutcome;
  try {
    outcome = await deps.applyFinancialUpdate({ paymentId: row.paymentId, requestId: row.id });
  } catch {
    return { kind: 'still_executing', request: row, detail: 'FINANCIAL_UPDATE_FAILED' };
  }
  const prior = readExecutionMetadata(row.metadata);
  const priorFin = (prior?.[EXECUTION_METADATA_KEY] as { financial?: unknown } | undefined)
    ? (prior[EXECUTION_METADATA_KEY] as { financial?: { kind?: string } }).financial
    : undefined;
  const finalized = await deps.ports.finalize({
    requestId: row.id,
    executedBy: actorId,
    expectedVersion: row.requestVersion,
    next: 'executed',
    metadata: withExecutionMetadata(row.metadata, {
      receipt,
      gatewayAccepted: true,
      financial: {
        kind: outcome.kind,
        detail: outcome.detail ?? null,
        appliedAt: isoNow(),
        ...(priorFin && typeof priorFin === 'object' ? { resumedFrom: priorFin } : {}),
      },
      executedAt: isoNow(),
      reconciliation: { probe: deps.probe.name, outcome: 'resumed_from_receipt', reconciledAt: isoNow() },
    }),
  });
  if (finalized.kind === 'conflict') {
    return { kind: 'conflict', current: finalized.current, detail: 'RECONCILIATION_RACE_LOST' };
  }
  if (!execucaoPermitida(row.status, 'executed')) {
    return { kind: 'conflict', current: finalized.request, detail: 'ILLEGAL_TRANSITION' };
  }
  return { kind: 'executed', request: finalized.request, receipt };
}

function isoNow(): string {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------------------------------------
 * C36-DE-08 (parte 2) — RECONCILIATION WORKER: expiração + lease/CAS + attempts + backoff.
 *
 * A função acima (`reconcileRefundRequest`) permanece o núcleo: probe read-only + tricotomia
 * confirmed/denied/unknown + CAS. Esta camada apenas decide QUANDO é legítimo chamá-la:
 *
 *   1. anti-falso-timeout : só `executing` comprovadamente velho (TTL+grace) e sem lease viva;
 *   2. max_attempts       : orçamento finito por request (sem retry infinito);
 *   3. backoff            : janela exponencial respeitada;
 *   4. lease via CAS      : claim em (status='executing', request_version) => um único writer;
 *   5. idempotência       : reaproveita o núcleo, que já trata receipt/terminal.
 *
 * `expectedVersion` continua sendo o CAS do caller; o lease é um CAS ADICIONAL (bump de versão)
 * antes do probe. Dois reconciliadores simultâneos: um ganha o lease, o outro recebe `conflict`
 * e não toca o provider. Nenhuma movimentação financeira nova é criada aqui.
 * ------------------------------------------------------------------------------------------------ */

export type ReconciliationPolicyOptions = {
  ttlMs?: number;
  graceMs?: number;
  maxAttempts?: number;
  backoffBaseMs?: number;
  backoffMaxMs?: number;
  leaseMs?: number;
  /** Identidade do reconciliador (worker id / hostname). Default derivado do ator. */
  ownerId?: string;
  /** Relógio injetável para teste. Default `new Date()`. */
  now?: () => Date;
};

export type ReconcileExpiredRefundRequestResult =
  | ReconcileRefundRequestResult
  | { kind: 'not_expired'; request: RefundRequestRow; detail: string; ageMs: number | null }
  | { kind: 'backoff_wait'; request: RefundRequestRow; detail: string; nextEligibleAt: string | null }
  | { kind: 'attempts_exhausted'; request: RefundRequestRow; detail: string; attempts: number }
  | { kind: 'lease_lost'; current: RefundRequestRow | null; detail: string };

export const REFUND_RECONCILIATION_WORKER_HTTP_STATUS = {
  ...REFUND_RECONCILIATION_HTTP_STATUS,
  not_expired: 200,
  backoff_wait: 202,
  attempts_exhausted: 409,
  lease_lost: 409,
} as const;

/**
 * Reconciliador com lease. Só age sobre `executing` expirado e dentro do orçamento de attempts.
 * Nunca chama `createRefund`. Nunca altera o status do request (delega ao núcleo).
 */
export async function reconcileExpiredRefundRequest(
  input: ReconcileRefundRequestInput,
  deps: RefundReconciliationDeps,
  policy: ReconciliationPolicyOptions = {},
): Promise<ReconcileExpiredRefundRequestResult> {
  const now = policy.now ?? (() => new Date());
  const ownerId = typeof policy.ownerId === 'string' && policy.ownerId.length > 0
    ? policy.ownerId
    : `reconciler:${input.actorId}`;

  if (!canExecuteRefundRequest(input.actorRole)) {
    return { kind: 'refused', detail: 'FORBIDDEN' };
  }

  const before = await deps.ports.findById(input.requestId);
  if (!before) return { kind: 'not_found', detail: 'REFUND_REQUEST_NOT_FOUND' };

  if (before.status !== 'executing') {
    // Delegação: deixa o núcleo decidir (already_executed / already_failed / not_executing).
    return reconcileRefundRequest(input, deps);
  }

  const expiry = evaluateExecutingExpiry(before, now(), policy);
  if (!expiry.expired) {
    return {
      kind: 'not_expired',
      request: before,
      detail: `EXECUTING_${expiry.reason.toUpperCase()}`,
      ageMs: expiry.ageMs,
    };
  }

  if (isAttemptsExhausted(before.metadata, policy.maxAttempts)) {
    const state = readReconciliationState(before.metadata);
    return {
      kind: 'attempts_exhausted',
      request: before,
      detail: 'MAX_ATTEMPTS_REACHED',
      attempts: state.attempts,
    };
  }

  if (isInBackoff(before.metadata, now())) {
    return {
      kind: 'backoff_wait',
      request: before,
      detail: 'BACKOFF_ACTIVE',
      nextEligibleAt: readReconciliationState(before.metadata).nextEligibleAt,
    };
  }

  // Lease: CAS em (status='executing', request_version). Um único writer prossegue.
  const leased = await deps.ports.recordReceipt({
    requestId: before.id,
    executedBy: input.actorId,
    expectedVersion: before.requestVersion,
    metadata: withReconciliationMetadata(
      before.metadata,
      { ...leaseClaimState(ownerId, now(), policy.leaseMs), attempts: readReconciliationState(before.metadata).attempts },
      now(),
    ),
  });
  if (leased.kind === 'conflict') {
    return { kind: 'lease_lost', current: leased.current, detail: 'RECONCILIATION_LEASE_LOST' };
  }

  const outcome = await reconcileRefundRequest(
    { ...input, expectedVersion: undefined },
    deps,
  );

  const post = await deps.ports.findById(before.id);
  if (post && post.status === 'executing') {
    const booked = await deps.ports.recordReceipt({
      requestId: post.id,
      executedBy: input.actorId,
      expectedVersion: post.requestVersion,
      metadata: withReconciliationMetadata(
        post.metadata,
        nextAttemptState(post.metadata, now(), policy),
        now(),
      ),
    });
    if (booked.kind === 'updated') {
      return { ...outcome, request: booked.request } as ReconcileExpiredRefundRequestResult;
    }
    return outcome as ReconcileExpiredRefundRequestResult;
  }

  // Linha terminal (executed/failed): a lease residual NAO e liberada por CAS porque o port
  // so aceita mutacao em `executing` — e NAO precisa ser: reconciliacao so age sobre
  // `executing`, entao o bloco de lease em linha terminal e inerte. Ele fica limitado pelo
  // proprio TTL e nunca bloqueia nada (ver W7/W12, que provam already_executed sem probe).
  return outcome as ReconcileExpiredRefundRequestResult;
}

