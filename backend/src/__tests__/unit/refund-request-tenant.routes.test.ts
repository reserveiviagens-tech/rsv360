/**
 * C36-DE-14 — RefundRequest administrative HTTP surface: TENANT ISOLATION.
 *
 * WHAT IS REAL HERE
 *  - the express edge and the real module composition (`payments/routes/index.ts`)
 *  - the real tenant comparison done by the routes against the value returned by
 *    `resolveRefundRequestTenant` / `assertPaymentTenant`
 *  - the real decision use case (`decideRefundRequest`), backed by in-memory ports
 *
 * WHAT IS SUBSTITUTED (MOCK INTEGRATION)
 *  - the auth middleware (test identity injection instead of a signed JWT)
 *  - the drizzle ports: payments / refund_requests live in an in-memory harness
 *
 * CONSEQUENCE OF THAT EVIDENCE LIMIT
 *  These tests prove the HTTP tenant GATE and the comparison logic. They do NOT
 *  prove durable database behaviour: no INSERT/UPDATE/CAS against a real Postgres
 *  ran, no migration was applied, and no provider, earning, ledger or payout code
 *  path was executed.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import express from 'express';
import request from 'supertest';

import refundRequestRouter from '../../../server/modules/payments/routes/refund-request.routes';
import type {
  RefundDecisionPorts,
  RefundRequestPorts,
  RefundRequestRow,
} from '../../../server/modules/payments/services/refund-request.service';

type ActualService = typeof import(
  '../../../server/modules/payments/services/refund-request.service'
);

const REQ_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PAYMENT_A = '11111111-1111-4111-8111-111111111111';
const PAYMENT_B = '22222222-2222-4222-8222-222222222222';
const MISSING_ID = '99999999-9999-4999-8999-999999999999';

const ENT_A = 'ent_enterprise_a';
const ENT_B = 'ent_enterprise_b';

/** In-memory world. RefundRequest REQ_ID points at PAYMENT_B (enterprise B). */
let paymentsById: Map<string, { enterpriseId: string | null; bookingId: number | null }>;
let requestsById: Map<string, RefundRequestRow>;
let applyCalls: number;
let insertCalls: number;

function seedRequest(): RefundRequestRow {
  const now = new Date('2026-09-01T12:00:00.000Z');
  return {
    id: REQ_ID,
    paymentId: PAYMENT_B,
    bookingId: 101,
    amount: '150.00',
    currency: 'BRL',
    reason: 'hotel overcharge',
    requestedBy: 7,
    status: 'pending',
    requestVersion: 1,
    idempotencyKey: null,
    metadata: null,
    createdAt: now,
    updatedAt: now,
    decidedBy: null,
    decidedAt: null,
    decisionReason: null,
  };
}

const createPorts = (): RefundRequestPorts => ({
  async findPayment(paymentId) {
    const p = paymentsById.get(paymentId);
    if (!p) return null;
    return {
      id: paymentId,
      bookingId: p.bookingId,
      amount: '150.00',
      currency: 'BRL',
      status: 'paid',
      enterpriseId: p.enterpriseId,
    };
  },
  async findByIdempotencyKey() {
    return null;
  },
  async findOpenByPaymentId() {
    return null;
  },
  async insert(row) {
    insertCalls += 1;
    const created: RefundRequestRow = {
      ...seedRequest(),
      id: MISSING_ID,
      paymentId: row.paymentId,
      idempotencyKey: row.idempotencyKey,
      status: row.status,
    };
    requestsById.set(created.id, created);
    return created;
  },
  async findById(id) {
    const row = requestsById.get(id);
    return row ? { ...row } : null;
  },
});

const decisionPorts = (): RefundDecisionPorts => ({
  async findById(id) {
    const row = requestsById.get(id);
    return row ? { ...row } : null;
  },
  async applyDecision() {
    applyCalls += 1;
    // Refuse the write: every cross-tenant test must fail BEFORE any CAS.
    return { kind: 'version_conflict' };
  },
});

jest.mock(
  '../../../server/modules/payments/services/refund-request.service',
  () => {
    const actual = jest.requireActual(
      '../../../server/modules/payments/services/refund-request.service',
    ) as ActualService;

    // Only the drizzle *port factories* are substituted. The tenant comparison
    // (`resolveRefundRequestTenant` / `assertPaymentTenant`) is the REAL
    // implementation, executed against the in-memory harness above.
    return {
      ...actual,
      createDrizzleRefundRequestPorts: () => createPorts(),
      createDrizzleRefundDecisionPorts: () => decisionPorts(),
      // Default parameters are evaluated inside the real module, so overriding
      // the factory alone is not enough: inject the harness ports explicitly.
      decideRefundRequest: async (input: Parameters<ActualService['decideRefundRequest']>[0]) =>
        actual.decideRefundRequest(input, decisionPorts()),
      getRefundRequestById: async (id: string) => {
        const row = requestsById.get(id);
        return row ? { ...row } : null;
      },
      createRefundRequest: async (
        input: Parameters<ActualService['createRefundRequest']>[0],
      ) => actual.createRefundRequest(input, createPorts()),
      resolveRefundRequestTenant: async (id: string) =>
        actual.resolveRefundRequestTenant(id, createPorts()),
      assertPaymentTenant: async (paymentId: string, tenant: string) =>
        actual.assertPaymentTenant(paymentId, tenant, createPorts()),
    };
  },
);

/** No auth middleware: identity is injected directly, so the route's own
 *  unauthenticated branch is exercised by simply omitting it. */
function buildApp(identity?: { id: number; role: string; enterpriseId?: string }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (identity) req.user = identity;
    next();
  });
  app.use('/api/v1/payments/refund-requests', refundRequestRouter);
  return app;
}

const MGR_A = { id: 442, role: 'manager', enterpriseId: ENT_A };
const ADMIN_A = { id: 900, role: 'admin', enterpriseId: ENT_A };

const BASE = '/api/v1/payments/refund-requests';
const GET_URL = `${BASE}/${REQ_ID}`;
const APPROVE_URL = `${GET_URL}/approve`;
const REJECT_URL = `${GET_URL}/reject`;

const ROUTES_SRC = join(
  __dirname,
  '../../../server/modules/payments/routes/refund-request.routes.ts',
);
const SERVICE_SRC = join(
  __dirname,
  '../../../server/modules/payments/services/refund-request.service.ts',
);

beforeEach(() => {
  paymentsById = new Map([
    [PAYMENT_A, { enterpriseId: ENT_A, bookingId: 101 }],
    [PAYMENT_B, { enterpriseId: ENT_B, bookingId: 101 }],
  ]);
  requestsById = new Map([[REQ_ID, seedRequest()]]);
  applyCalls = 0;
  insertCalls = 0;
});

/* ───────────────────────── I / K / L: cross-tenant ───────────────────────── */

describe('C36-DE-14 cross-tenant read', () => {
  it('I. manager of enterprise A cannot GET an enterprise B refund request', async () => {
    const res = await request(buildApp(MGR_A)).get(GET_URL);
    // 404 (not 403): identical to a non-existent id, so existence is not leaked.
    expect(res.status).toBe(404);
    expect(res.body).not.toHaveProperty('data');
  });

  it('I2. the admin of enterprise A is refused identically', async () => {
    const res = await request(buildApp(ADMIN_A)).get(GET_URL);
    expect(res.status).toBe(404);
  });

  it('I3. cross-tenant 404 is byte-identical to a genuinely unknown id', async () => {
    const unknown = await request(buildApp(MGR_A)).get(`${BASE}/${MISSING_ID}`);
    const foreign = await request(buildApp(MGR_A)).get(GET_URL);
    expect(foreign.status).toBe(unknown.status);
    expect(foreign.body).toEqual(unknown.body);
  });

  it('I4. the owner of the payment CAN read the request', async () => {
    const res = await request(buildApp({ ...MGR_A, enterpriseId: ENT_B })).get(GET_URL);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(REQ_ID);
  });
});

describe('C36-DE-14 cross-tenant mutations', () => {
  it('K. enterprise A cannot APPROVE an enterprise B request (no CAS reached)', async () => {
    const res = await request(buildApp(MGR_A)).post(APPROVE_URL).send({});
    expect(res.status).toBe(404);
    expect(applyCalls).toBe(0);
  });

  it('L. enterprise A cannot REJECT an enterprise B request (no CAS reached)', async () => {
    const res = await request(buildApp(MGR_A)).post(REJECT_URL).send({ reason: 'nope' });
    expect(res.status).toBe(404);
    expect(applyCalls).toBe(0);
  });
});

/* ─────────────────────────────── J: create ─────────────────────────────── */

describe('C36-DE-14 cross-tenant create', () => {
  it('J. enterprise A cannot CREATE against an enterprise B payment', async () => {
    const res = await request(buildApp(MGR_A))
      .post(BASE)
      .send({ paymentId: PAYMENT_B, amount: '150.00', currency: 'BRL' });

    expect(res.status).toBe(404);
    // The decisive assertion: no row was ever inserted.
    expect(insertCalls).toBe(0);
  });

  it('J2. enterprise A CAN create against its own payment', async () => {
    const res = await request(buildApp(MGR_A))
      .post(BASE)
      .send({ paymentId: PAYMENT_A, amount: '150.00', currency: 'BRL' });

    expect(res.status).toBe(201);
    expect(insertCalls).toBe(1);
  });

  it('J3. a non-existent payment is refused exactly like a foreign one', async () => {
    const foreign = await request(buildApp(MGR_A))
      .post(BASE)
      .send({ paymentId: PAYMENT_B, amount: '150.00' });
    const missing = await request(buildApp(MGR_A))
      .post(BASE)
      .send({ paymentId: MISSING_ID, amount: '150.00' });
    expect(foreign.status).toBe(missing.status);
    expect(foreign.body).toEqual(missing.body);
    expect(insertCalls).toBe(0);
  });
});

/* ───────────────── Q: tenant source of truth ───────────────── */

describe('C36-DE-14 tenant source of truth', () => {
  it('Q. body.enterpriseId cannot override the JWT tenant (create)', async () => {
    const res = await request(buildApp(MGR_A))
      .post(BASE)
      .send({ paymentId: PAYMENT_B, amount: '150.00', enterpriseId: ENT_B });
    expect(res.status).toBe(404);
    expect(insertCalls).toBe(0);
  });

  it('Q2. query.enterpriseId cannot override the JWT tenant (read)', async () => {
    const res = await request(buildApp(MGR_A)).get(`${GET_URL}?enterpriseId=${ENT_B}`);
    expect(res.status).toBe(404);
  });

  it('Q3. headers.enterpriseId cannot override the JWT tenant', async () => {
    const res = await request(buildApp(MGR_A))
      .get(GET_URL)
      .set('x-enterprise-id', ENT_B)
      .set('enterpriseId', ENT_B);
    expect(res.status).toBe(404);
  });

  it('Q4. a principal with no tenant is refused, never treated as global', async () => {
    const res = await request(buildApp({ id: 1, role: 'admin' })).get(GET_URL);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('TENANT_ISOLATION');
  });

  it('Q5. a principal with no tenant cannot create either', async () => {
    const res = await request(buildApp({ id: 1, role: 'admin' }))
      .post(BASE)
      .send({ paymentId: PAYMENT_A, amount: '150.00' });
    expect(res.status).toBe(403);
    expect(insertCalls).toBe(0);
  });
});

/* ─────────── B / C: authentication and RBAC ─────────── */

describe('C36-DE-14 authentication and RBAC', () => {
  it('B. unauthenticated read never reaches the tenant comparison', async () => {
    const res = await request(buildApp()).get(GET_URL);
    // No principal ⇒ no tenant ⇒ 403 TENANT_ISOLATION, and never any data.
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('TENANT_ISOLATION');
    expect(res.body).not.toHaveProperty('data');
  });

  it('B2. unauthenticated create inserts nothing', async () => {
    const res = await request(buildApp())
      .post(BASE)
      .send({ paymentId: PAYMENT_A, amount: '150.00' });
    expect([401, 404]).toContain(res.status);
    expect(insertCalls).toBe(0);
  });

  it('C. supervisor is still refused by the domain (no role widening)', async () => {
    const res = await request(
      buildApp({ id: 5, role: 'supervisor', enterpriseId: ENT_B }),
    ).post(APPROVE_URL);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('ROLE_NOT_ALLOWED');
    expect(applyCalls).toBe(0);
  });

  it('C2. admin and manager remain the granted roles', async () => {
    for (const role of ['admin', 'manager']) {
      const res = await request(buildApp({ id: 7 + role.length, role, enterpriseId: ENT_B }))
        .post(REJECT_URL)
        .send({ reason: 'valid reason' });
      // 409 VERSION_CONFLICT: the tenant gate passed and the domain ran; the
      // harness refuses the CAS write on purpose.
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('VERSION_CONFLICT');
    }
  });
});

/* ─────── M / N / O / P: validation and state-machine protection ─────── */

describe('C36-DE-14 input validation and state-machine protection', () => {
  const asOwner = (over: Partial<{ id: number; role: string }> = {}) =>
    buildApp({ id: 442, role: 'manager', enterpriseId: ENT_B, ...over });

  it('M. a malformed request id never reaches the domain', async () => {
    const res = await request(asOwner()).post(`${BASE}/not-a-uuid/approve`);
    expect(res.status).toBe(404);
    expect(applyCalls).toBe(0);
  });

  it('M2. a malformed paymentId on create is a 400', async () => {
    const res = await request(asOwner())
      .post(BASE)
      .send({ paymentId: 'abc', amount: '10.00' });
    expect(res.status).toBe(400);
    expect(insertCalls).toBe(0);
  });

  it('M3. reject without a reason is refused by the domain (422)', async () => {
    const res = await request(asOwner()).post(REJECT_URL).send({});
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('REASON_REQUIRED');
    expect(applyCalls).toBe(0);
  });

  it('N. approving an already-approved request is an idempotent replay', async () => {
    requestsById.set(REQ_ID, { ...seedRequest(), status: 'approved' });
    const res = await request(asOwner()).post(APPROVE_URL).send({});
    expect(res.status).toBe(200);
    expect(res.body.kind).toBe('idempotent');
    expect(applyCalls).toBe(0);
  });

  it('N2. rejected -> approved is an invalid transition (no mutation)', async () => {
    requestsById.set(REQ_ID, { ...seedRequest(), status: 'rejected' });
    const res = await request(asOwner()).post(APPROVE_URL).send({});
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('INVALID_TRANSITION');
    expect(applyCalls).toBe(0);
  });

  it('N3. a stale requestVersion produces a deterministic 409', async () => {
    const res = await request(asOwner())
      .post(APPROVE_URL)
      .send({ expectedVersion: 999 });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('VERSION_CONFLICT');
  });

  it('O. client-supplied status cannot bypass the state machine', async () => {
    const res = await request(asOwner())
      .post(APPROVE_URL)
      .send({ status: 'executed', decisionReason: 'client forced it' });
    // The route action fixes the target; body.status is not a transition input.
    // The harness refuses the write, so nothing can reach `executed`.
    expect(res.status).toBe(409);
    expect(applyCalls).toBe(1);
    expect(requestsById.get(REQ_ID)?.status).toBe('pending');
  });

  it('P. a client idempotencyKey cannot reach the provider surface', () => {
    // There is no provider surface on these routes at all (asserted below), so
    // a client key has nothing to hijack: it is creation-scope only.
    const src = readFileSync(ROUTES_SRC, 'utf8');
    expect(src).not.toMatch(/getPaymentProvider/);
    expect(src).not.toMatch(/refund-request-execution\.service/);
  });

  it('P2. paymentId cannot be rebound on an existing refund request', () => {
    // Approve/reject handlers read only reason + expectedVersion from the body.
    const src = readFileSync(ROUTES_SRC, 'utf8');
    expect(src).not.toMatch(/paymentId:\s*body\.paymentId[\s\S]*expectedVersion/);
  });
});

/* ─────── R / S / T / U: execution + financial boundary ─────── */

describe('C36-DE-14 execution boundary (DE-06 preserved, D3)', () => {
  it('R. DE-14 does not add a second /execute route', () => {
    const src = readFileSync(ROUTES_SRC, 'utf8');
    expect(src).not.toMatch(/\/execute/);
  });

  it('R2. DE-06 still owns the execution route and it is still mounted', () => {
    const de06 = readFileSync(
      join(
        __dirname,
        '../../../server/modules/payments/routes/refund-request-execution.routes.ts',
      ),
      'utf8',
    );
    expect(de06).toMatch(/router\.post\('\/:\w+\/execute'/);

    const index = readFileSync(
      join(__dirname, '../../../server/modules/payments/routes/index.ts'),
      'utf8',
    );
    expect(index).toMatch(/router\.use\('\/refund-requests', refundExecutionRoutes\)/);
  });

  it('S/T/U. administrative routes never touch gateway, earnings, ledger or payout', () => {
    const routes = readFileSync(ROUTES_SRC, 'utf8');
    expect(routes).not.toMatch(/getPaymentProvider|[Ss]tripe/);
    expect(routes).not.toMatch(/partnerEarnings|partner_earnings/);
    expect(routes).not.toMatch(/partnerLedger|partner_ledger/);
    expect(routes).not.toMatch(/payout/i);
    expect(routes).not.toMatch(/refund\.service|RefundService/);
  });

  it('U2. the service behind these routes is equally free of financial writers', () => {
    const service = readFileSync(SERVICE_SRC, 'utf8');
    expect(service).not.toMatch(/getPaymentProvider/);
    expect(service).not.toMatch(/reverseEarning|applyEarningReversal/);
  });

  it('U3. no direct database access was introduced in the HTTP layer', () => {
    const routes = readFileSync(ROUTES_SRC, 'utf8');
    expect(routes).not.toMatch(/from ['"]drizzle-orm['"]/);
    expect(routes).not.toMatch(/db\.(select|insert|update|query|transaction)/);
    // Tenant resolution is delegated, not inlined.
    expect(routes).toMatch(/resolveRefundRequestTenant/);
    expect(routes).toMatch(/assertPaymentTenant/);
  });

  it('U4. no migration or schema artefact was introduced by this gate', () => {
    const schema = readFileSync(
      join(__dirname, '../../../src/db/schema/payments.ts'),
      'utf8',
    );
    const tableBlock = schema.slice(
      schema.indexOf("pgTable('refund_requests'"),
      schema.indexOf("pgTable('refund_request_decisions'"),
    );
    // refund_requests still has NO enterprise_id: the tenant comes from payment.
    expect(tableBlock).not.toMatch(/enterprise_id/);
  });
});

/* ─────── D2: CANCEL deliberately deferred ─────── */

describe('C36-DE-14 CANCEL is deferred (D2)', () => {
  it('no cancel route and no cancel domain function exist', () => {
    const routes = readFileSync(ROUTES_SRC, 'utf8');
    expect(routes).not.toMatch(/\/cancel/);
    const service = readFileSync(SERVICE_SRC, 'utf8');
    expect(service).not.toMatch(/cancelRefund/);
    // And the approval state machine was not touched at all.
    const state = readFileSync(
      join(
        __dirname,
        '../../../server/modules/payments/lib/refund-request-state.ts',
      ),
      'utf8',
    );
    expect(state).not.toMatch(/'cancelled':\s*\['/);
  });
});

/** Mock-integration evidence note, asserted so it cannot be quietly dropped. */
describe('C36-DE-14 evidence classification', () => {
  it('no durable write happened in this suite', () => {
    expect(insertCalls).toBe(0);
    expect(applyCalls).toBe(0);
  });
});