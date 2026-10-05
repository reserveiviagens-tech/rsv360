/**
 * C36-DE-06 — RefundRequest EXECUTION HTTP surface (POST /:id/execute).
 *
 * This file is a THIN translation layer. It only:
 *   1. authenticates — identity comes exclusively from the authenticated session;
 *   2. validates the path id and the optional optimistic-lock token;
 *   3. invokes the execution use case through its composition root;
 *   4. maps domain outcomes onto the explicit HTTP contract exported below.
 *
 * Every execution rule (local RBAC, state machine, claim CAS, provider call,
 * receipt, idempotency) lives in executeRefundRequest(). Nothing here may
 * re-implement, duplicate or bypass it, and nothing here touches money: no
 * database write, no provider call, no financial writer — those are reached
 * only through the injected collaborators.
 *
 * It lives in its own file on purpose. `refund-request.routes.ts` (request +
 * decisions, C36-DD / C36-DE-05) must stay free of `/execute`, and a static
 * test still enforces that invariant.
 */

import type { Request, Response } from 'express';
import { Router } from 'express';
import { createProductionExecutionDeps } from '../services/refund-request-execution.deps';
import {
  executeRefundRequest,
  type ExecuteRefundRequestResult,
  type RefundExecutionDeps,
  type RefundExecutionFailure,
} from '../services/refund-request-execution.service';

const router = Router();

/* ─────────────────────────────────────────────────────────────────────────
 * 1. EXPLICIT HTTP ERROR CONTRACT (pure data, exported, drift-tested)
 * ───────────────────────────────────────────────────────────────────────── */

export type RefundExecutionHttpError = {
  status: number;
  code: string;
};

export const REFUND_EXECUTION_HTTP_CONTRACT: Record<
  RefundExecutionFailure,
  RefundExecutionHttpError
> = {
  ACTOR_REQUIRED: { status: 401, code: 'UNAUTHENTICATED' },
  ROLE_NOT_ALLOWED: { status: 403, code: 'ROLE_NOT_ALLOWED' },
  NOT_FOUND: { status: 404, code: 'NOT_FOUND' },
  INVALID_TRANSITION: { status: 409, code: 'INVALID_TRANSITION' },
  VERSION_CONFLICT: { status: 409, code: 'VERSION_CONFLICT' },
  EXECUTION_IN_PROGRESS: { status: 409, code: 'EXECUTION_IN_PROGRESS' },
  ALREADY_FAILED: { status: 409, code: 'ALREADY_FAILED' },
};

/** Outcomes produced by the HTTP edge itself (never by the domain). */
export const REFUND_EXECUTION_HTTP_EDGE = {
  UNAUTHENTICATED: { status: 401, code: 'UNAUTHENTICATED' },
  /** Malformed path id — refused before it can reach the database. */
  INVALID_REQUEST_ID: { status: 404, code: 'NOT_FOUND' },
  INTERNAL_ERROR: { status: 500, code: 'INTERNAL_ERROR' },
} as const;

/* ─────────────────────────────────────────────────────────────────────────
 * 2. DOMAIN INTEGRATION (transport-agnostic: no express types here)
 * ───────────────────────────────────────────────────────────────────────── */

export type RefundExecutionHttpRequest = {
  requestId: string;
  /** Authenticated actor id — never sourced from the request body. */
  actorId: number;
  /** Authenticated actor role — RBAC is enforced inside the domain. */
  actorRole: string | null;
  /** Optional optimistic-lock token; absent = rely on a fresh read. */
  expectedVersion?: number;
};

export type RefundExecutionHttpResponse = {
  status: number;
  body: Record<string, unknown>;
};

function respond(result: ExecuteRefundRequestResult): RefundExecutionHttpResponse {
  if (result.kind === 'rejected') {
    const mapped = REFUND_EXECUTION_HTTP_CONTRACT[result.reason];
    return {
      status: mapped.status,
      body: result.detail
        ? { success: false, error: mapped.code, detail: result.detail }
        : { success: false, error: mapped.code },
    };
  }

  switch (result.kind) {
    case 'executed':
      return {
        status: 200,
        body: { success: true, kind: 'executed', data: result.request, receipt: result.receipt },
      };
    case 'idempotent':
      // Replay shares the 200 envelope: a repeated execution of an already
      // executed request is indistinguishable from the first one to clients.
      return { status: 200, body: { success: true, kind: 'idempotent', data: result.request } };
    case 'failed':
      return {
        status: 409,
        body: { success: false, error: 'EXECUTION_FAILED', detail: result.detail },
      };
    case 'retry_required':
      // Provider accepted, financial update still pending: 202 tells the
      // caller the request continues, and a retry resumes it safely.
      return {
        status: 202,
        body: {
          success: true,
          kind: 'retry_required',
          data: result.request,
          detail: result.detail,
        },
      };
    default:
      return { status: 500, body: { success: false, error: 'INTERNAL_ERROR' } };
  }
}

export async function runRefundExecution(
  input: RefundExecutionHttpRequest,
  deps: RefundExecutionDeps = createProductionExecutionDeps(),
): Promise<RefundExecutionHttpResponse> {
  const result = await executeRefundRequest(
    {
      requestId: input.requestId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      expectedVersion: input.expectedVersion,
    },
    deps,
  );
  return respond(result);
}

/* ─────────────────────────────────────────────────────────────────────────
 * 3. HTTP EDGE (thin) — parse, guard, translate. No business rules here.
 * ───────────────────────────────────────────────────────────────────────── */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Identity comes exclusively from the authenticated session. */
function readActor(req: Request): number | null {
  const actorId = req.user?.id;
  return typeof actorId === 'number' && Number.isFinite(actorId) ? actorId : null;
}

/** Malformed tokens are ignored rather than coerced. */
function readExpectedVersion(body: Record<string, unknown>): number | undefined {
  const raw = body.expectedVersion;
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 ? raw : undefined;
}

router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const actorId = readActor(req);
    if (actorId === null) {
      const edge = REFUND_EXECUTION_HTTP_EDGE.UNAUTHENTICATED;
      return res.status(edge.status).json({ success: false, error: edge.code });
    }

    const requestId = String(req.params.id ?? '').trim();
    if (!UUID_PATTERN.test(requestId)) {
      const edge = REFUND_EXECUTION_HTTP_EDGE.INVALID_REQUEST_ID;
      return res.status(edge.status).json({ success: false, error: edge.code });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const outcome = await runRefundExecution({
      requestId,
      actorId,
      actorRole: req.user?.role ?? null,
      expectedVersion: readExpectedVersion(body),
    });

    return res.status(outcome.status).json(outcome.body);
  } catch {
    // Never expose stack traces, SQL, driver errors, connection or file paths.
    const edge = REFUND_EXECUTION_HTTP_EDGE.INTERNAL_ERROR;
    return res.status(edge.status).json({ success: false, error: edge.code });
  }
});

export default router;

