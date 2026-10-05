/**
 * C36-DE-06 — RefundRequest EXECUTION service (simulated money movement).
 *
 * Consumes ONLY requests in `approved` state — the state produced by the
 * C36-DE-05 decision flow. Request / decision / execution stay separated:
 * this module is never imported by `refund-request.service.ts` nor by the
 * decision routes (a static test enforces both directions).
 *
 * Pipeline:
 *
 *   approved --claim(CAS)--> executing --> provider refund (INJECTED)
 *            --> receipt persisted --> financial update (INJECTED) --> executed
 *
 *   provider refused / threw  --> failed          (nothing moved)
 *   provider accepted + financial update threw
 *                            --> stays `executing` with the receipt persisted
 *                                (safe to resume; the provider is never called
 *                                a second time)
 *
 * Guarantees:
 *  - single writer: the claim is a compare-and-set on (status, request_version),
 *    so two administrators executing simultaneously can never both reach the
 *    provider — one claims, the other is refused with EXECUTION_IN_PROGRESS;
 *  - idempotency: replaying an already `executed` request is a no-op read;
 *    `failed` is terminal (ALREADY_FAILED);
 *  - no double provider call: the receipt is written BEFORE any financial
 *    mutation, and any later attempt with a receipt present skips the provider.
 *
 * ISOLATION: this module has no import of a payment provider, factory, HTTP
 * client, environment variable or database. Every collaborator arrives through
 * `RefundExecutionDeps`, so the real provider cannot be reached from here —
 * even by accident. A static test enforces it.
 */

import {
  canExecuteRefundRequest,
  execucaoPermitida,
  podeIniciarExecucao,
} from '../lib/refund-request-execution-state';
import type { RefundRequestRow } from './refund-request.service';

export type { RefundRequestRow as RefundExecutionRequestRow };

/* ─────────────────────────────────────────────────────────────────────────
 * 1. INJECTED COLLABORATORS (ports / provider / financial update)
 * ───────────────────────────────────────────────────────────────────────── */

/** Record written by the provider when it accepts the refund. */
export type ProviderReceipt = {
  accepted: true;
  /** `gateway.name` of the injected implementation. */
  provider: string;
  externalRef: string;
  providerStatus: string;
  acceptedAt: string;
};

/** Money-movement port. The wiring shipped by this gate is SIMULATED. */
export type RefundExecutionGateway = {
  readonly name: string;
  createRefund(
    request: RefundExecutionGatewayRequest,
  ): Promise<RefundExecutionGatewayResult>;
};

export type RefundExecutionGatewayRequest = {
  requestId: string;
  paymentId: string;
  amount: string;
  currency: string;
  reason: string | null;
  /**
   * Stable per request (`refund_request_execution:{id}`). Even if a caller
   * managed to reach the provider twice, an idempotent provider would collapse
   * both attempts into one refund — defence in depth behind the claim CAS.
   */
  idempotencyKey: string;
};

export type RefundExecutionGatewayResult =
  | { kind: 'accepted'; externalRef: string; status: string }
  | { kind: 'rejected'; code: string; message: string };

export type FinancialUpdateOutcome =
  | { kind: 'applied'; detail?: string }
  | { kind: 'idempotent'; detail?: string }
  | { kind: 'skipped'; detail?: string };

/**
 * Financial domain update (payment lifecycle + partner earning reversal +
 * ledger debit). Must be idempotent: resuming a half-finished execution runs it
 * again and it must converge to exactly one reversal.
 *
 * Throwing is the failure signal: the caller then leaves the request in
 * `executing` (receipt present) instead of marking it executed.
 */
export type ApplyFinancialUpdate = (input: {
  paymentId: string;
  requestId: string;
}) => Promise<FinancialUpdateOutcome>;

/** Compare-and-set writers. Every mutation is guarded by (status, version). */
export type RefundExecutionPorts = {
  findById(id: string): Promise<RefundRequestRow | null>;
  /** CAS `approved` -> `executing`. Exactly one caller can win. */
  claim(input: ExecutionMutationInput): Promise<ExecutionMutationResult>;
  /** Persists the provider receipt while the row stays in `executing`. */
  recordReceipt(input: ExecutionMutationInput): Promise<ExecutionMutationResult>;
  /** CAS `executing` -> `executed` | `failed`. */
  finalize(
    input: ExecutionMutationInput & { next: ExecutionTerminal },
  ): Promise<ExecutionMutationResult>;
};

export type ExecutionTerminal = 'executed' | 'failed';

export type ExecutionMutationInput = {
  requestId: string;
  executedBy: number;
  expectedVersion: number;
  /** Full metadata document to persist (already merged by the service). */
  metadata: Record<string, unknown>;
};

export type ExecutionMutationResult =
  | { kind: 'updated'; request: RefundRequestRow }
  | { kind: 'conflict'; current: RefundRequestRow | null };

export type RefundExecutionDeps = {
  ports: RefundExecutionPorts;
  gateway: RefundExecutionGateway;
  applyFinancialUpdate: ApplyFinancialUpdate;
};

/* ─────────────────────────────────────────────────────────────────────────
 * 2. PUBLIC CONTRACT (input / result / HTTP status map)
 * ───────────────────────────────────────────────────────────────────────── */

export type ExecuteRefundRequestInput = {
  requestId: string;
  /** Authenticated actor id — never sourced from the request body. */
  actorId: number;
  /** Authenticated actor role — RBAC is enforced here, not at the edge. */
  actorRole: string | null;
  /** Optional optimistic-lock token; absent = rely on the fresh read. */
  expectedVersion?: number;
};

export type RefundExecutionFailure =
  | 'ACTOR_REQUIRED'
  | 'ROLE_NOT_ALLOWED'
  | 'NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'VERSION_CONFLICT'
  | 'EXECUTION_IN_PROGRESS'
  | 'ALREADY_FAILED';

/**
 * Domain failure -> HTTP status. Exported so the HTTP slice can never drift
 * from the domain (a unit test asserts equality with the route contract).
 */
export const REFUND_EXECUTION_HTTP_STATUS: Record<RefundExecutionFailure, number> = {
  ACTOR_REQUIRED: 401,
  ROLE_NOT_ALLOWED: 403,
  NOT_FOUND: 404,
  INVALID_TRANSITION: 409,
  VERSION_CONFLICT: 409,
  EXECUTION_IN_PROGRESS: 409,
  ALREADY_FAILED: 409,
};

export type ExecuteRefundRequestResult =
  | { kind: 'executed'; request: RefundRequestRow; receipt: ProviderReceipt }
  | { kind: 'idempotent'; request: RefundRequestRow }
  | { kind: 'failed'; request: RefundRequestRow; detail: string }
  | { kind: 'retry_required'; request: RefundRequestRow; detail: string }
  | { kind: 'rejected'; reason: RefundExecutionFailure; detail?: string };

/* ─────────────────────────────────────────────────────────────────────────
 * 3. METADATA helpers (the execution record lives in the existing `metadata`
 *    jsonb column — no schema change and no migration are required).
 * ───────────────────────────────────────────────────────────────────────── */

export const EXECUTION_METADATA_KEY = 'execution';

export function readExecutionMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  const execution = (metadata as Record<string, unknown>)[EXECUTION_METADATA_KEY];
  if (!execution || typeof execution !== 'object' || Array.isArray(execution)) return {};
  return { ...(execution as Record<string, unknown>) };
}

/** Returns `base` with `patch` merged into its `execution` subtree. */
export function withExecutionMetadata(
  base: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const meta: Record<string, unknown> =
    base && typeof base === 'object' && !Array.isArray(base)
      ? { ...(base as Record<string, unknown>) }
      : {};
  return {
    ...meta,
    [EXECUTION_METADATA_KEY]: { ...readExecutionMetadata(base), ...patch },
  };
}

/** Reads the persisted provider receipt; null when absent or malformed. */
export function readProviderReceipt(metadata: unknown): ProviderReceipt | null {
  const receipt = readExecutionMetadata(metadata).receipt;
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return null;
  const r = receipt as Partial<ProviderReceipt>;
  if (r.accepted !== true) return null;
  if (typeof r.externalRef !== 'string' || !r.externalRef) return null;
  if (typeof r.provider !== 'string' || !r.provider) return null;
  return {
    accepted: true,
    provider: r.provider,
    externalRef: r.externalRef,
    providerStatus: typeof r.providerStatus === 'string' ? r.providerStatus : '',
    acceptedAt: typeof r.acceptedAt === 'string' ? r.acceptedAt : '',
  };
}

/* ─────────────────────────────────────────────────────────────────────────
 * 4. USE CASE
 * ───────────────────────────────────────────────────────────────────────── */

function isoNow(): string {
  return new Date().toISOString();
}

/** Classifies a thrown provider error without leaking its internals. */
export function classifyProviderError(error: unknown): { code: string; message: string } {
  const message = error instanceof Error ? error.message : String(error);
  const timedOut = /timeout|timed\s*out|etimedout|esockettimedout/i.test(message);
  return { code: timedOut ? 'PROVIDER_TIMEOUT' : 'PROVIDER_ERROR', message };
}

/** Maps a lost CAS to the same outcome vocabulary used by the happy path. */
function mapConflict(
  current: RefundRequestRow | null,
  fallbackDetail: string,
): ExecuteRefundRequestResult {
  if (!current) {
    return { kind: 'rejected', reason: 'NOT_FOUND' };
  }
  if (current.status === 'executed') {
    return { kind: 'idempotent', request: current };
  }
  if (current.status === 'failed') {
    const failureReason = readExecutionMetadata(current.metadata).failureReason;
    return {
      kind: 'rejected',
      reason: 'ALREADY_FAILED',
      detail: typeof failureReason === 'string' ? failureReason : undefined,
    };
  }
  if (current.status === 'executing') {
    return { kind: 'rejected', reason: 'EXECUTION_IN_PROGRESS', detail: fallbackDetail };
  }
  return {
    kind: 'rejected',
    reason: 'VERSION_CONFLICT',
    detail: `expected an execution transition, found status=${current.status} version=${current.requestVersion}`,
  };
}

/**
 * Executes an APPROVED RefundRequest through the injected collaborators.
 *
 * Guarantee order:
 *  1. authenticated identity + local RBAC (admin | manager)
 *  2. request must exist
 *  3. optional optimistic lock (stale expectedVersion => VERSION_CONFLICT)
 *  4. state machine: only `approved` starts an attempt; `executed` replays as a
 *     no-op, `failed` is terminal, `executing` with a receipt resumes the
 *     financial step only, `executing` without a receipt is refused
 *  5. claim CAS — serialises concurrent executors (no double execution)
 *  6. provider call (injected) + receipt persisted BEFORE any financial write
 *  7. financial update (injected, idempotent) + finalize CAS
 *
 * Never resolves `executed` unless the provider accepted AND the financial
 * update returned without throwing.
 */
export async function executeRefundRequest(
  input: ExecuteRefundRequestInput,
  deps: RefundExecutionDeps,
): Promise<ExecuteRefundRequestResult> {
  if (typeof input.actorId !== 'number' || !Number.isFinite(input.actorId)) {
    return { kind: 'rejected', reason: 'ACTOR_REQUIRED' };
  }
  if (!canExecuteRefundRequest(input.actorRole)) {
    return {
      kind: 'rejected',
      reason: 'ROLE_NOT_ALLOWED',
      detail: `role '${String(input.actorRole)}' cannot execute refund requests`,
    };
  }

  const current = await deps.ports.findById(input.requestId);
  if (!current) {
    return { kind: 'rejected', reason: 'NOT_FOUND' };
  }
  if (input.expectedVersion !== undefined && input.expectedVersion !== current.requestVersion) {
    return {
      kind: 'rejected',
      reason: 'VERSION_CONFLICT',
      detail: `expected version=${input.expectedVersion}, found version=${current.requestVersion}`,
    };
  }

  /* ── 4a. Terminal / replay / resume states ─────────────────────────── */
  if (current.status === 'executed') {
    // Replay: no provider call, no financial write.
    return { kind: 'idempotent', request: current };
  }

  if (current.status === 'failed') {
    const failureReason = readExecutionMetadata(current.metadata).failureReason;
    return {
      kind: 'rejected',
      reason: 'ALREADY_FAILED',
      detail: typeof failureReason === 'string' ? failureReason : undefined,
    };
  }

  if (current.status === 'executing') {
    const receipt = readProviderReceipt(current.metadata);
    if (!receipt) {
      // Claimed but the provider outcome is unknown: calling it again could
      // move money twice, so this attempt is refused.
      return {
        kind: 'rejected',
        reason: 'EXECUTION_IN_PROGRESS',
        detail:
          'execution already claimed without a provider receipt; manual resolution required',
      };
    }
    // Provider already accepted: resume the financial step only.
    return finishFinancialUpdate({ row: current, receipt, executedBy: input.actorId, deps });
  }

  if (!podeIniciarExecucao(current.status)) {
    return {
      kind: 'rejected',
      reason: 'INVALID_TRANSITION',
      detail: `${current.status} -> executing`,
    };
  }

  /* ── 5. Claim: the single writer that prevents double execution ────── */
  const claim = await deps.ports.claim({
    requestId: current.id,
    executedBy: input.actorId,
    expectedVersion: current.requestVersion,
    metadata: withExecutionMetadata(current.metadata, {
      executedBy: input.actorId,
      provider: deps.gateway.name,
      claimedAt: isoNow(),
      simulated: true,
    }),
  });

  if (claim.kind === 'conflict') {
    return mapConflict(claim.current, 'another executor claimed this request first');
  }

  const claimed = claim.request;

  /* ── 6. Provider call (injected — simulated in this gate) ──────────── */
  let gatewayResult: RefundExecutionGatewayResult;
  try {
    gatewayResult = await deps.gateway.createRefund({
      requestId: claimed.id,
      paymentId: claimed.paymentId,
      amount: claimed.amount,
      currency: claimed.currency,
      reason: claimed.reason,
      idempotencyKey: `refund_request_execution:${claimed.id}`,
    });
  } catch (error) {
    const classified = classifyProviderError(error);
    gatewayResult = { kind: 'rejected', code: classified.code, message: classified.message };
  }

  if (gatewayResult.kind === 'rejected') {
    // Nothing moved: terminal `failed`.
    const failed = await deps.ports.finalize({
      requestId: claimed.id,
      executedBy: input.actorId,
      expectedVersion: claimed.requestVersion,
      next: 'failed',
      metadata: withExecutionMetadata(claimed.metadata, {
        gatewayAccepted: false,
        failureReason: gatewayResult.code,
        failureDetail: gatewayResult.message,
        failedAt: isoNow(),
      }),
    });
    if (failed.kind === 'conflict') {
      return mapConflict(failed.current, 'could not persist the execution failure');
    }
    return { kind: 'failed', request: failed.request, detail: gatewayResult.code };
  }

  /* ── 6b. Receipt persisted BEFORE the financial write. From here on no
   *        future attempt may call the provider again. ────────────────── */
  const receipt: ProviderReceipt = {
    accepted: true,
    provider: deps.gateway.name,
    externalRef: gatewayResult.externalRef,
    providerStatus: gatewayResult.status,
    acceptedAt: isoNow(),
  };

  const recorded = await deps.ports.recordReceipt({
    requestId: claimed.id,
    executedBy: input.actorId,
    expectedVersion: claimed.requestVersion,
    metadata: withExecutionMetadata(claimed.metadata, {
      receipt,
      gatewayAccepted: true,
    }),
  });

  if (recorded.kind === 'conflict') {
    // Never continue without the receipt persisted: a later crash would make
    // the provider state unknowable.
    return mapConflict(recorded.current, 'could not persist the provider receipt');
  }

  return finishFinancialUpdate({
    row: recorded.request,
    receipt,
    executedBy: input.actorId,
    deps,
  });
}

/* ─────────────────────────────────────────────────────────────────────────
 * 5. FINANCIAL STEP (shared by the happy path and by the resume path)
 * ───────────────────────────────────────────────────────────────────────── */

async function finishFinancialUpdate(args: {
  row: RefundRequestRow;
  receipt: ProviderReceipt;
  executedBy: number;
  deps: RefundExecutionDeps;
}): Promise<ExecuteRefundRequestResult> {
  const { row, receipt, executedBy, deps } = args;

  let outcome: FinancialUpdateOutcome;
  try {
    outcome = await deps.applyFinancialUpdate({
      paymentId: row.paymentId,
      requestId: row.id,
    });
  } catch {
    // The receipt is already persisted and the row is still `executing`: the
    // domain stays consistent and resumable, and the provider will not be
    // called again. Reporting `executed` here would be a financial lie.
    return { kind: 'retry_required', request: row, detail: 'FINANCIAL_UPDATE_FAILED' };
  }

  const finalized = await deps.ports.finalize({
    requestId: row.id,
    executedBy,
    expectedVersion: row.requestVersion,
    next: 'executed',
    metadata: withExecutionMetadata(row.metadata, {
      receipt,
      gatewayAccepted: true,
      financial: {
        kind: outcome.kind,
        detail: outcome.detail ?? null,
        appliedAt: isoNow(),
      },
      executedAt: isoNow(),
    }),
  });

  if (finalized.kind === 'conflict') {
    return mapConflict(finalized.current, 'could not persist the execution result');
  }

  return { kind: 'executed', request: finalized.request, receipt };
}

/** True only when a request may start a fresh execution attempt. */
export function isExecutableStatus(status: string): boolean {
  return podeIniciarExecucao(status);
}

/** True only for transitions of the execution domain (introspection aid). */
export function isExecutionTransition(from: string, to: string): boolean {
  return execucaoPermitida(from, to);
}




