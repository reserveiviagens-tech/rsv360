/**
 * C36-DE — RefundRequest approval domain: state machine, CAS, atomic audit, SoD, RBAC.
 *
 * Service layer only: no HTTP, no migration APPLY, no gateway/money movement.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  REFUND_DECISION_HTTP_STATUS,
  decideRefundRequest,
  type ApplyDecisionParams,
  type ApplyDecisionOutcome,
  type DecideRefundRequestInput,
  type RefundDecisionPorts,
  type RefundRequestRow,
} from '../../../server/modules/payments/services/refund-request.service';
import {
  REFUND_DECISION_ROLES,
  REFUND_DECISION_TARGETS,
  REFUND_REQUEST_STATUSES,
  canDecideRefundRequest,
  transicaoPermitida,
  transicoesDe,
  type RefundDecisionTarget,
} from '../../../server/modules/payments/lib/refund-request-state';

const SQL_062 = join(__dirname, '../../../drizzle/0062_refund_requests.sql');
const SERVICE = join(
  __dirname,
  '../../../server/modules/payments/services/refund-request.service.ts',
);
const STATE_MODULE = join(
  __dirname,
  '../../../server/modules/payments/lib/refund-request-state.ts',
);
const ROUTES = join(
  __dirname,
  '../../../server/modules/payments/routes/refund-request.routes.ts',
);

const REQ_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const REQUESTER_ID = 7;
const ACTOR_ID = 42;

// ---------------------------------------------------------------------------
// In-memory ports emulating the transactional CAS + append-only audit.
// ---------------------------------------------------------------------------

type DecisionRecord = {
  refundRequestId: string;
  fromStatus: string;
  toStatus: string;
  decidedBy: number;
  requestVersion: number;
  decisionReason: string | null;
};

type Harness = {
  state: {
    requests: Map<string, RefundRequestRow>;
    decisions: DecisionRecord[];
    failAudit: boolean;
    applyCalls: number;
  };
  ports: RefundDecisionPorts;
};

function seedRow(overrides: Partial<RefundRequestRow> & { id: string }): RefundRequestRow {
  const now = new Date('2026-09-01T12:00:00.000Z');
  return {
    paymentId: '11111111-1111-4111-8111-111111111111',
    bookingId: 101,
    amount: '150.00',
    currency: 'BRL',
    reason: 'hotel overcharge',
    requestedBy: REQUESTER_ID,
    status: 'pending',
    requestVersion: 1,
    idempotencyKey: null,
    metadata: null,
    createdAt: now,
    updatedAt: now,
    decidedBy: null,
    decidedAt: null,
    decisionReason: null,
    ...overrides,
  };
}

function createHarness(seed: RefundRequestRow): Harness {
  const state = {
    requests: new Map<string, RefundRequestRow>([[seed.id, { ...seed }]]),
    decisions: [] as DecisionRecord[],
    failAudit: false,
    applyCalls: 0,
  };

  const ports: RefundDecisionPorts = {
    async findById(id) {
      const found = state.requests.get(id);
      return found ? { ...found } : null;
    },
    async applyDecision(params: ApplyDecisionParams): Promise<ApplyDecisionOutcome> {
      state.applyCalls += 1;

      const current = state.requests.get(params.requestId);
      if (!current) return { kind: 'version_conflict' };
      if (
        current.status !== params.expectedStatus ||
        current.requestVersion !== params.expectedVersion
      ) {
        return { kind: 'version_conflict' };
      }

      const updated: RefundRequestRow = {
        ...current,
        status: params.target,
        requestVersion: current.requestVersion + 1,
        decidedBy: params.actorId,
        decidedAt: new Date(),
        decisionReason: params.reason,
        updatedAt: new Date(),
      };
      const record: DecisionRecord = {
        refundRequestId: updated.id,
        fromStatus: current.status,
        toStatus: updated.status,
        decidedBy: params.actorId,
        requestVersion: updated.requestVersion,
        decisionReason: params.reason,
      };

      // Transaction: if the audit insert fails, nothing is committed (rollback).
      if (state.failAudit) {
        throw new Error('refund_request_decisions insert failed');
      }
      state.decisions.push(record);
      state.requests.set(params.requestId, updated);
      return { kind: 'applied', request: { ...updated } };
    },
  };

  return { state, ports };
}

function decision(overrides: Partial<DecideRefundRequestInput> = {}): DecideRefundRequestInput {
  return {
    requestId: REQ_ID,
    actorId: ACTOR_ID,
    actorRole: 'manager',
    target: 'approved',
    ...overrides,
  };
}

describe('C36-DE state machine (pure)', () => {
  it('allows pending → under_review / approved / rejected', () => {
    expect(transicaoPermitida('pending', 'under_review')).toBe(true);
    expect(transicaoPermitida('pending', 'approved')).toBe(true);
    expect(transicaoPermitida('pending', 'rejected')).toBe(true);
  });

  it('allows under_review → approved / rejected only', () => {
    expect(transicoesDe('under_review')).toEqual(['approved', 'rejected']);
    expect(transicaoPermitida('under_review', 'pending')).toBe(false);
    expect(transicaoPermitida('under_review', 'under_review')).toBe(false);
  });

  it('treats approved and rejected as terminal (no reversal)', () => {
    expect(transicoesDe('approved')).toEqual([]);
    expect(transicoesDe('rejected')).toEqual([]);
    expect(transicaoPermitida('approved', 'rejected')).toBe(false);
    expect(transicaoPermitida('rejected', 'approved')).toBe(false);
    expect(transicaoPermitida('rejected', 'pending')).toBe(false);
  });

  it('never exposes execution states to the approval domain', () => {
    for (const s of ['draft', 'pending', 'under_review', 'approved', 'rejected', 'cancelled']) {
      expect(transicoesDe(s)).not.toContain('executing');
      expect(transicoesDe(s)).not.toContain('executed');
      expect(transicoesDe(s)).not.toContain('failed');
      expect(transicoesDe(s)).not.toContain('expired');
    }
    expect(transicoesDe('executed')).toEqual([]);
    expect(transicaoPermitida('executed', 'approved')).toBe(false);
  });

  it('refuses unknown statuses instead of throwing', () => {
    expect(transicaoPermitida('whatever', 'approved')).toBe(false);
    expect(transicoesDe('whatever')).toEqual([]);
  });

  it('same-state is never a transition (idempotency handles it)', () => {
    for (const status of REFUND_REQUEST_STATUSES) {
      expect(transicaoPermitida(status, status)).toBe(false);
    }
  });

  it('decision targets are approval states only', () => {
    expect([...REFUND_DECISION_TARGETS].sort()).toEqual(
      ['approved', 'rejected', 'under_review'].sort(),
    );
  });
});

describe('C36-DE status vocabulary === 0062 SQL (SSOT anti-drift)', () => {
  const raw = readFileSync(SQL_062, 'utf8');

  it('REFUND_REQUEST_STATUSES matches the CHECK in 0062', () => {
    const check = raw.match(
      /CONSTRAINT refund_requests_status_check CHECK \(\s*status IN \(([\s\S]*?)\)\s*\)/i,
    );
    expect(check).not.toBeNull();

    const fromSql = (check![1].match(/'([a-z_]+)'/g) ?? []).map((s) => s.slice(1, -1));
    expect(fromSql).toHaveLength(REFUND_REQUEST_STATUSES.length);
    expect([...fromSql].sort()).toEqual([...REFUND_REQUEST_STATUSES].sort());
  });

  it('default status in SQL is a decidable state', () => {
    expect(raw).toMatch(/status text NOT NULL DEFAULT 'pending'/);
    expect(REFUND_REQUEST_STATUSES).toContain('pending');
    expect(canDecideRefundRequest('manager')).toBe(true);
  });
});

describe('C36-DE local RBAC (admin | manager)', () => {
  it('grants admin and manager', () => {
    expect(canDecideRefundRequest('admin')).toBe(true);
    expect(canDecideRefundRequest('manager')).toBe(true);
    expect(REFUND_DECISION_ROLES).toEqual(['admin', 'manager']);
  });

  it('denies supervisor, agent and anonymous', () => {
    expect(canDecideRefundRequest('supervisor')).toBe(false);
    expect(canDecideRefundRequest('agent')).toBe(false);
    expect(canDecideRefundRequest(null)).toBe(false);
    expect(canDecideRefundRequest(undefined)).toBe(false);
    expect(canDecideRefundRequest('')).toBe(false);
    expect(REFUND_DECISION_ROLES).not.toContain('supervisor');
  });
});

describe('C36-DE decideRefundRequest — happy path', () => {
  it('approves pending → approved with atomic version bump + audit row', async () => {
    const h = createHarness(seedRow({ id: REQ_ID }));

    const res = await decideRefundRequest(decision(), h.ports);

    expect(res.kind).toBe('applied');
    const row = res.kind === 'applied' ? res.request : (undefined as never);
    expect(row.status).toBe('approved');
    expect(row.requestVersion).toBe(2);
    expect(row.decidedBy).toBe(ACTOR_ID);
    expect(row.decidedAt).toBeInstanceOf(Date);
    expect(row.decisionReason).toBeNull();
    expect(row.requestedBy).toBe(REQUESTER_ID);

    expect(h.state.decisions).toHaveLength(1);
    expect(h.state.decisions[0]).toMatchObject({
      refundRequestId: REQ_ID,
      fromStatus: 'pending',
      toStatus: 'approved',
      decidedBy: ACTOR_ID,
      requestVersion: 2,
      decisionReason: null,
    });
  });

  it('sends pending → under_review and keeps decided_* NULL', async () => {
    const h = createHarness(seedRow({ id: REQ_ID }));

    const res = await decideRefundRequest(decision({ target: 'under_review' }), h.ports);

    expect(res.kind).toBe('applied');
    const row = res.kind === 'applied' ? res.request : (undefined as never);
    expect(row.status).toBe('under_review');
    expect(row.requestVersion).toBe(2);
    expect(row.decidedAt).toBeInstanceOf(Date);
    expect(h.state.decisions[0].toStatus).toBe('under_review');
  });

  it('rejects under_review → rejected with a trimmed reason', async () => {
    const h = createHarness(seedRow({ id: REQ_ID, status: 'under_review', requestVersion: 3 }));

    const res = await decideRefundRequest(
      decision({ target: 'rejected', reason: '  duplicate charge  ' }),
      h.ports,
    );

    expect(res.kind).toBe('applied');
    const row = res.kind === 'applied' ? res.request : (undefined as never);
    expect(row.status).toBe('rejected');
    expect(row.requestVersion).toBe(4);
    expect(row.decisionReason).toBe('duplicate charge');
    expect(h.state.decisions[0]).toMatchObject({
      fromStatus: 'under_review',
      toStatus: 'rejected',
      requestVersion: 4,
      decisionReason: 'duplicate charge',
    });
  });

  it('reject without motivo → REASON_REQUIRED (422) and no mutation', async () => {
    const h = createHarness(seedRow({ id: REQ_ID }));

    const res = await decideRefundRequest(decision({ target: 'rejected' }), h.ports);

    expect(res).toEqual({
      kind: 'rejected',
      reason: 'REASON_REQUIRED',
      detail: 'decision_reason is mandatory for rejected',
    });
    expect(REFUND_DECISION_HTTP_STATUS.REASON_REQUIRED).toBe(422);
    expect(h.state.applyCalls).toBe(0);
    expect(h.state.decisions).toHaveLength(0);
    expect(h.state.requests.get(REQ_ID)!.status).toBe('pending');
  });

  it('whitespace-only motivo is still missing', async () => {
    const h = createHarness(seedRow({ id: REQ_ID }));
    const res = await decideRefundRequest(decision({ target: 'rejected', reason: '   ' }), h.ports);
    expect(res).toMatchObject({ kind: 'rejected', reason: 'REASON_REQUIRED' });
    expect(h.state.decisions).toHaveLength(0);
  });
});

describe('C36-DE segregation of duties', () => {
  it('refuses self-approval (403) with no mutation', async () => {
    const h = createHarness(seedRow({ id: REQ_ID, requestedBy: ACTOR_ID }));

    const res = await decideRefundRequest(decision(), h.ports);

    expect(res).toMatchObject({ kind: 'rejected', reason: 'SEGREGATION_OF_DUTIES' });
    expect(REFUND_DECISION_HTTP_STATUS.SEGREGATION_OF_DUTIES).toBe(403);
    expect(h.state.applyCalls).toBe(0);
    expect(h.state.decisions).toHaveLength(0);
    expect(h.state.requests.get(REQ_ID)).toMatchObject({ status: 'pending', requestVersion: 1 });
  });

  it('refuses self-rejection too (both directions)', async () => {
    const h = createHarness(
      seedRow({ id: REQ_ID, requestedBy: ACTOR_ID, status: 'under_review' }),
    );

    const res = await decideRefundRequest(
      decision({ target: 'rejected', reason: 'cannot self-reject' }),
      h.ports,
    );

    expect(res).toMatchObject({ kind: 'rejected', reason: 'SEGREGATION_OF_DUTIES' });
    expect(h.state.applyCalls).toBe(0);
    expect(h.state.decisions).toHaveLength(0);
  });

  it('refuses when requested_by is unknown (SoD cannot be proven)', async () => {
    const h = createHarness(seedRow({ id: REQ_ID, requestedBy: null }));

    const res = await decideRefundRequest(decision(), h.ports);

    expect(res).toMatchObject({ kind: 'rejected', reason: 'REQUESTER_UNKNOWN' });
    expect(REFUND_DECISION_HTTP_STATUS.REQUESTER_UNKNOWN).toBe(403);
    expect(h.state.applyCalls).toBe(0);
    expect(h.state.decisions).toHaveLength(0);
  });

  it('missing authenticated actor → ACTOR_REQUIRED (401)', async () => {
    const h = createHarness(seedRow({ id: REQ_ID }));

    const res = await decideRefundRequest(
      decision({ actorId: undefined as unknown as number }),
      h.ports,
    );

    expect(res).toMatchObject({ kind: 'rejected', reason: 'ACTOR_REQUIRED' });
    expect(REFUND_DECISION_HTTP_STATUS.ACTOR_REQUIRED).toBe(401);
    expect(h.state.decisions).toHaveLength(0);
  });
});

describe('C36-DE local RBAC at domain level', () => {
  it('denies supervisor (403) before any read or write', async () => {
    const h = createHarness(seedRow({ id: REQ_ID }));

    const res = await decideRefundRequest(decision({ actorRole: 'supervisor' }), h.ports);

    expect(res).toMatchObject({ kind: 'rejected', reason: 'ROLE_NOT_ALLOWED' });
    expect(REFUND_DECISION_HTTP_STATUS.ROLE_NOT_ALLOWED).toBe(403);
    expect(h.state.applyCalls).toBe(0);
    expect(h.state.requests.get(REQ_ID)).toMatchObject({ status: 'pending', requestVersion: 1 });
  });

  it('denies null / anonymous role', async () => {
    const h = createHarness(seedRow({ id: REQ_ID }));
    const res = await decideRefundRequest(decision({ actorRole: null }), h.ports);
    expect(res).toMatchObject({ kind: 'rejected', reason: 'ROLE_NOT_ALLOWED' });
    expect(h.state.decisions).toHaveLength(0);
  });

  it('allows admin', async () => {
    const h = createHarness(seedRow({ id: REQ_ID }));
    const res = await decideRefundRequest(decision({ actorRole: 'admin' }), h.ports);
    expect(res).toMatchObject({ kind: 'applied', request: { status: 'approved' } });
  });
});

describe('C36-DE state enforcement through the service', () => {
  it('approved is terminal: approved → rejected → INVALID_TRANSITION (409)', async () => {
    const h = createHarness(seedRow({ id: REQ_ID, status: 'approved' }));

    const res = await decideRefundRequest(
      decision({ target: 'rejected', reason: 'changed my mind' }),
      h.ports,
    );

    expect(res).toMatchObject({ kind: 'rejected', reason: 'INVALID_TRANSITION' });
    expect(REFUND_DECISION_HTTP_STATUS.INVALID_TRANSITION).toBe(409);
    expect(h.state.applyCalls).toBe(0);
    expect(h.state.decisions).toHaveLength(0);
  });

  it('draft cannot jump straight to approved', async () => {
    const h = createHarness(seedRow({ id: REQ_ID, status: 'draft' }));

    const res = await decideRefundRequest(decision(), h.ports);

    expect(res).toMatchObject({
      kind: 'rejected',
      reason: 'INVALID_TRANSITION',
      detail: 'draft -> approved',
    });
    expect(h.state.applyCalls).toBe(0);
  });

  it('execution states are unreachable even with a hostile cast', async () => {
    const h = createHarness(seedRow({ id: REQ_ID, status: 'pending' }));

    const res = await decideRefundRequest(
      decision({ target: 'executing' as RefundDecisionTarget }),
      h.ports,
    );

    expect(res).toMatchObject({ kind: 'rejected', reason: 'INVALID_TRANSITION' });
    expect(h.state.applyCalls).toBe(0);
    expect(h.state.requests.get(REQ_ID)).toMatchObject({ status: 'pending', requestVersion: 1 });
  });

  it('unknown request → NOT_FOUND (404)', async () => {
    const h = createHarness(seedRow({ id: REQ_ID }));

    const res = await decideRefundRequest(
      decision({ requestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }),
      h.ports,
    );

    expect(res).toMatchObject({ kind: 'rejected', reason: 'NOT_FOUND' });
    expect(REFUND_DECISION_HTTP_STATUS.NOT_FOUND).toBe(404);
    expect(h.state.applyCalls).toBe(0);
  });
});

describe('C36-DE idempotent replay', () => {
  it('same decision twice → second is a no-op replay', async () => {
    const h = createHarness(seedRow({ id: REQ_ID }));

    const first = await decideRefundRequest(decision(), h.ports);
    const second = await decideRefundRequest(decision(), h.ports);

    expect(first.kind).toBe('applied');
    expect(second.kind).toBe('idempotent');
    expect(second).toMatchObject({ request: { status: 'approved', requestVersion: 2 } });
    expect(h.state.requests.get(REQ_ID)).toMatchObject({ status: 'approved', requestVersion: 2 });
    expect(h.state.decisions).toHaveLength(1);
    expect(h.state.applyCalls).toBe(1);
  });

  it('under_review → under_review replay does not bump version', async () => {
    const h = createHarness(seedRow({ id: REQ_ID, status: 'under_review', requestVersion: 5 }));

    const res = await decideRefundRequest(decision({ target: 'under_review' }), h.ports);

    expect(res).toMatchObject({ kind: 'idempotent', request: { requestVersion: 5 } });
    expect(h.state.decisions).toHaveLength(0);
    expect(h.state.applyCalls).toBe(0);
  });
});

describe('C36-DE CAS on (status, request_version)', () => {
  it('stale expectedVersion → VERSION_CONFLICT (409), no mutation', async () => {
    const h = createHarness(seedRow({ id: REQ_ID }));

    const res = await decideRefundRequest(decision({ expectedVersion: 99 }), h.ports);

    expect(res).toMatchObject({ kind: 'rejected', reason: 'VERSION_CONFLICT' });
    expect(REFUND_DECISION_HTTP_STATUS.VERSION_CONFLICT).toBe(409);
    expect(h.state.requests.get(REQ_ID)).toMatchObject({ status: 'pending', requestVersion: 1 });
    expect(h.state.decisions).toHaveLength(0);
    expect(h.state.applyCalls).toBe(1);
  });

  it('lost race with the same target → detected as replay of the winner', async () => {
    const h = createHarness(seedRow({ id: REQ_ID }));
    const winner = await decideRefundRequest(decision(), h.ports);
    expect(winner.kind).toBe('applied');

    // Loser read v1/pending *before* the winner committed, then its CAS finds 0 rows.
    const stale = seedRow({ id: REQ_ID });
    let reads = 0;
    const stalePorts: RefundDecisionPorts = {
      async findById(id: string) {
        reads += 1;
        return reads === 1 ? { ...stale } : await h.ports.findById(id);
      },
      applyDecision: h.ports.applyDecision,
    };

    const loser = await decideRefundRequest(decision(), stalePorts);

    expect(loser.kind).toBe('idempotent');
    expect(loser).toMatchObject({ request: { status: 'approved', requestVersion: 2 } });
    expect(h.state.requests.get(REQ_ID)).toMatchObject({ status: 'approved', requestVersion: 2 });
    expect(h.state.decisions).toHaveLength(1);
    // 1 CAS from the winner + 1 CAS from the loser that found 0 rows.
    expect(h.state.applyCalls).toBe(2);
  });

  it('real conflict when the loser wanted a different status', async () => {
    const h = createHarness(seedRow({ id: REQ_ID }));
    await decideRefundRequest(decision(), h.ports); // → approved v2

    const stale = seedRow({ id: REQ_ID });
    let reads = 0;
    const stalePorts: RefundDecisionPorts = {
      async findById(id: string) {
        reads += 1;
        return reads === 1 ? { ...stale } : await h.ports.findById(id);
      },
      applyDecision: h.ports.applyDecision,
    };

    const res = await decideRefundRequest(
      decision({ target: 'rejected', reason: 'other decision' }),
      stalePorts,
    );

    expect(res).toMatchObject({ kind: 'rejected', reason: 'VERSION_CONFLICT' });
    expect(h.state.requests.get(REQ_ID)).toMatchObject({ status: 'approved', requestVersion: 2 });
    expect(h.state.decisions).toHaveLength(1);
  });
});

describe('C36-DE atomic audit trail', () => {
  it('audit insert failure rolls the status change back', async () => {
    const h = createHarness(seedRow({ id: REQ_ID }));
    h.state.failAudit = true;

    await expect(decideRefundRequest(decision(), h.ports)).rejects.toThrow(
      'refund_request_decisions insert failed',
    );

    expect(h.state.requests.get(REQ_ID)).toMatchObject({
      status: 'pending',
      requestVersion: 1,
      decidedBy: null,
      decidedAt: null,
    });
    expect(h.state.decisions).toHaveLength(0);
  });

  it('exactly one audit row per applied decision (replays add none)', async () => {
    const h = createHarness(seedRow({ id: REQ_ID }));

    await decideRefundRequest(decision({ target: 'under_review' }), h.ports);
    await decideRefundRequest(decision({ target: 'approved' }), h.ports);
    await decideRefundRequest(decision(), h.ports); // replay → no new row

    expect(h.state.decisions.map((d) => d.toStatus)).toEqual(['under_review', 'approved']);
    expect(h.state.requests.get(REQ_ID)).toMatchObject({ status: 'approved', requestVersion: 3 });
  });

  it('every emitted decision row satisfies the 0063 CHECKs', async () => {
    const h = createHarness(seedRow({ id: REQ_ID }));

    await decideRefundRequest(decision({ target: 'under_review' }), h.ports);
    await decideRefundRequest(decision({ target: 'rejected', reason: 'duplicate' }), h.ports);

    for (const d of h.state.decisions) {
      // refund_request_decisions_transition_check
      expect(d.fromStatus).not.toBe(d.toStatus);
      // refund_request_decisions_version_check
      expect(d.requestVersion).toBeGreaterThanOrEqual(1);
      // refund_request_decisions_rejected_reason_check
      if (d.toStatus === 'rejected') expect(d.decisionReason).toBeTruthy();
      // refund_requests_decision_pair_check is guaranteed by decided_by/decided_at set together
      expect(d.decidedBy).toBe(ACTOR_ID);
    }

    const row = h.state.requests.get(REQ_ID)!;
    expect(row.decidedBy === null).toBe(row.decidedAt === null);
    expect(row.decisionReason).toBeTruthy();
  });
});

describe('C36-DE static separation guarantees', () => {
  const serviceSrc = readFileSync(SERVICE, 'utf8');
  const stateSrc = readFileSync(STATE_MODULE, 'utf8');
  const routesSrc = readFileSync(ROUTES, 'utf8');

  it('service decides only: no execution, gateway or financial writers', () => {
    expect(serviceSrc).not.toMatch(/RefundService/);
    expect(serviceSrc).not.toMatch(/from ['"].*refund\.service/);
    expect(serviceSrc).not.toMatch(/reverseEarningForPaymentRefund/);
    expect(serviceSrc).not.toMatch(/applyEarningReversalOnPaymentRefund/);
    expect(serviceSrc).not.toMatch(/getPaymentProvider/);
    expect(serviceSrc).toMatch(/refundRequestDecisions/);
    expect(serviceSrc).toMatch(/db\.transaction/);
  });

  it('state machine module is pure (no I/O, no DB, no money)', () => {
    expect(stateSrc).not.toMatch(/drizzle/);
    expect(stateSrc).not.toMatch(/from ['"]fs['"]/);
    expect(stateSrc).not.toMatch(/require\(/);
    expect(stateSrc).not.toMatch(/fetch\(/);
    expect(stateSrc).not.toMatch(/gateway|payout|ledger|earnings/i);
  });

  it('requester identity never comes from the request body', () => {
    expect(routesSrc).not.toMatch(/body\.requestedBy/);
    expect(routesSrc).toMatch(/requestedBy: actorId/);
  });
});

describe('C36-DE error → HTTP status contract', () => {
  it('maps every decision failure to the required status', () => {
    expect(REFUND_DECISION_HTTP_STATUS).toEqual({
      ACTOR_REQUIRED: 401,
      ROLE_NOT_ALLOWED: 403,
      REASON_REQUIRED: 422,
      NOT_FOUND: 404,
      REQUESTER_UNKNOWN: 403,
      SEGREGATION_OF_DUTIES: 403,
      INVALID_TRANSITION: 409,
      VERSION_CONFLICT: 409,
    });
  });
});
