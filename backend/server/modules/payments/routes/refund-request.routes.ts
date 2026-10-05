/**
 * C36-DE-05 — RefundRequest decision HTTP surface (approve / reject).
 *
 * This file is a THIN translation layer. It only:
 *   1. authenticates — identity comes exclusively from the authenticated session;
 *   2. validates path / body parameters;
 *   3. invokes the decision use case;
 *   4. maps domain outcomes onto the explicit HTTP contract exported below.
 *
 * Every decision rule (local RBAC, segregation of duties, state machine, reason
 * validation, compare-and-set / idempotency) lives in decideRefundRequest().
 * Nothing here may re-implement, duplicate or bypass it.
 *
 * No provider execution and no money-movement endpoints (separate later gate).
 *
 * Existing request-only routes (POST /, GET /:id) are preserved untouched.
 */

import type { Request, Response } from 'express';
import { Router } from 'express';
import type { RefundDecisionTarget } from '../lib/refund-request-state';
import {
  assertPaymentTenant,
  createRefundRequest,
  decideRefundRequest,
  getRefundRequestById,
  resolveRefundRequestTenant,
  type RefundDecisionFailure,
} from '../services/refund-request.service';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const body = req.body ?? {};
    // C36-DE SoD: requester identity comes exclusively from the authenticated session.
    const actorId = req.user?.id;
    if (typeof actorId !== 'number' || !Number.isFinite(actorId)) {
      return res.status(401).json({ success: false, error: 'UNAUTHENTICATED' });
    }

    // C36-DE-14 — tenant isolation. The caller never declares its own tenant:
    // body.enterpriseId / query / headers are ignored entirely.
    const callerTenant = readCallerEnterpriseId(req);
    if (callerTenant === null) {
      return res.status(403).json({ success: false, error: 'TENANT_ISOLATION' });
    }

    const paymentId = String(body.paymentId ?? body.payment_id ?? '').trim();
    if (!UUID_PATTERN.test(paymentId)) {
      return res.status(400).json({ success: false, error: 'INVALID_PAYMENT_ID' });
    }

    // The target Payment must belong to the caller's tenant BEFORE any insert,
    // so a cross-tenant target can never produce a RefundRequest row.
    const paymentTenant = await assertPaymentTenant(paymentId, callerTenant);
    if (paymentTenant.kind !== 'ok') {
      // Same generic shape as a non-existent payment: no existence oracle.
      return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    }

    // `status` is NOT client-controlled beyond the two open statuses the domain
    // accepts; `idempotencyKey` here is the RefundRequest-scoped creation key and
    // is never a provider/execution idempotency key (those stay server-owned).
    const result = await createRefundRequest({
      paymentId,
      bookingId:
        body.bookingId != null
          ? Number(body.bookingId)
          : body.booking_id != null
            ? Number(body.booking_id)
            : undefined,
      amount: body.amount,
      currency: body.currency,
      reason: body.reason ?? null,
      requestedBy: actorId,
      status: body.status === 'draft' ? 'draft' : 'pending',
      idempotencyKey: body.idempotencyKey ?? body.idempotency_key ?? null,
      metadata: body.metadata ?? null,
    });

    if (result.kind === 'rejected') {
      return res.status(400).json({
        success: false,
        error: result.reason,
        detail: result.detail,
      });
    }

    const statusCode = result.kind === 'created' ? 201 : 200;
    return res.status(statusCode).json({
      success: true,
      kind: result.kind,
      data: result.request,
    });
  } catch {
    // Never expose stack traces, SQL, driver errors or connection strings.
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    // C36-DE-14 — tenant isolation: identity comes exclusively from the JWT
    // principal. Body / query / params / headers are never a tenant source.
    const requestId = String(req.params.id ?? '').trim();
    if (!UUID_PATTERN.test(requestId)) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    }

    const callerTenant = readCallerEnterpriseId(req);
    if (callerTenant === null) {
      return res.status(403).json({ success: false, error: 'TENANT_ISOLATION' });
    }

    // RefundRequest -> paymentId -> Payment -> payment.enterpriseId.
    // A cross-tenant id yields the SAME response as a non-existent id, so
    // existence of another tenant's resource is never disclosed.
    const tenant = await resolveRefundRequestTenant(requestId);
    if (tenant.kind !== 'ok' || tenant.enterpriseId !== callerTenant) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    }

    const row = await getRefundRequestById(requestId);
    if (!row) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND' });
    }
    return res.json({ success: true, data: row });
  } catch {
    // Never expose stack traces, SQL, driver errors or connection strings.
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR' });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * 1. EXPLICIT HTTP ERROR CONTRACT (pure data, exported, drift-tested)
 *
 * Domain failure -> HTTP status + stable error code.
 *
 * Statuses are literal on purpose: the contract must be readable on its own.
 * A unit test asserts this table never drifts from the service-side
 * `REFUND_DECISION_HTTP_STATUS` map — the domain stays the authority, and the
 * `Record<RefundDecisionFailure, …>` annotation makes a new domain failure a
 * compile error here until the HTTP mapping is consciously added.
 * ───────────────────────────────────────────────────────────────────────── */

export type RefundDecisionHttpError = {
  /** HTTP status returned for this outcome. */
  status: number;
  /** Stable machine-readable code returned in `error`. */
  code: string;
};

export const REFUND_DECISION_HTTP_CONTRACT: Record<
  RefundDecisionFailure,
  RefundDecisionHttpError
> = {
  ACTOR_REQUIRED: { status: 401, code: 'UNAUTHENTICATED' },
  ROLE_NOT_ALLOWED: { status: 403, code: 'ROLE_NOT_ALLOWED' },
  REQUESTER_UNKNOWN: { status: 403, code: 'REQUESTER_UNKNOWN' },
  SEGREGATION_OF_DUTIES: { status: 403, code: 'SEGREGATION_OF_DUTIES' },
  NOT_FOUND: { status: 404, code: 'NOT_FOUND' },
  INVALID_TRANSITION: { status: 409, code: 'INVALID_TRANSITION' },
  VERSION_CONFLICT: { status: 409, code: 'VERSION_CONFLICT' },
  REASON_REQUIRED: { status: 422, code: 'REASON_REQUIRED' },
};

/** Outcomes produced by the HTTP edge itself (never by the domain). */
export const REFUND_DECISION_HTTP_EDGE = {
  UNAUTHENTICATED: { status: 401, code: 'UNAUTHENTICATED' },
  /** Malformed path id — refused before it can reach the database. */
  INVALID_REQUEST_ID: { status: 404, code: 'NOT_FOUND' },
  /**
   * C36-DE-14 — the authenticated principal carries no usable tenant, or the
   * resource belongs to another enterprise. Generic on purpose: it must not
   * reveal whether another tenant's resource exists.
   */
  TENANT_ISOLATION: { status: 403, code: 'TENANT_ISOLATION' },
  INTERNAL_ERROR: { status: 500, code: 'INTERNAL_ERROR' },
} as const;

/* ─────────────────────────────────────────────────────────────────────────
 * 2. DOMAIN INTEGRATION (the only place this slice talks to the domain)
 *
 * Section 2 is transport-agnostic: no express types, no `req` / `res`, no
 * headers — only the explicit contract produced above.
 * ───────────────────────────────────────────────────────────────────────── */

export type RefundDecisionHttpRequest = {
  requestId: string;
  /** Authenticated actor id — never sourced from the request body. */
  actorId: number;
  /** Authenticated actor role — RBAC is enforced inside the domain. */
  actorRole: string | null;
  /** Fixed by the route definition, never accepted from the client. */
  target: RefundDecisionTarget;
  /** Raw reason; trim / non-empty rules belong to the domain. */
  reason: string | null;
  /** Optional optimistic-lock token; absent = rely on a fresh read. */
  expectedVersion?: number;
};

export type RefundDecisionHttpResponse = {
  status: number;
  body: Record<string, unknown>;
};

async function runRefundDecision(
  input: RefundDecisionHttpRequest,
): Promise<RefundDecisionHttpResponse> {
  const result = await decideRefundRequest({
    requestId: input.requestId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    target: input.target,
    reason: input.reason,
    expectedVersion: input.expectedVersion,
  });

  if (result.kind === 'rejected') {
    const mapped = REFUND_DECISION_HTTP_CONTRACT[result.reason];
    return {
      status: mapped.status,
      body: result.detail
        ? { success: false, error: mapped.code, detail: result.detail }
        : { success: false, error: mapped.code },
    };
  }

  // `applied` (200) and idempotent replay (200) share the same envelope, so a
  // replayed decision is indistinguishable from a first application to clients.
  return {
    status: 200,
    body: { success: true, kind: result.kind, data: result.request },
  };
}

/* ─────────────────────────────────────────────────────────────────────────
 * 3. HTTP EDGE (thin) — parse, guard, translate. No business rules here.
 * ───────────────────────────────────────────────────────────────────────── */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * C36-DE-14 — authenticated tenant, read ONLY from the JWT-derived principal.
 *
 * Never from body / query / params / headers. Returns null when the principal
 * carries no usable tenant, which callers must treat as "refuse", never as
 * "same tenant" and never as "superuser".
 */
function readCallerEnterpriseId(req: Request): string | null {
  const raw = req.user?.enterpriseId;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  return null;
}

/** Identity comes exclusively from the authenticated session. */
function readActor(req: Request): number | null {
  const actorId = req.user?.id;
  return typeof actorId === 'number' && Number.isFinite(actorId) ? actorId : null;
}

/**
 * Reads ONLY `reason`. Trim / non-empty validation is deliberately not
 * duplicated here: the domain is the authority for the 422 rule. A non-string
 * payload is normalised to `null` so an invalid body can never masquerade as a
 * reason.
 */
function readReason(body: Record<string, unknown>): string | null {
  return typeof body.reason === 'string' ? body.reason : null;
}

/**
 * Optional optimistic-lock token. Anything that is not a positive integer is
 * ignored rather than coerced, so a malformed token can neither invent nor
 * weaken a lock.
 */
function readExpectedVersion(body: Record<string, unknown>): number | undefined {
  const raw = body.expectedVersion;
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 1
    ? raw
    : undefined;
}

function decisionHandler(target: RefundDecisionTarget) {
  return async (req: Request, res: Response) => {
    try {
      // 1. Authentication — 401 when there is no authenticated actor.
      const actorId = readActor(req);
      if (actorId === null) {
        const edge = REFUND_DECISION_HTTP_EDGE.UNAUTHENTICATED;
        return res.status(edge.status).json({ success: false, error: edge.code });
      }

      // 2. Parameter validation — a malformed id never reaches the database.
      const requestId = String(req.params.id ?? '').trim();
      if (!UUID_PATTERN.test(requestId)) {
        const edge = REFUND_DECISION_HTTP_EDGE.INVALID_REQUEST_ID;
        return res.status(edge.status).json({ success: false, error: edge.code });
      }

      // 3. Tenant isolation (C36-DE-14) — RefundRequest -> payment -> enterpriseId.
      //    Runs BEFORE the domain so a cross-tenant decision never reaches CAS.
      const callerTenant = readCallerEnterpriseId(req);
      if (callerTenant === null) {
        const edge = REFUND_DECISION_HTTP_EDGE.TENANT_ISOLATION;
        return res.status(edge.status).json({ success: false, error: edge.code });
      }

      const tenant = await resolveRefundRequestTenant(requestId);
      if (tenant.kind !== 'ok' || tenant.enterpriseId !== callerTenant) {
        // Identical to a genuinely absent id: no cross-tenant existence oracle.
        const edge = REFUND_DECISION_HTTP_EDGE.INVALID_REQUEST_ID;
        return res.status(edge.status).json({ success: false, error: edge.code });
      }

      // 4. Domain integration — `target` is fixed by this route, never by the body.
      const body = (req.body ?? {}) as Record<string, unknown>;
      const outcome = await runRefundDecision({
        requestId,
        actorId,
        actorRole: req.user?.role ?? null,
        target,
        reason: target === 'rejected' ? readReason(body) : null,
        expectedVersion: readExpectedVersion(body),
      });

      return res.status(outcome.status).json(outcome.body);
    } catch {
      // Never expose stack traces, SQL, driver errors, connection or file paths.
      const edge = REFUND_DECISION_HTTP_EDGE.INTERNAL_ERROR;
      return res.status(edge.status).json({ success: false, error: edge.code });
    }
  };
}

/* ─────────────────────────────────────────────────────────────────────────
 * 4. ROUTES — C36-DE-05 adds only approve / reject.
 * `target` is bound here: the client can never choose an arbitrary state.
 * ───────────────────────────────────────────────────────────────────────── */

router.post('/:id/approve', decisionHandler('approved'));
router.post('/:id/reject', decisionHandler('rejected'));

export default router;
