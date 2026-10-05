/**
 * C36-DE-08 P1 header+guards ephemeral PG only.
 */
export {};
const EPHEMERAL_DATABASE_URL = process.env.C36DE08_DATABASE_URL;
if (EPHEMERAL_DATABASE_URL) {
  process.env.DATABASE_URL = EPHEMERAL_DATABASE_URL;
}
const describeWithPostgres = EPHEMERAL_DATABASE_URL ? describe : describe.skip;
if (!EPHEMERAL_DATABASE_URL) {
  console.warn('[C36-DE-08] PG suite SKIPPED — set C36DE08_DATABASE_URL');
}
const ACTOR = { actorId: 4242, actorRole: 'admin' };
let db: any;
let eq: any;
let and: any;
let sql: any;
let closeDbPool: () => Promise<void>;
let refundRequests: any;
let payments: any;
let partners: any;
let partnerEarnings: any;
let partnerLedgerEntries: any;
let BOOKING_PAYMENT_SOURCE: string;
let reconcileRefundRequest: any;
let createDrizzleRefundExecutionPorts: any;
let applyEarningReversalOnPaymentRefund: any;
describeWithPostgres('C36-DE-08 — reconciliation on real PG (ephemeral)', () => {
  const tracked = { requestIds: [] as string[], paymentIds: [] as string[], partnerIds: [] as string[] };
  let fetchSpy: jest.SpyInstance;
  let httpsSpy: jest.SpyInstance;
  let httpSpy: jest.SpyInstance;
  beforeAll(async () => {
    ({ db, closeDbPool } = require('../../../src/db/drizzle'));
    ({ eq, and, sql } = require('drizzle-orm'));
    ({ refundRequests, payments } = require('../../../src/db/schema/payments'));
    ({ partners, partnerEarnings, partnerLedgerEntries } = require('../../../src/db/schema/partners'));
    ({ reconcileRefundRequest } = require('../../../server/modules/payments/services/refund-request-reconciliation.service'));
    ({ createDrizzleRefundExecutionPorts } = require('../../../server/modules/payments/services/refund-request-execution.ports'));
    ({ applyEarningReversalOnPaymentRefund } = require('../../../../server/modules/partners/services/partner-earning-on-refund.service'));
    ({ BOOKING_PAYMENT_SOURCE } = require('../../../../server/modules/partners/services/partner-earning-writer.types'));
    const probe = await db.execute(sql`select current_database() as db`);
    if (probe.rows[0].db !== String(EPHEMERAL_DATABASE_URL).split('/').pop()) {
      throw new Error('refusing to run: wrong database');
    }
    console.log(`[C36-DE-08] connected database=${probe.rows[0].db}`);
    const forbid = (l: string) => () => {
      throw new Error(`C36DE08_NETWORK_FORBIDDEN(${l})`);
    };
    fetchSpy = jest.spyOn(globalThis as any, 'fetch').mockImplementation(forbid('fetch'));
    httpsSpy = jest.spyOn(require('node:https'), 'request').mockImplementation(forbid('https'));
    httpSpy = jest.spyOn(require('node:http'), 'request').mockImplementation(forbid('http'));
  });
  afterAll(async () => {
    if (!db) return;
    try {
      for (const id of tracked.requestIds) {
        await db.delete(refundRequests).where(eq(refundRequests.id, id));
      }
      for (const pid of tracked.paymentIds) {
        await db.delete(partnerLedgerEntries).where(eq(partnerLedgerEntries.idempotencyKey, `booking_payment_debit:${pid}`));
        await db.delete(partnerEarnings).where(and(eq(partnerEarnings.sourceType, BOOKING_PAYMENT_SOURCE), eq(partnerEarnings.sourceId, pid)));
        await db.delete(payments).where(eq(payments.id, pid));
      }
      for (const id of tracked.partnerIds) {
        await db.delete(partners).where(eq(partners.id, id));
      }
      console.log('[C36-DE-08] cleanup done');
    } finally {
      if (fetchSpy) fetchSpy.mockRestore();
      if (httpsSpy) httpsSpy.mockRestore();
      if (httpSpy) httpSpy.mockRestore();
      await closeDbPool();
    }
  });
  test('P0 guard proves ephemeral wiring', async () => {
    expect(EPHEMERAL_DATABASE_URL).toBeTruthy();
    expect(db).toBeTruthy();
  });
  function newUuid(): string {
    return require('node:crypto').randomUUID() as string;
  }
  function probeFor(mode: 'confirmed' | 'denied' | 'unknown') {
    const calls: any[] = [];
    return {
      name: 'c36de08-probe-double',
      calls,
      async queryRefund(request: any) {
        calls.push({ ...request });
        if (mode === 'confirmed') {
          return {
            kind: 'confirmed' as const,
            externalRef: `probe_ref_${request.requestId}`,
            providerStatus: 'refunded',
            confirmedAt: new Date().toISOString(),
          };
        }
        if (mode === 'denied') {
          return { kind: 'denied' as const, code: 'REFUND_NOT_FOUND', message: 'provider does not hold this refund' };
        }
        return { kind: 'unknown' as const, detail: 'PROBE_UNKNOWN' };
      },
    };
  }
  function realFinance(finCalls: any[]) {
    return async ({ paymentId, requestId }: any) => {
      finCalls.push({ paymentId, requestId });
      const result = await applyEarningReversalOnPaymentRefund(paymentId);
      return { kind: 'applied' as const, detail: `de08|payment_status=${result.paymentStatus}` };
    };
  }
  function depsWithProbe(probe: any, financial: any) {
    return { ports: createDrizzleRefundExecutionPorts(), probe, applyFinancialUpdate: financial };
  }
  async function seedExecuting() {
    const tag = `de08_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const [partner] = await db.insert(partners).values({ code: tag, displayName: `C36-DE-08 ${tag}` }).returning({ id: partners.id });
    const [payment] = await db.insert(payments).values({
      enterpriseId: newUuid(), provider: 'mercadopago', method: 'pix', status: 'approved',
      amount: '200.00', currency: 'BRL', description: 'C36-DE-08 ephemeral fixture',
    }).returning({ id: payments.id });
    await db.insert(partnerEarnings).values({
      partnerId: partner.id, sourceType: BOOKING_PAYMENT_SOURCE, sourceId: payment.id,
      amountCents: 20000, currency: 'BRL', status: 'confirmed',
    });
    const [draft] = await db.insert(refundRequests).values({
      paymentId: payment.id, amount: '200.00', currency: 'BRL',
      reason: 'c36-de-08 ephemeral fixture', status: 'approved', requestVersion: 1,
      metadata: { paymentStatusAtRequest: 'approved' },
    }).returning();
    const claimPorts = createDrizzleRefundExecutionPorts();
    const claimed = await claimPorts.claim({
      requestId: draft.id, executedBy: ACTOR.actorId, expectedVersion: 1,
      metadata: { paymentStatusAtRequest: 'approved', claim: { claimedBy: ACTOR.actorId } },
    });
    if (claimed.kind !== 'updated') throw new Error('fixture claim failed');
    tracked.partnerIds.push(partner.id);
    tracked.paymentIds.push(payment.id);
    tracked.requestIds.push(draft.id);
    return { tag, partnerId: partner.id, paymentId: payment.id, requestId: draft.id };
  }
  async function seedExecutingWithReceipt() {
    const fx = await seedExecuting();
    const ports = createDrizzleRefundExecutionPorts();
    const [before] = await db.select().from(refundRequests).where(eq(refundRequests.id, fx.requestId)).limit(1);
    const receipt = {
      accepted: true, provider: 'simulated-refund-gateway', externalRef: `sim_refund_${fx.requestId}`,
      providerStatus: 'simulated_accepted', acceptedAt: new Date().toISOString(),
    };
    const recorded = await ports.recordReceipt({
      requestId: fx.requestId, executedBy: ACTOR.actorId, expectedVersion: before.requestVersion,
      metadata: { ...before.metadata, refundRequestExecution: { receipt, gatewayAccepted: true } },
    });
    if (recorded.kind !== 'updated') throw new Error('fixture recordReceipt failed');
    return fx;
  }
  async function countDebits(paymentId: string) {
    const rows = await db.select({ id: partnerLedgerEntries.id }).from(partnerLedgerEntries)
      .where(eq(partnerLedgerEntries.idempotencyKey, `booking_payment_debit:${paymentId}`));
    return rows.length;
  }
  test('P1 unknown probe keeps executing: no debit, same version', async () => {
    const fx = await seedExecuting();
    const [before] = await db.select().from(refundRequests).where(eq(refundRequests.id, fx.requestId)).limit(1);
    const probe = probeFor('unknown');
    const finCalls: any[] = [];
    const out = await reconcileRefundRequest({ requestId: fx.requestId, ...ACTOR }, depsWithProbe(probe, realFinance(finCalls)));
    expect(out.kind).toBe('still_executing');
    expect(probe.calls).toHaveLength(1);
    expect(finCalls).toHaveLength(0);
    const [req] = await db.select().from(refundRequests).where(eq(refundRequests.id, fx.requestId)).limit(1);
    expect(req.status).toBe('executing');
    expect(req.requestVersion).toBe(before.requestVersion);
    expect(await countDebits(fx.paymentId)).toBe(0);
    console.log(`[C36-DE-08][P1] status=${req.status} debits=0`);
  });
  test('P2 denied probe finalizes failed with zero financial effect', async () => {
    const fx = await seedExecuting();
    const probe = probeFor('denied');
    const finCalls: any[] = [];
    const out = await reconcileRefundRequest({ requestId: fx.requestId, ...ACTOR }, depsWithProbe(probe, realFinance(finCalls)));
    expect(out.kind).toBe('failed');
    expect(finCalls).toHaveLength(0);
    const [req] = await db.select().from(refundRequests).where(eq(refundRequests.id, fx.requestId)).limit(1);
    expect(req.status).toBe('failed');
    expect(await countDebits(fx.paymentId)).toBe(0);
    console.log(`[C36-DE-08][P2] status=${req.status} finance=0`);
  });
  test('P3 confirmed probe executes exactly once: 1 debit, 1 receipt', async () => {
    const fx = await seedExecuting();
    const probe = probeFor('confirmed');
    const finCalls: any[] = [];
    const out = await reconcileRefundRequest({ requestId: fx.requestId, ...ACTOR }, depsWithProbe(probe, realFinance(finCalls)));
    expect(out.kind).toBe('executed');
    expect(finCalls).toHaveLength(1);
    expect(probe.calls).toHaveLength(1);
    const [req] = await db.select().from(refundRequests).where(eq(refundRequests.id, fx.requestId)).limit(1);
    expect(req.status).toBe('executed');
    expect(await countDebits(fx.paymentId)).toBe(1);
    console.log(`[C36-DE-08][P3] status=${req.status} debits=1 finance=1`);
  });
  test('P4 concurrent reconcilers: exactly one winner, no duplicate debit', async () => {
    const fx = await seedExecutingWithReceipt();
    const N = 6;
    const outs: any[] = [];
    const finCalls: any[] = [];
    await Promise.all(Array.from({ length: N }, async () => {
      const probe = probeFor('confirmed');
      const out = await reconcileRefundRequest({ requestId: fx.requestId, ...ACTOR }, depsWithProbe(probe, realFinance(finCalls)));
      outs.push(out.kind);
    }));
    const executed = outs.filter((k) => k === 'executed').length;
    expect(executed).toBe(1);
    expect(await countDebits(fx.paymentId)).toBe(1);
    const [req] = await db.select().from(refundRequests).where(eq(refundRequests.id, fx.requestId)).limit(1);
    expect(req.status).toBe('executed');
    console.log(`[C36-DE-08][P4] N=${N} executed=${executed} debits=1 outs=${outs.sort().join(',')}`);
  });
  test('P5 repeat reconcile is idempotent: no second debit', async () => {
    const fx = await seedExecuting();
    const probe = probeFor('confirmed');
    const finCalls: any[] = [];
    const deps = depsWithProbe(probe, realFinance(finCalls));
    expect((await reconcileRefundRequest({ requestId: fx.requestId, ...ACTOR }, deps)).kind).toBe('executed');
    expect(await countDebits(fx.paymentId)).toBe(1);
    const second = await reconcileRefundRequest({ requestId: fx.requestId, ...ACTOR }, deps);
    expect(second.kind).toBe('already_executed');
    expect(await countDebits(fx.paymentId)).toBe(1);
    console.log(`[C36-DE-08][P5] second=${second.kind} debits=1`);
  });
});
