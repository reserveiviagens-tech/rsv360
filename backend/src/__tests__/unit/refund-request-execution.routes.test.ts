/**
 * C36-DE-06 — RefundRequest EXECUTION HTTP layer (POST /:id/execute).
 *
 * What is real here: the express edge, the module composition (global gate in
 * `payments/routes/index.ts`) and the complete execution use case.
 * What is substituted: the auth middleware (test identity injection) and the
 * drizzle execution ports / provider / financial step (in-memory harness).
 *
 * Consequence: no database write, no migration APPLY, no network call and no
 * money movement can happen while these tests run, yet every status below is
 * produced by the real domain through the real HTTP endpoint.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import express from 'express';
import request from 'supertest';

import executionRouter, {
  REFUND_EXECUTION_HTTP_CONTRACT,
  REFUND_EXECUTION_HTTP_EDGE,
} from '../../../server/modules/payments/routes/refund-request-execution.routes';
import {
  EXECUTION_METADATA_KEY,
  REFUND_EXECUTION_HTTP_STATUS,
  type ApplyFinancialUpdate,
  type ExecutionMutationInput,
  type ExecutionMutationResult,
  type RefundExecutionDeps,
  type RefundExecutionPorts,
} from '../../../server/modules/payments/services/refund-request-execution.service';
import {
  createSimulatedRefundGateway,
  type SimulatedRefundGatewayBehavior,
} from '../../../server/modules/payments/lib/simulated-refund.gateway';
import type { RefundRequestRow } from '../../../server/modules/payments/services/refund-request.service';

type ActualExecutionService = typeof import(
  '../../../server/modules/payments/services/refund-request-execution.service'
);

/** Rebuilt before every test; read lazily by the mocked service wrapper. */
let mockDeps: RefundExecutionDeps | null = null;
/** Forces the use case to explode — used by the 500 no-leak test. */
let mockBoom = false;

jest.mock(
  '../../../server/modules/payments/services/refund-request-execution.service',
  () => {
    const actual = jest.requireActual(
      '../../../server/modules/payments/services/refund-request-execution.service',
    ) as ActualExecutionService;

    return {
      ...actual,
      executeRefundRequest: async (
        ...args: Parameters<ActualExecutionService['executeRefundRequest']>
      ) => {
        if (mockBoom) {
          throw new Error('SQLSTATE 42P02: relation "refund_requests" does not exist');
        }
        const [input, deps] = args;
        return actual.executeRefundRequest(input, mockDeps ?? deps);
      },
    };
  },
);

jest.mock('../../../../server/middleware/auth.middleware', () => ({
  authenticateJwt: (
    req: { headers: Record<string, string | undefined>; user?: { id?: number; role?: string } },
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
    req.user = { id, role: req.headers['x-test-role'] };
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

type TestIdentity = { id: number; role?: string };

const ADMIN: TestIdentity = { id: ACTOR_ID, role: 'admin' };
const MANAGER: TestIdentity = { id: ACTOR_ID, role: 'manager' };
const SUPERVISOR: TestIdentity = { id: ACTOR_ID, role: 'supervisor' };
const AGENT: TestIdentity = { id: ACTOR_ID, role: 'agent' };

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

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
    status: 'approved',
    requestVersion: 3,
    idempotencyKey: null,
    metadata: { paymentStatusAtRequest: 'approved' },
    createdAt: now,
    updatedAt: now,
    decidedBy: 42,
    decidedAt: now,
    decisionReason: null,
    ...overrides,
  };
}

type ExecutionHarness = {
  requests: Map<string, RefundRequestRow>;
  gateway: ReturnType<typeof createSimulatedRefundGateway>;
  applied: string[];
  attempts: number;
  failNext: number;
  deps: RefundExecutionDeps;
};

function createHarness(
  seed: RefundRequestRow = seedRow(),
  behavior?: SimulatedRefundGatewayBehavior,
): ExecutionHarness {
  const requests = new Map<string, RefundRequestRow>([[seed.id, { ...seed }]]);
  const gateway = createSimulatedRefundGateway(behavior ? { behavior } : {});
  const state = { applied: [] as string[], attempts: 0, failNext: 0 };

  function cas(
    input: ExecutionMutationInput,
    expectedStatus: string,
    next?: string,
  ): ExecutionMutationResult {
    const current = requests.get(input.requestId);
    if (
      !current ||
      current.status !== expectedStatus ||
      current.requestVersion !== input.expectedVersion
    ) {
      return { kind: 'conflict', current: current ? { ...current } : null };
    }
    const updated: RefundRequestRow = {
      ...current,
      ...(next ? { status: next } : {}),
      requestVersion: current.requestVersion + 1,
      metadata: input.metadata,
      updatedAt: new Date(),
    };
    requests.set(input.requestId, updated);
    return { kind: 'updated', request: { ...updated } };
  }

  const ports: RefundExecutionPorts = {
    async findById(id) {
      const found = requests.get(id);
      return found ? { ...found } : null;
    },
    async claim(input) {
      await tick();
      return cas(input, 'approved', 'executing');
    },
    async recordReceipt(input) {
      await tick();
      return cas(input, 'executing');
    },
    async finalize(input) {
      await tick();
      return cas(input, 'executing', input.next);
    },
  };

  const applyFinancialUpdate: ApplyFinancialUpdate = async ({ paymentId }) => {
    state.attempts += 1;
    await tick();
    if (state.failNext > 0) {
      state.failNext -= 1;
      throw new Error('simulated financial update failure');
    }
    if (state.applied.includes(paymentId)) return { kind: 'idempotent' };
    state.applied.push(paymentId);
    return { kind: 'applied', detail: 'reversed' };
  };

  return {
    requests,
    gateway,
    get applied() {
      return state.applied;
    },
    get attempts() {
      return state.attempts;
    },
    get failNext() {
      return state.failNext;
    },
    set failNext(value: number) {
      state.failNext = value;
    },
    deps: { ports, gateway, applyFinancialUpdate },
  };
}

/* ─── apps ─── */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const paymentsIndexRouter = require('../../../server/modules/payments/routes');

/** Real module composition: global gate (admin|manager) + refund routers. */
function buildModuleApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/payments', paymentsIndexRouter.default || paymentsIndexRouter);
  return app;
}

/**
 * Execution router only, with identity injected and NO module-level gate.
 * Proves the domain itself still refuses unauthorised roles (defence in depth)
 * even if the edge gate were bypassed.
 */
function buildExecutionApp(identity?: TestIdentity) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (identity) req.user = identity;
    next();
  });
  app.use('/api/v1/payments/refund-requests', executionRouter);
  return app;
}

function moduleHeaders(role: string) {
  return {
    Authorization: 'Bearer test-token',
    'x-test-role': role,
    'x-test-user-id': String(ACTOR_ID),
  };
}

const EXECUTE_URL = `/api/v1/payments/refund-requests/${REQ_ID}/execute`;

const EXEC_ROUTES_SRC = join(
  __dirname,
  '../../../server/modules/payments/routes/refund-request-execution.routes.ts',
);
const DECISION_ROUTES_SRC = join(
  __dirname,
  '../../../server/modules/payments/routes/refund-request.routes.ts',
);
const INDEX_SRC = join(__dirname, '../../../server/modules/payments/routes/index.ts');

beforeEach(() => {
  mockBoom = false;
  mockDeps = createHarness().deps;
});

/* ─────────────────────────────────────────────────────────────────────── */

describe('C36-DE-06 authentication', () => {
  it('401 when the module edge has no authenticated actor', async () => {
    const res = await request(buildModuleApp()).post(EXECUTE_URL).send({});
    expect(res.status).toBe(401);
  });

  it('401 when the execution edge has no authenticated actor', async () => {
    const res = await request(buildExecutionApp()).post(EXECUTE_URL).send({});
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      error: REFUND_EXECUTION_HTTP_EDGE.UNAUTHENTICATED.code,
    });
  });
});

describe('C36-DE-06 authorization (real module composition)', () => {
  it('supervisor → 403', async () => {
    const res = await request(buildModuleApp())
      .post(EXECUTE_URL)
      .set(moduleHeaders('supervisor'));
    expect(res.status).toBe(403);
  });

  it('agent → 403', async () => {
    const res = await request(buildModuleApp())
      .post(EXECUTE_URL)
      .set(moduleHeaders('agent'));
    expect(res.status).toBe(403);
  });

  it('admin passes the module gate', async () => {
    const res = await request(buildModuleApp())
      .post(EXECUTE_URL)
      .set(moduleHeaders('admin'));
    // Not 401/403: the gate let the request through.
    expect([200, 202, 404, 409]).toContain(res.status);
  });
});

describe('C36-DE-06 authorization (domain, defence in depth)', () => {
  it('refuses supervisor even when the module-level gate is bypassed', async () => {
    const res = await request(buildExecutionApp(SUPERVISOR)).post(EXECUTE_URL).send({});
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('ROLE_NOT_ALLOWED');
  });

  it('refuses agent even when the module-level gate is bypassed', async () => {
    const res = await request(buildExecutionApp(AGENT)).post(EXECUTE_URL).send({});
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('ROLE_NOT_ALLOWED');
  });

  it('manager is allowed', async () => {
    const res = await request(buildExecutionApp(MANAGER)).post(EXECUTE_URL).send({});
    expect(res.status).toBe(200);
    expect(res.body.kind).toBe('executed');
  });
});

describe('C36-DE-06 not found (404)', () => {
  it('malformed id → 404 instead of a driver error leaking as 500', async () => {
    const res = await request(buildExecutionApp(ADMIN))
      .post('/api/v1/payments/refund-requests/not-a-uuid/execute')
      .send({});
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'NOT_FOUND' });
  });

  it('unknown id → 404 NOT_FOUND', async () => {
    const res = await request(buildExecutionApp(ADMIN))
      .post(`/api/v1/payments/refund-requests/${OTHER_ID}/execute`)
      .send({});
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });
});

describe('C36-DE-06 invalid states (409)', () => {
  it('pending → execute → 409 INVALID_TRANSITION', async () => {
    mockDeps = createHarness(seedRow({ status: 'pending' })).deps;
    const res = await request(buildExecutionApp(ADMIN)).post(EXECUTE_URL).send({});
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('INVALID_TRANSITION');
    expect(res.body.detail).toBe('pending -> executing');
  });

  it('rejected → execute → 409 INVALID_TRANSITION', async () => {
    mockDeps = createHarness(seedRow({ status: 'rejected' })).deps;
    const res = await request(buildExecutionApp(ADMIN)).post(EXECUTE_URL).send({});
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('INVALID_TRANSITION');
  });

  it('executing without receipt → 409 EXECUTION_IN_PROGRESS', async () => {
    mockDeps = createHarness(
      seedRow({ status: 'executing', requestVersion: 4 }),
    ).deps;
    const res = await request(buildExecutionApp(ADMIN)).post(EXECUTE_URL).send({});
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('EXECUTION_IN_PROGRESS');
  });

  it('failed → 409 ALREADY_FAILED', async () => {
    mockDeps = createHarness(
      seedRow({
        status: 'failed',
        requestVersion: 5,
        metadata: {
          paymentStatusAtRequest: 'approved',
          [EXECUTION_METADATA_KEY]: { failureReason: 'REFUND_REJECTED' },
        },
      }),
    ).deps;
    const res = await request(buildExecutionApp(ADMIN)).post(EXECUTE_URL).send({});
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('ALREADY_FAILED');
    expect(res.body.detail).toBe('REFUND_REJECTED');
  });

  it('stale expectedVersion → 409 VERSION_CONFLICT, nothing mutated', async () => {
    const harness = createHarness();
    mockDeps = harness.deps;
    const res = await request(buildExecutionApp(ADMIN))
      .post(EXECUTE_URL)
      .send({ expectedVersion: 999 });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('VERSION_CONFLICT');
    expect(harness.requests.get(REQ_ID)!.status).toBe('approved');
    expect(harness.gateway.calls).toHaveLength(0);
  });
});

describe('C36-DE-06 approved → executed (200)', () => {
  it('returns the executed request and the provider receipt', async () => {
    const harness = createHarness();
    mockDeps = harness.deps;

    const res = await request(buildExecutionApp(ADMIN)).post(EXECUTE_URL).send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.kind).toBe('executed');
    expect(res.body.data.status).toBe('executed');
    expect(res.body.receipt).toMatchObject({
      accepted: true,
      provider: 'simulated-refund-gateway',
    });
    expect(harness.gateway.calls).toHaveLength(1);
    expect(harness.applied).toEqual([PAYMENT_ID]);
  });

  it('gateway refuses → 409 EXECUTION_FAILED with no financial step', async () => {
    const harness = createHarness(seedRow(), { mode: 'reject' });
    mockDeps = harness.deps;

    const res = await request(buildExecutionApp(ADMIN)).post(EXECUTE_URL).send({});

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      success: false,
      error: 'EXECUTION_FAILED',
      detail: 'REFUND_REJECTED',
    });
    expect(harness.requests.get(REQ_ID)!.status).toBe('failed');
    expect(harness.attempts).toBe(0);
  });

  it('gateway accepted, financial step failed → 202 retry_required (resumable)', async () => {
    const harness = createHarness();
    harness.failNext = 1;
    mockDeps = harness.deps;

    const res = await request(buildExecutionApp(ADMIN)).post(EXECUTE_URL).send({});

    expect(res.status).toBe(202);
    expect(res.body.kind).toBe('retry_required');
    expect(res.body.detail).toBe('FINANCIAL_UPDATE_FAILED');
    expect(harness.requests.get(REQ_ID)!.status).toBe('executing');
    expect(harness.gateway.calls).toHaveLength(1);

    // The retry resumes and completes without a second provider call.
    const retry = await request(buildExecutionApp(ADMIN)).post(EXECUTE_URL).send({});
    expect(retry.status).toBe(200);
    expect(retry.body.kind).toBe('executed');
    expect(harness.gateway.calls).toHaveLength(1);
    expect(harness.applied).toEqual([PAYMENT_ID]);
  });
});
describe('C36-DE-06 idempotency over HTTP', () => {
  it('replay of the same execution → 200 with no second mutation', async () => {
    const harness = createHarness();
    mockDeps = harness.deps;

    const first = await request(buildExecutionApp(ADMIN)).post(EXECUTE_URL).send({});
    const versionAfterFirst = harness.requests.get(REQ_ID)!.requestVersion;
    const second = await request(buildExecutionApp(ADMIN)).post(EXECUTE_URL).send({});

    expect(first.status).toBe(200);
    expect(first.body.kind).toBe('executed');
    expect(second.status).toBe(200);
    expect(second.body.kind).toBe('idempotent');
    expect(second.body.data.status).toBe('executed');
    expect(harness.gateway.calls).toHaveLength(1);
    expect(harness.applied).toEqual([PAYMENT_ID]);
    expect(harness.requests.get(REQ_ID)!.requestVersion).toBe(versionAfterFirst);
  });

  it('two concurrent POSTs from different administrators → exactly one execution', async () => {
    const harness = createHarness();
    mockDeps = harness.deps;

    const [a, b] = await Promise.all([
      request(buildExecutionApp({ id: 111, role: 'admin' })).post(EXECUTE_URL).send({}),
      request(buildExecutionApp({ id: 222, role: 'admin' })).post(EXECUTE_URL).send({}),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);
    expect(harness.gateway.calls).toHaveLength(1);
    expect(harness.applied).toEqual([PAYMENT_ID]);
    expect(harness.requests.get(REQ_ID)!.status).toBe('executed');
  });
});

describe('C36-DE-06 identity is JWT-only', () => {
  it('body.actorId / body.userId cannot choose the executor', async () => {
    const harness = createHarness();
    mockDeps = harness.deps;

    const res = await request(buildExecutionApp(ADMIN))
      .post(EXECUTE_URL)
      .send({ actorId: 999, userId: 999, executedBy: 999 });

    expect(res.status).toBe(200);
    const metadata = harness.requests.get(REQ_ID)!.metadata as {
      execution: { executedBy: number };
    };
    expect(metadata.execution.executedBy).toBe(ACTOR_ID);
  });

  it('body.status cannot override the state machine', async () => {
    const harness = createHarness(seedRow({ status: 'pending' }));
    mockDeps = harness.deps;

    const res = await request(buildExecutionApp(ADMIN))
      .post(EXECUTE_URL)
      .send({ status: 'executed', target: 'executed' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('INVALID_TRANSITION');
    expect(harness.requests.get(REQ_ID)!.status).toBe('pending');
  });
});

describe('C36-DE-06 no internal detail leaks', () => {
  it('500 never exposes SQL, driver messages or module paths', async () => {
    mockBoom = true;
    const res = await request(buildExecutionApp(ADMIN)).post(EXECUTE_URL).send({});

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: REFUND_EXECUTION_HTTP_EDGE.INTERNAL_ERROR.code,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/SELECT|INSERT|UPDATE |node_modules/);
    mockBoom = false;
  });
});

describe('C36-DE-06 explicit HTTP error contract', () => {
  it('never drifts from the service-side REFUND_EXECUTION_HTTP_STATUS map', () => {
    expect(Object.keys(REFUND_EXECUTION_HTTP_CONTRACT).sort()).toEqual(
      Object.keys(REFUND_EXECUTION_HTTP_STATUS).sort(),
    );

    const statuses: Record<string, number> = {};
    for (const [key, value] of Object.entries(REFUND_EXECUTION_HTTP_CONTRACT)) {
      statuses[key] = value.status;
    }
    expect(statuses).toEqual(REFUND_EXECUTION_HTTP_STATUS);
  });

  it('maps every domain failure to the agreed HTTP code', () => {
    expect(REFUND_EXECUTION_HTTP_CONTRACT).toEqual({
      ACTOR_REQUIRED: { status: 401, code: 'UNAUTHENTICATED' },
      ROLE_NOT_ALLOWED: { status: 403, code: 'ROLE_NOT_ALLOWED' },
      NOT_FOUND: { status: 404, code: 'NOT_FOUND' },
      INVALID_TRANSITION: { status: 409, code: 'INVALID_TRANSITION' },
      VERSION_CONFLICT: { status: 409, code: 'VERSION_CONFLICT' },
      EXECUTION_IN_PROGRESS: { status: 409, code: 'EXECUTION_IN_PROGRESS' },
      ALREADY_FAILED: { status: 409, code: 'ALREADY_FAILED' },
    });
  });

  it('keeps the edge-only outcomes explicit', () => {
    expect(REFUND_EXECUTION_HTTP_EDGE).toEqual({
      UNAUTHENTICATED: { status: 401, code: 'UNAUTHENTICATED' },
      INVALID_REQUEST_ID: { status: 404, code: 'NOT_FOUND' },
      INTERNAL_ERROR: { status: 500, code: 'INTERNAL_ERROR' },
    });
  });
});

/* ─────────────────────────────────────────────────────────────────────────
 * STATIC ISOLATION — the execution slice must stay in its own file and must
 * not touch money or the database directly.
 * ───────────────────────────────────────────────────────────────────────── */

describe('C36-DE-06 static isolation', () => {
  const execSrc = readFileSync(EXEC_ROUTES_SRC, 'utf8');
  const decisionSrc = readFileSync(DECISION_ROUTES_SRC, 'utf8');
  const indexSrc = readFileSync(INDEX_SRC, 'utf8');

  it('the execution route lives only in its own file', () => {
    expect(execSrc).toContain("/:id/execute");
    expect(decisionSrc).not.toContain('/execute');
  });

  it('the decision file still owns request + decision only', () => {
    expect(decisionSrc).toContain("/:id/approve");
    expect(decisionSrc).toContain("/:id/reject");
    expect(decisionSrc).not.toMatch(/executeRefundRequest|simulated-refund-gateway/);
  });

  it('the router is mounted at the module boundary', () => {
    expect(indexSrc).toContain("from './refund-request-execution.routes'");
    expect(indexSrc).toMatch(/use\(\s*'\/refund-requests'/);
  });

  it('the HTTP file never imports a driver, a schema or a raw SQL builder', () => {
    expect(execSrc).not.toMatch(/from '\.\.\/\.\.\/\.\.\/\.\.\/lib\/db'/);
    expect(execSrc).not.toMatch(/drizzle-orm|better-sqlite3|postgres|pg\b/);
    expect(execSrc).not.toMatch(/INSERT|UPDATE |DELETE FROM|SELECT /);
    expect(execSrc).not.toMatch(/process\.env/);
  });

  it('the gateway remains a clearly labelled simulation', () => {
    const gatewaySrc = readFileSync(
      join(__dirname, '../../../server/modules/payments/lib/simulated-refund.gateway.ts'),
      'utf8',
    );
    expect(gatewaySrc).toMatch(/SIMULAT/i);
    expect(gatewaySrc).toMatch(/simulated-refund-gateway/);
    expect(gatewaySrc).not.toMatch(/process\.env|fetch\(|axios/);
  });

  it('no real provider or migration was introduced by this slice', () => {
    expect(indexSrc).not.toMatch(/stripe|pagarme|mercadopago|adyen/i);
    expect(execSrc).not.toMatch(/\bmigration|ALTER TABLE|CREATE TABLE/i);
  });
});





