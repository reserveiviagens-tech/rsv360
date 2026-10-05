/**
 * C36-DD — RefundRequest domain service.
 * Creates request records only. NEVER calls provider refund execution,
 * gateway, earning reversal, or ledger debit.
 */

import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../../../src/db/drizzle';
import {
  payments,
  refundRequestDecisions,
  refundRequests,
} from '../../../../src/db/schema/payments';
import {
  canDecideRefundRequest,
  transicaoPermitida,
  type RefundDecisionTarget,
  type RefundRequestStatus,
} from '../lib/refund-request-state';

export const REFUND_REQUEST_OPEN_STATUSES = ['draft', 'pending'] as const;
export type RefundRequestOpenStatus = (typeof REFUND_REQUEST_OPEN_STATUSES)[number];

export type CreateRefundRequestInput = {
  paymentId: string;
  bookingId?: number | null;
  amount: string | number;
  currency?: string;
  reason?: string | null;
  requestedBy?: number | null;
  status?: RefundRequestOpenStatus;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type RefundRequestRow = {
  id: string;
  paymentId: string;
  bookingId: number | null;
  amount: string;
  currency: string;
  reason: string | null;
  requestedBy: number | null;
  status: string;
  requestVersion: number;
  idempotencyKey: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  decidedBy: number | null;
  decidedAt: Date | null;
  decisionReason: string | null;
};

export type CreateRefundRequestResult =
  | { kind: 'created'; request: RefundRequestRow }
  | { kind: 'idempotent'; request: RefundRequestRow }
  | { kind: 'rejected'; reason: string; detail?: string };

export type RefundRequestPorts = {
  /**
   * C36-DE-14 (additive, read-only): authoritative tenant of the underlying
   * Payment. Never stored on refund_requests — it is resolved through the
   * payment, which is the tenant boundary owner.
   */
  findPayment(paymentId: string): Promise<{
    id: string;
    bookingId: number | null;
    amount: string | number;
    currency: string;
    status: string;
    enterpriseId: string | null;
  } | null>;
  findByIdempotencyKey(key: string): Promise<RefundRequestRow | null>;
  findOpenByPaymentId(paymentId: string): Promise<RefundRequestRow | null>;
  insert(row: {
    paymentId: string;
    bookingId: number | null;
    amount: string;
    currency: string;
    reason: string | null;
    requestedBy: number | null;
    status: RefundRequestOpenStatus;
    idempotencyKey: string | null;
    metadata: Record<string, unknown> | null;
  }): Promise<RefundRequestRow>;
  findById(id: string): Promise<RefundRequestRow | null>;
};

function mapRow(row: {
  id: string;
  paymentId: string;
  bookingId: number | null;
  amount: string | number;
  currency: string;
  reason: string | null;
  requestedBy: number | null;
  status: string;
  requestVersion: number;
  idempotencyKey: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  decidedBy: number | null;
  decidedAt: Date | null;
  decisionReason: string | null;
}): RefundRequestRow {
  return {
    id: row.id,
    paymentId: row.paymentId,
    bookingId: row.bookingId,
    amount: String(row.amount),
    currency: row.currency,
    reason: row.reason,
    requestedBy: row.requestedBy,
    status: row.status,
    requestVersion: row.requestVersion,
    idempotencyKey: row.idempotencyKey,
    metadata: row.metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    decidedBy: row.decidedBy,
    decidedAt: row.decidedAt,
    decisionReason: row.decisionReason,
  };
}

function normalizeAmount(raw: string | number): string | null {
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(2);
}

function normalizeCurrency(raw: string | undefined): string | null {
  const c = (raw ?? 'BRL').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(c)) return null;
  return c;
}

export function createDrizzleRefundRequestPorts(): RefundRequestPorts {
  return {
    async findPayment(paymentId) {
      const [row] = await db
        .select({
          id: payments.id,
          bookingId: payments.bookingId,
          amount: payments.amount,
          currency: payments.currency,
          status: payments.status,
          // C36-DE-14 (read-only): authoritative tenant owner of the payment.
          enterpriseId: payments.enterpriseId,
        })
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);
      return row ?? null;
    },
    async findByIdempotencyKey(key) {
      const [row] = await db
        .select()
        .from(refundRequests)
        .where(eq(refundRequests.idempotencyKey, key))
        .limit(1);
      return row ? mapRow(row) : null;
    },
    async findOpenByPaymentId(paymentId) {
      const [row] = await db
        .select()
        .from(refundRequests)
        .where(
          and(
            eq(refundRequests.paymentId, paymentId),
            inArray(refundRequests.status, [...REFUND_REQUEST_OPEN_STATUSES]),
          ),
        )
        .limit(1);
      return row ? mapRow(row) : null;
    },
    async insert(params) {
      const [row] = await db
        .insert(refundRequests)
        .values({
          paymentId: params.paymentId,
          bookingId: params.bookingId,
          amount: params.amount,
          currency: params.currency,
          reason: params.reason,
          requestedBy: params.requestedBy,
          status: params.status,
          requestVersion: 1,
          idempotencyKey: params.idempotencyKey,
          metadata: params.metadata,
        })
        .returning();
      return mapRow(row);
    },
    async findById(id) {
      const [row] = await db
        .select()
        .from(refundRequests)
        .where(eq(refundRequests.id, id))
        .limit(1);
      return row ? mapRow(row) : null;
    },
  };
}

/**
 * Create a RefundRequest. Does not mutate payment/earning/ledger or call gateway.
 */
export async function createRefundRequest(
  input: CreateRefundRequestInput,
  ports: RefundRequestPorts = createDrizzleRefundRequestPorts(),
): Promise<CreateRefundRequestResult> {
  const amount = normalizeAmount(input.amount);
  if (!amount) {
    return { kind: 'rejected', reason: 'INVALID_AMOUNT' };
  }

  const currency = normalizeCurrency(input.currency);
  if (!currency) {
    return { kind: 'rejected', reason: 'INVALID_CURRENCY' };
  }

  const status: RefundRequestOpenStatus =
    input.status === 'draft' ? 'draft' : 'pending';

  if (input.idempotencyKey) {
    const existingKey = await ports.findByIdempotencyKey(input.idempotencyKey);
    if (existingKey) {
      return { kind: 'idempotent', request: existingKey };
    }
  }

  const payment = await ports.findPayment(input.paymentId);
  if (!payment) {
    return { kind: 'rejected', reason: 'PAYMENT_NOT_FOUND' };
  }

  const bookingId =
    input.bookingId === undefined ? payment.bookingId : input.bookingId;

  if (
    bookingId != null &&
    payment.bookingId != null &&
    Number(bookingId) !== Number(payment.bookingId)
  ) {
    return {
      kind: 'rejected',
      reason: 'BOOKING_PAYMENT_MISMATCH',
      detail: 'bookingId does not match payment.bookingId',
    };
  }

  if (bookingId == null && payment.bookingId == null) {
    return { kind: 'rejected', reason: 'BOOKING_REQUIRED' };
  }

  const open = await ports.findOpenByPaymentId(payment.id);
  if (open) {
    return { kind: 'idempotent', request: open };
  }

  const snapshot = {
    policyVersion: 'C36-DD',
    paymentStatusAtRequest: payment.status,
    paymentAmountAtRequest: String(payment.amount),
    paymentCurrencyAtRequest: payment.currency,
    ...(input.metadata ?? {}),
  };

  try {
    const request = await ports.insert({
      paymentId: payment.id,
      bookingId: bookingId ?? payment.bookingId,
      amount,
      currency,
      reason: input.reason ?? null,
      requestedBy: input.requestedBy ?? null,
      status,
      idempotencyKey: input.idempotencyKey ?? null,
      metadata: snapshot,
    });
    return { kind: 'created', request };
  } catch (error) {
    const e = error as { code?: string; constraint?: string };
    if (e?.code === '23505') {
      const again =
        (input.idempotencyKey
          ? await ports.findByIdempotencyKey(input.idempotencyKey)
          : null) ?? (await ports.findOpenByPaymentId(payment.id));
      if (again) return { kind: 'idempotent', request: again };
    }
    throw error;
  }
}

export async function getRefundRequestById(
  id: string,
  ports: RefundRequestPorts = createDrizzleRefundRequestPorts(),
): Promise<RefundRequestRow | null> {
  return ports.findById(id);
}

/* ---------------------------------------------------------------------------
 * C36-DE-14 — TENANT RESOLUTION (read-only, no schema change).
 *
 * refund_requests deliberately has NO enterprise_id column. The tenant of a
 * RefundRequest is owned by the Payment it points at:
 *
 *     RefundRequest -> paymentId -> Payment -> payment.enterpriseId
 *
 * This resolver lives on the service/port side on purpose: the HTTP layer stays
 * an adapter and never touches the database directly.
 *
 * Result contract (deliberately coarse on purpose):
 *   - 'ok'         → the request exists and its payment tenant is known
 *   - 'unknown'    → request OR payment not found, or payment has no tenant
 * The caller cannot distinguish "no such refund request" from "no such payment",
 * which is what keeps cross-tenant existence from leaking through error shape.
 * ------------------------------------------------------------------------- */

export type RefundRequestTenantResolution =
  | { kind: 'ok'; enterpriseId: string }
  | { kind: 'unknown' };

export async function resolveRefundRequestTenant(
  id: string,
  ports: RefundRequestPorts = createDrizzleRefundRequestPorts(),
): Promise<RefundRequestTenantResolution> {
  const request = await ports.findById(id);
  if (!request) return { kind: 'unknown' };

  const payment = await ports.findPayment(request.paymentId);
  if (!payment || !payment.enterpriseId) return { kind: 'unknown' };

  return { kind: 'ok', enterpriseId: payment.enterpriseId };
}

/**
 * Tenant check for CREATE: the target Payment must belong to the caller's tenant.
 * `paymentId` is validated (shape + existence + tenant) BEFORE a RefundRequest
 * is created, so a cross-tenant target never produces a row.
 */
export async function assertPaymentTenant(
  paymentId: string,
  authenticatedEnterpriseId: string | null | undefined,
  ports: RefundRequestPorts = createDrizzleRefundRequestPorts(),
): Promise<RefundRequestTenantResolution> {
  if (typeof authenticatedEnterpriseId !== 'string' || !authenticatedEnterpriseId) {
    // No tenant in the authenticated principal ⇒ refuse, never guess.
    return { kind: 'unknown' };
  }

  const payment = await ports.findPayment(paymentId);
  if (!payment || !payment.enterpriseId) return { kind: 'unknown' };
  if (payment.enterpriseId !== authenticatedEnterpriseId) return { kind: 'unknown' };

  return { kind: 'ok', enterpriseId: payment.enterpriseId };
}

// ---------------------------------------------------------------------------
// C36-DE — DECISION domain (approve / reject / under_review).
// Approval ONLY: never calls refund execution, gateway, earnings, ledger or payout.
// ---------------------------------------------------------------------------

export type ApplyDecisionParams = {
  requestId: string;
  actorId: number;
  target: RefundDecisionTarget;
  expectedStatus: RefundRequestStatus;
  expectedVersion: number;
  reason: string | null;
};

export type ApplyDecisionOutcome =
  | { kind: 'applied'; request: RefundRequestRow }
  | { kind: 'version_conflict' };

/**
 * Decision port surface, deliberately separate from RefundRequestPorts: the decision
 * use case depends on a compare-and-set write, not on the creation surface.
 */
export type RefundDecisionPorts = {
  findById(id: string): Promise<RefundRequestRow | null>;
  applyDecision(params: ApplyDecisionParams): Promise<ApplyDecisionOutcome>;
};

export type RefundDecisionFailure =
  | 'ACTOR_REQUIRED'
  | 'ROLE_NOT_ALLOWED'
  | 'REASON_REQUIRED'
  | 'NOT_FOUND'
  | 'REQUESTER_UNKNOWN'
  | 'SEGREGATION_OF_DUTIES'
  | 'INVALID_TRANSITION'
  | 'VERSION_CONFLICT';

/** Error contract for the decision endpoints (consumed by the HTTP slice). */
export const REFUND_DECISION_HTTP_STATUS: Record<RefundDecisionFailure, number> = {
  ACTOR_REQUIRED: 401,
  ROLE_NOT_ALLOWED: 403,
  REASON_REQUIRED: 422,
  NOT_FOUND: 404,
  REQUESTER_UNKNOWN: 403,
  SEGREGATION_OF_DUTIES: 403,
  INVALID_TRANSITION: 409,
  VERSION_CONFLICT: 409,
};

export type DecideRefundRequestInput = {
  requestId: string;
  /** Authenticated actor id — never sourced from the request body. */
  actorId: number;
  /** Authenticated actor role — RBAC is enforced in the domain, not only at the edge. */
  actorRole: string | null;
  target: RefundDecisionTarget;
  /** Optional optimistic-lock token from the caller. Stale ⇒ 409. */
  expectedVersion?: number;
  reason?: string | null;
};

export type DecideRefundRequestResult =
  | { kind: 'applied'; request: RefundRequestRow }
  | { kind: 'idempotent'; request: RefundRequestRow }
  | { kind: 'rejected'; reason: RefundDecisionFailure; detail?: string };

/**
 * Transactional CAS + append-only audit as a single unit of work.
 * The decision row is inserted in the SAME transaction: if the audit insert fails,
 * the status change rolls back (never "decided without a trail", never the reverse).
 */
export function createDrizzleRefundDecisionPorts(): RefundDecisionPorts {
  return {
    async findById(id) {
      const [row] = await db
        .select()
        .from(refundRequests)
        .where(eq(refundRequests.id, id))
        .limit(1);
      return row ? mapRow(row) : null;
    },
    async applyDecision(params) {
      return db.transaction(async (tx): Promise<ApplyDecisionOutcome> => {
        const [updated] = await tx
          .update(refundRequests)
          .set({
            status: params.target,
            requestVersion: sql`${refundRequests.requestVersion} + 1`,
            decidedBy: params.actorId,
            decidedAt: sql`now()`,
            decisionReason: params.reason,
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(refundRequests.id, params.requestId),
              eq(refundRequests.status, params.expectedStatus),
              eq(refundRequests.requestVersion, params.expectedVersion),
            ),
          )
          .returning();

        if (!updated) {
          return { kind: 'version_conflict' };
        }

        await tx.insert(refundRequestDecisions).values({
          refundRequestId: updated.id,
          fromStatus: params.expectedStatus,
          toStatus: params.target,
          decidedBy: params.actorId,
          requestVersion: updated.requestVersion,
          decisionReason: params.reason,
        });

        return { kind: 'applied', request: mapRow(updated) };
      });
    },
  };
}

/**
 * Decide a RefundRequest: approve / reject / send to review.
 *
 * Guarantee order:
 *  1. authenticated identity + local RBAC (admin | manager; supervisor is NOT granted)
 *  2. reject requires a reason (422)
 *  3. segregation of duties: the requester can never decide their own request
 *  4. replay of the same decision ⇒ current state, no second mutation
 *  5. state machine: invalid transitions are refused
 *  6. CAS on (status, request_version) with atomic version increment + atomic audit
 *
 * Never executes money movement: no gateway, no refund, no earnings/ledger/payout.
 */
export async function decideRefundRequest(
  input: DecideRefundRequestInput,
  ports: RefundDecisionPorts = createDrizzleRefundDecisionPorts(),
): Promise<DecideRefundRequestResult> {
  if (typeof input.actorId !== 'number' || !Number.isFinite(input.actorId)) {
    return { kind: 'rejected', reason: 'ACTOR_REQUIRED' };
  }

  if (!canDecideRefundRequest(input.actorRole)) {
    return {
      kind: 'rejected',
      reason: 'ROLE_NOT_ALLOWED',
      detail: `role '${String(input.actorRole)}' cannot decide refund requests`,
    };
  }

  const reason =
    typeof input.reason === 'string' && input.reason.trim() ? input.reason.trim() : null;
  if (input.target === 'rejected' && !reason) {
    return {
      kind: 'rejected',
      reason: 'REASON_REQUIRED',
      detail: 'decision_reason is mandatory for rejected',
    };
  }

  const current = await ports.findById(input.requestId);
  if (!current) {
    return { kind: 'rejected', reason: 'NOT_FOUND' };
  }

  if (current.requestedBy == null) {
    return {
      kind: 'rejected',
      reason: 'REQUESTER_UNKNOWN',
      detail: 'requested_by is not set; segregation of duties cannot be proven',
    };
  }
  if (current.requestedBy === input.actorId) {
    return {
      kind: 'rejected',
      reason: 'SEGREGATION_OF_DUTIES',
      detail: 'the requester cannot decide their own refund request',
    };
  }

  // Replay of the same decision: report the current state, never mutate twice.
  if (current.status === input.target) {
    return { kind: 'idempotent', request: current };
  }

  if (!transicaoPermitida(current.status, input.target)) {
    return {
      kind: 'rejected',
      reason: 'INVALID_TRANSITION',
      detail: `${current.status} -> ${input.target}`,
    };
  }

  const expectedStatus = current.status as RefundRequestStatus;
  const expectedVersion = input.expectedVersion ?? current.requestVersion;

  const outcome = await ports.applyDecision({
    requestId: current.id,
    actorId: input.actorId,
    target: input.target,
    expectedStatus,
    expectedVersion,
    reason,
  });

  if (outcome.kind === 'applied') {
    return { kind: 'applied', request: outcome.request };
  }

  // Zero rows: the status/version moved, or another actor already reached the same
  // target. Same target ⇒ replay; anything else ⇒ genuine conflict.
  const after = await ports.findById(current.id);
  if (after && after.status === input.target) {
    return { kind: 'idempotent', request: after };
  }
  return {
    kind: 'rejected',
    reason: 'VERSION_CONFLICT',
    detail: `expected status=${expectedStatus} version=${expectedVersion}`,
  };
}
