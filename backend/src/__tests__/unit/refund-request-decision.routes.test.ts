/**
 * C36-DE-05 — RefundRequest decision HTTP layer (approve / reject).
 *
 * What is real here: the express edge, the module composition (global gate in
 * `payments/routes/index.ts`) and the complete decision use case.
 * What is substituted: the auth middleware (test identity injection) and the
 * drizzle decision ports (in-memory harness).
 *
 * Consequence: no database write, no migration APPLY and no money movement can
 * happen while these tests run, yet every status below is produced by the real
 * domain through the real HTTP endpoints.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import express from 'express';
import request from 'supertest';

import refundRequestRouter, {
  REFUND_DECISION_HTTP_CONTRACT,
  REFUND_DECISION_HTTP_EDGE,
} from '../../../server/modules/payments/routes/refund-request.routes';
import {
  REFUND_DECISION_HTTP_STATUS,
  type ApplyDecisionParams,
  type ApplyDecisionOutcome,
  type RefundDecisionPorts,
  type RefundRequestRow,
} from '../../../server/modules/payments/services/refund-request.service';

type ActualService = typeof import(
  '../../../server/modules/payments/services/refund-request.service'
);

/* ─── harness (faithful reimplementation of the transactional CAS + audit) ─── */

type DecisionRecord = {
  refundRequestId: string;
  fromStatus: string;
  toStatus: string;
  decidedBy: number;
  requestVersion: number;
  decisionReason: string | null;
};

type RefundHarness = {
  state: {
    requests: Map<string, RefundRequestRow>;
    decisions: DecisionRecord[];
    applyCalls: number;
  };
  ports: RefundDecisionPorts;
};

/** Rebuilt before every test; read lazily by the mocked service wrapper. */
let mockHarness: RefundHarness;
/** Forces the decision port to explode — used by the 500 no-leak test. */
let mockBoom = false;

jest.mock(
  '../../../server/modules/payments/services/refund-request.service',
  () => {
    const actual = jest.requireActual(
      '../../../server/modules/payments/services/refund-request.service',
    ) as ActualService;

    return {
      ...actual,
      decideRefundRequest: async (
        ...[input, ports]: Parameters<ActualService['decideRefundRequest']>
      ) => {
        if (mockBoom) {
          throw new Error('SQLSTATE 42P02: relation "refund_requests" does not exist');
        }
        return actual.decideRefundRequest(input, ports ?? mockHarness.ports);
      },
      // C36-DE-14: tenant resolution is stubbed here on purpose. These tests
      // assert decision rules, not tenancy; tenancy has its own suite.
      // NOTE: literal, not a const — the factory may run before module init.
      resolveRefundRequestTenant: async () => ({
        kind: 'ok' as const,
        enterpriseId: 'ent_test_a',
      }),
      assertPaymentTenant: async () => ({ kind: 'ok' as const, enterpriseId: 'ent_test_a' }),
      getRefundRequestById: async () => mockHarness.state.requests.get(REQ_ID) ?? null,
      createRefundRequest: async () =>
        mockBoom
          ? (() => {
              throw new Error('boom');
            })()
          : ({ kind: 'created', request: seedRow() } as never),
    };
  },
);

jest.mock('../../../../server/middleware/auth.middleware', () => ({
  authenticateJwt: (
    req: {
      headers: Record<string, string | undefined>;
      user?: { id?: number; role?: string; enterpriseId?: string };
    },
    res: { status(code: number): { json(body: unknown): unknown } },
    next: () => void,
  ) => {
    const rawId = req.headers['x-test-user-id'];
    if (req.headers.authorization === undefined && rawId === undefined) {
      return res.status(401).json({ success: false, error: 'Token ausente' });
    }
    const id = Number(rawId);
    if (!Number.isFinite(id)) {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }
    // C36-DE-14 — tenant is JWT-derived here too.
    req.user = { id, role: req.headers['x-test-role'], enterpriseId: 'ent_test_a' };
    return next();
  },
  requireRole:
    (...roles: string[]) =>
    (
      req: { user?: { id?: number; role?: string } },
      res: { status(code: number): { json(body: unknown): unknown } },
      next: () => void,
    ) => {
      const role = req.user?.role;
      if (!role || !roles.includes(role)) {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      return next();
    },
}));

const REQ_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PAYMENT_ID = '11111111-1111-4111-8111-111111111111';
const REQUESTER_ID = 7;
const ACTOR_ID = 442;

type TestIdentity = { id: number; role?: string; enterpriseId?: string };

// C36-DE-14 — every identity carries a JWT-derived tenant. `ent_test_a` matches
// the stubbed resolver, so these tests keep asserting decision rules only.
const ADMIN: TestIdentity = { id: ACTOR_ID, role: 'admin', enterpriseId: 'ent_test_a' };
const MANAGER: TestIdentity = { id: ACTOR_ID, role: 'manager', enterpriseId: 'ent_test_a' };
const SUPERVISOR: TestIdentity = { id: ACTOR_ID, role: 'supervisor', enterpriseId: 'ent_test_a' };
const AGENT: TestIdentity = { id: ACTOR_ID, role: 'agent', enterpriseId: 'ent_test_a' };

function seedRow(overrides: Partial<RefundRequestRow> = {}): RefundRequestRow {
  const now = new Date('2026-09-01T12:00:00.000Z');
  return {
    id: REQ_ID,
    paymentId: PAYMENT_ID,
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

function createHarness(seed: RefundRequestRow): RefundHarness {
  const state = {
    requests: new Map<string, RefundRequestRow>([[seed.id, { ...seed }]]),
    decisions: [] as DecisionRecord[],
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
      state.decisions.push({
        refundRequestId: updated.id,
        fromStatus: current.status,
        toStatus: updated.status,
        decidedBy: params.actorId,
        requestVersion: updated.requestVersion,
        decisionReason: params.reason,
      });
      state.requests.set(params.requestId, updated);
      return { kind: 'applied', request: { ...updated } };
    },
  };

  return { state, ports };
}

/* ─── apps ─── */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const paymentsIndexRouter = require('../../../server/modules/payments/routes');

/** Real module composition: global gate (admin|manager) + refund-request router. */
function buildModuleApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/payments', paymentsIndexRouter.default || paymentsIndexRouter);
  return app;
}

/**
 * Decision router only, with identity injected and NO module-level gate.
 * Proves the domain itself still refuses unauthorised roles (defence in depth)
 * even if the edge gate were bypassed.
 */
function buildDecisionApp(identity?: TestIdentity) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (identity) req.user = identity;
    next();
  });
  app.use('/api/v1/payments/refund-requests', refundRequestRouter);
  return app;
}

function moduleHeaders(role: string) {
  return {
    Authorization: 'Bearer test-token',
    'x-test-role': role,
    'x-test-user-id': String(ACTOR_ID),
  };
}

const APPROVE_URL = `/api/v1/payments/refund-requests/${REQ_ID}/approve`;
const REJECT_URL = `/api/v1/payments/refund-requests/${REQ_ID}/reject`;

const ROUTES_SRC = join(
  __dirname,
  '../../../server/modules/payments/routes/refund-request.routes.ts',
);
const INDEX_SRC = join(__dirname, '../../../server/modules/payments/routes/index.ts');

beforeEach(() => {
  mockBoom = false;
  mockHarness = createHarness(seedRow());
});

/* ─────────────────────────────────────────────────────────────────────── */

describe('C36-DE-05 explicit HTTP error contract', () => {
  it('maps every domain failure to the status required by the contract', () => {
    expect(REFUND_DECISION_HTTP_CONTRACT).toEqual({
      ACTOR_REQUIRED: { status: 401, code: 'UNAUTHENTICATED' },
      ROLE_NOT_ALLOWED: { status: 403, code: 'ROLE_NOT_ALLOWED' },
      REQUESTER_UNKNOWN: { status: 403, code: 'REQUESTER_UNKNOWN' },
      SEGREGATION_OF_DUTIES: { status: 403, code: 'SEGREGATION_OF_DUTIES' },
      NOT_FOUND: { status: 404, code: 'NOT_FOUND' },
      INVALID_TRANSITION: { status: 409, code: 'INVALID_TRANSITION' },
      VERSION_CONFLICT: { status: 409, code: 'VERSION_CONFLICT' },
      REASON_REQUIRED: { status: 422, code: 'REASON_REQUIRED' },
    });
  });

  it('never drifts from the service-side REFUND_DECISION_HTTP_STATUS map', () => {
    const httpKeys = Object.keys(REFUND_DECISION_HTTP_CONTRACT).sort();
    expect(httpKeys).toEqual(Object.keys(REFUND_DECISION_HTTP_STATUS).sort());

    const statuses: Record<string, number> = {};
    for (const key of httpKeys as (keyof typeof REFUND_DECISION_HTTP_CONTRACT)[]) {
      statuses[key] = REFUND_DECISION_HTTP_CONTRACT[key].status;
    }
    expect(statuses).toEqual(REFUND_DECISION_HTTP_STATUS);
  });

  it('declares the edge-only outcomes (401 / 404 / 500)', () => {
    expect(REFUND_DECISION_HTTP_EDGE).toEqual({
      UNAUTHENTICATED: { status: 401, code: 'UNAUTHENTICATED' },
      INVALID_REQUEST_ID: { status: 404, code: 'NOT_FOUND' },
      // C36-DE-14: additive edge-only outcome (generic tenant refusal).
      TENANT_ISOLATION: { status: 403, code: 'TENANT_ISOLATION' },
      INTERNAL_ERROR: { status: 500, code: 'INTERNAL_ERROR' },
    });
  });
});

describe('C36-DE-05 authentication', () => {
  it('401 when the edge has no authenticated actor', async () => {
    const res = await request(buildDecisionApp()).post(APPROVE_URL).send({});

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, error: 'UNAUTHENTICATED' });
    expect(mockHarness.state.applyCalls).toBe(0);
  });

  it('401 on the real module composition without JWT', async () => {
    const res = await request(buildModuleApp()).post(APPROVE_URL).send({});
    expect(res.status).toBe(401);
    expect(mockHarness.state.applyCalls).toBe(0);
  });
});

describe('C36-DE-05 authorization (real module composition)', () => {
  it('supervisor → 403', async () => {
    const res = await request(buildModuleApp())
      .post(APPROVE_URL)
      .set(moduleHeaders('supervisor'))
      .send({});
    expect(res.status).toBe(403);
    expect(mockHarness.state.applyCalls).toBe(0);
  });

  it('agent → 403', async () => {
    const res = await request(buildModuleApp())
      .post(REJECT_URL)
      .set(moduleHeaders('agent'))
      .send({ reason: 'nope' });
    expect(res.status).toBe(403);
    expect(mockHarness.state.applyCalls).toBe(0);
  });

  it('admin → 200 approve', async () => {
    const res = await request(buildModuleApp())
      .post(APPROVE_URL)
      .set(moduleHeaders('admin'))
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('approved');
  });

  it('manager → 200 reject', async () => {
    const res = await request(buildModuleApp())
      .post(REJECT_URL)
      .set(moduleHeaders('manager'))
      .send({ reason: 'outside policy' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
  });
});

describe('C36-DE-05 authorization (domain, defence in depth)', () => {
  it('refuses supervisor even when the module-level gate is bypassed', async () => {
    const res = await request(buildDecisionApp(SUPERVISOR)).post(APPROVE_URL).send({});

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('ROLE_NOT_ALLOWED');
    expect(mockHarness.state.applyCalls).toBe(0);
  });

  it('refuses agent even when the module-level gate is bypassed', async () => {
    const res = await request(buildDecisionApp(AGENT)).post(REJECT_URL).send({
      reason: 'nope',
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('ROLE_NOT_ALLOWED');
    expect(mockHarness.state.applyCalls).toBe(0);
  });

  it('permits admin and manager', async () => {
    const admin = await request(buildDecisionApp(ADMIN)).post(APPROVE_URL).send({});
    expect(admin.status).toBe(200);

    mockHarness = createHarness(seedRow());
    const manager = await request(buildDecisionApp(MANAGER))
      .post(REJECT_URL)
      .send({ reason: 'outside policy' });
    expect(manager.status).toBe(200);
  });
});

describe('C36-DE-05 approve', () => {
  it('pending → approved = 200 with the resulting state of the request', async () => {
    const res = await request(buildDecisionApp(ADMIN)).post(APPROVE_URL).send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.kind).toBe('applied');
    expect(res.body.data.status).toBe('approved');
    expect(res.body.data.decidedBy).toBe(ACTOR_ID);
    expect(res.body.data.decidedAt).toBeTruthy();
    expect(res.body.data.requestVersion).toBe(2);
    expect(mockHarness.state.decisions).toHaveLength(1);
    expect(mockHarness.state.decisions[0]).toMatchObject({
      fromStatus: 'pending',
      toStatus: 'approved',
      decidedBy: ACTOR_ID,
    });
  });

  it('under_review → approved = 200', async () => {
    mockHarness = createHarness(seedRow({ status: 'under_review' }));
    const res = await request(buildDecisionApp(ADMIN)).post(APPROVE_URL).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
  });
});

describe('C36-DE-05 reject', () => {
  it('pending → rejected + reason = 200, reason persisted through the domain trim', async () => {
    const res = await request(buildDecisionApp(MANAGER))
      .post(REJECT_URL)
      .send({ reason: '  fora da política  ' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.kind).toBe('applied');
    expect(res.body.data.status).toBe('rejected');
    expect(res.body.data.decidedBy).toBe(ACTOR_ID);
    expect(res.body.data.decisionReason).toBe('fora da política');
    expect(mockHarness.state.decisions[0].toStatus).toBe('rejected');
  });

  it('under_review → rejected = 200', async () => {
    mockHarness = createHarness(seedRow({ status: 'under_review' }));
    const res = await request(buildDecisionApp(MANAGER))
      .post(REJECT_URL)
      .send({ reason: 'duplicidade' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
  });
});

describe('C36-DE-05 reject reason validation (422)', () => {
  it('missing reason → 422', async () => {
    const res = await request(buildDecisionApp(MANAGER)).post(REJECT_URL).send({});
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('REASON_REQUIRED');
    expect(mockHarness.state.applyCalls).toBe(0);
  });

  it('empty reason → 422', async () => {
    const res = await request(buildDecisionApp(MANAGER)).post(REJECT_URL).send({ reason: '' });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('REASON_REQUIRED');
    expect(mockHarness.state.applyCalls).toBe(0);
  });

  it('whitespace-only reason → 422', async () => {
    const res = await request(buildDecisionApp(MANAGER))
      .post(REJECT_URL)
      .send({ reason: '   \t  ' });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('REASON_REQUIRED');
    expect(mockHarness.state.applyCalls).toBe(0);
  });

  it('null reason → 422', async () => {
    const res = await request(buildDecisionApp(MANAGER)).post(REJECT_URL).send({ reason: null });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('REASON_REQUIRED');
  });

  it('non-string reason → 422 (an invalid body can never masquerade as a reason)', async () => {
    const res = await request(buildDecisionApp(MANAGER)).post(REJECT_URL).send({ reason: 42 });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('REASON_REQUIRED');
  });
});

describe('C36-DE-05 segregation of duties', () => {
  it('requester == actor → 403 SEGREGATION_OF_DUTIES', async () => {
    mockHarness = createHarness(seedRow({ requestedBy: ACTOR_ID }));
    const res = await request(buildDecisionApp(ADMIN)).post(APPROVE_URL).send({});

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('SEGREGATION_OF_DUTIES');
    expect(mockHarness.state.applyCalls).toBe(0);
  });

  it('self-rejection is refused too', async () => {
    mockHarness = createHarness(seedRow({ requestedBy: ACTOR_ID }));
    const res = await request(buildDecisionApp(MANAGER))
      .post(REJECT_URL)
      .send({ reason: 'auto' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('SEGREGATION_OF_DUTIES');
    expect(mockHarness.state.applyCalls).toBe(0);
  });

  it('unknown requester → 403 REQUESTER_UNKNOWN', async () => {
    mockHarness = createHarness(seedRow({ requestedBy: null }));
    const res = await request(buildDecisionApp(ADMIN)).post(APPROVE_URL).send({});
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('REQUESTER_UNKNOWN');
    expect(mockHarness.state.applyCalls).toBe(0);
  });
});

describe('C36-DE-05 not found (404)', () => {
  it('unknown id → 404', async () => {
    const url = `/api/v1/payments/refund-requests/${OTHER_ID}/approve`;
    const res = await request(buildDecisionApp(ADMIN)).post(url).send({});

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
    expect(mockHarness.state.applyCalls).toBe(0);
  });

  it('malformed id → 404 instead of a driver error leaking as 500', async () => {
    const res = await request(buildDecisionApp(ADMIN))
      .post('/api/v1/payments/refund-requests/not-a-uuid/approve')
      .send({});

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'NOT_FOUND' });
    expect(mockHarness.state.applyCalls).toBe(0);
  });
});

describe('C36-DE-05 invalid transitions (409)', () => {
  it('approved → reject → 409', async () => {
    mockHarness = createHarness(seedRow({ status: 'approved' }));
    const res = await request(buildDecisionApp(MANAGER))
      .post(REJECT_URL)
      .send({ reason: 'mudou de ideia' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('INVALID_TRANSITION');
    expect(mockHarness.state.applyCalls).toBe(0);
  });

  it('rejected → approve → 409', async () => {
    mockHarness = createHarness(seedRow({ status: 'rejected' }));
    const res = await request(buildDecisionApp(ADMIN)).post(APPROVE_URL).send({});

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('INVALID_TRANSITION');
    expect(mockHarness.state.applyCalls).toBe(0);
  });

  it('draft → approve → 409', async () => {
    mockHarness = createHarness(seedRow({ status: 'draft' }));
    const res = await request(buildDecisionApp(ADMIN)).post(APPROVE_URL).send({});

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('INVALID_TRANSITION');
    expect(mockHarness.state.applyCalls).toBe(0);
  });

  it('executing → approve → 409 (execution states stay out of the approval domain)', async () => {
    mockHarness = createHarness(seedRow({ status: 'executing' }));
    const res = await request(buildDecisionApp(ADMIN)).post(APPROVE_URL).send({});

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('INVALID_TRANSITION');
    expect(mockHarness.state.applyCalls).toBe(0);
  });
});

describe('C36-DE-05 concurrency (409)', () => {
  it('stale expectedVersion → 409 VERSION_CONFLICT, nothing mutated', async () => {
    const res = await request(buildDecisionApp(ADMIN))
      .post(APPROVE_URL)
      .send({ expectedVersion: 99 });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('VERSION_CONFLICT');
    expect(mockHarness.state.requests.get(REQ_ID)?.status).toBe('pending');
    expect(mockHarness.state.decisions).toHaveLength(0);
  });

  it('a version token that is not a positive integer is ignored, never invented', async () => {
    const res = await request(buildDecisionApp(ADMIN))
      .post(APPROVE_URL)
      .send({ expectedVersion: 'not-a-lock' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
  });
});

describe('C36-DE-05 idempotency / replay', () => {
  it('replay of the same decision → 200 with no second mutation', async () => {
    const first = await request(buildDecisionApp(ADMIN)).post(APPROVE_URL).send({});
    expect(first.status).toBe(200);
    expect(first.body.kind).toBe('applied');

    const replay = await request(buildDecisionApp(ADMIN)).post(APPROVE_URL).send({});

    expect(replay.status).toBe(200);
    expect(replay.body.success).toBe(true);
    expect(replay.body.kind).toBe('idempotent');
    expect(replay.body.data.status).toBe('approved');
    expect(mockHarness.state.decisions).toHaveLength(1);
    expect(mockHarness.state.applyCalls).toBe(1);
  });

  it('replayed reject → 200 and does not rewrite the reason', async () => {
    await request(buildDecisionApp(MANAGER)).post(REJECT_URL).send({ reason: 'primeiro' });
    const replay = await request(buildDecisionApp(MANAGER))
      .post(REJECT_URL)
      .send({ reason: 'segundo' });

    expect(replay.status).toBe(200);
    expect(replay.body.kind).toBe('idempotent');
    expect(replay.body.data.decisionReason).toBe('primeiro');
    expect(mockHarness.state.decisions).toHaveLength(1);
    expect(mockHarness.state.applyCalls).toBe(1);
  });
});

describe('C36-DE-05 identity is JWT-only', () => {
  it('body.requestedBy / body.decidedBy / body.userId cannot choose the actor', async () => {
    const res = await request(buildDecisionApp(ADMIN))
      .post(APPROVE_URL)
      .send({ requestedBy: 9999, decidedBy: 9999, userId: 9999 });

    expect(res.status).toBe(200);
    expect(res.body.data.decidedBy).toBe(ACTOR_ID);
    expect(mockHarness.state.decisions[0].decidedBy).toBe(ACTOR_ID);
  });

  it('body.requestedBy cannot be used to bypass segregation of duties', async () => {
    mockHarness = createHarness(seedRow({ requestedBy: ACTOR_ID }));
    const res = await request(buildDecisionApp(ADMIN))
      .post(APPROVE_URL)
      .send({ requestedBy: 1 });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('SEGREGATION_OF_DUTIES');
    expect(mockHarness.state.applyCalls).toBe(0);
  });

  it('user headers cannot choose the actor', async () => {
    const res = await request(buildDecisionApp(ADMIN))
      .post(APPROVE_URL)
      .set('x-user-id', '9999')
      .set('x-decided-by', '9999')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.decidedBy).toBe(ACTOR_ID);
  });
});

describe('C36-DE-05 state machine is not client-controlled', () => {
  it('body.target cannot override the target bound to the route', async () => {
    const res = await request(buildDecisionApp(ADMIN))
      .post(APPROVE_URL)
      .send({ target: 'rejected', reason: 'troca silenciosa' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
    expect(mockHarness.state.decisions[0].toStatus).toBe('approved');
  });

  it('the reject endpoint always decides `rejected`, never a client-chosen state', async () => {
    mockHarness = createHarness(seedRow({ status: 'under_review' }));
    const res = await request(buildDecisionApp(MANAGER))
      .post(REJECT_URL)
      .send({ target: 'executing', reason: 'estado indevido' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
    expect(mockHarness.state.decisions[0].toStatus).toBe('rejected');
  });
});

describe('C36-DE-05 no internal detail leaks', () => {
  it('500 never exposes SQL, driver messages or stack traces', async () => {
    mockBoom = true;
    const res = await request(buildDecisionApp(ADMIN)).post(APPROVE_URL).send({});

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: 'INTERNAL_ERROR' });

    const raw = JSON.stringify(res.body);
    for (const forbidden of [
      'SQLSTATE',
      'refund_requests',
      'relation',
      'SQL',
      'pg_',
      'node_modules',
      'at Object.',
      'Error:',
    ]) {
      expect(raw).not.toContain(forbidden);
    }
  });

  it('domain rejections carry only a stable code and a domain detail', async () => {
    const res = await request(buildDecisionApp(ADMIN))
      .post(APPROVE_URL)
      .send({ expectedVersion: 99 });

    expect(res.status).toBe(409);
    expect(Object.keys(res.body).sort()).toEqual(['detail', 'error', 'success']);
    expect(JSON.stringify(res.body)).not.toMatch(/SELECT|INSERT|UPDATE |node_modules/);
  });
});

describe('C36-DE-05 static scope / isolation guarantees', () => {
  const routesSrc = readFileSync(ROUTES_SRC, 'utf8');
  const indexSrc = readFileSync(INDEX_SRC, 'utf8');

  it('wires exactly two decision targets: approved and rejected', () => {
    const targets = [...routesSrc.matchAll(/decisionHandler\('([a-z_]+)'\)/g)].map(
      (match) => match[1],
    );
    expect(targets.sort()).toEqual(['approved', 'rejected']);
  });

  it('never exposes execution, draft or review states as decision targets', () => {
    expect(routesSrc).not.toMatch(
      /decisionHandler\('(executing|executed|failed|expired|cancelled|draft|under_review)'\)/,
    );
  });

  it('reaches no provider or financial ledger from the HTTP path', () => {
    expect(routesSrc).not.toMatch(
      /stripe|mercadopago|gateway|earnings|ledger|payout|settlement|chargeback/i,
    );
    expect(routesSrc).not.toMatch(/\bfetch\s*\(|\baxios\b|http\.request/);
    expect(routesSrc).not.toMatch(/createRefund\(|executeRefund|refund\.service/);
  });

  it('keeps the requester identity sourced only from the authenticated session', () => {
    expect(routesSrc).not.toMatch(/body\.requestedBy/);
    expect(routesSrc).toMatch(/requestedBy: actorId/);
  });

  it('leaves the global payments gate untouched (admin|manager, no supervisor)', () => {
    expect(indexSrc).toContain('router.use(authenticateJwt)');
    expect(indexSrc).toContain("router.use(requireRole('admin', 'manager'))");
    expect(indexSrc).toContain("router.use('/refund-requests', refundRequestRoutes)");
    expect(indexSrc).not.toMatch(/supervisor/);
  });

  it('preserves the pre-existing request-only routes', () => {
    expect(routesSrc).toContain("router.post('/', async (req, res) =>");
    expect(routesSrc).toContain("router.get('/:id', async (req, res) =>");
  });

  it('binds each endpoint to its fixed target and to the single domain call site', () => {
    expect(routesSrc).toContain("router.post('/:id/approve', decisionHandler('approved'))");
    expect(routesSrc).toContain("router.post('/:id/reject', decisionHandler('rejected'))");
    expect(routesSrc).toContain('decideRefundRequest({');
    // The target is a literal of the route definition, never read from the body.
    expect(routesSrc).not.toMatch(/target:\s*body|target:\s*req\.body|target:\s*body\./);
  });
});







