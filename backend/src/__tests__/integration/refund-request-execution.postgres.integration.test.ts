/**
 * C36-DE-07 — RefundRequest EXECUTION against a REAL PostgreSQL (ephemeral).
 *
 * This suite replaces the in-memory CAS doubles of C36-DE-06 with the real Drizzle
 * adapter and a real PostgreSQL server, and proves at the database level what
 * DE-06 could only prove by inspection:
 *
 *   1. N concurrent executors => exactly ONE wins the compare-and-set;
 *   2. the losers are refused (conflict/stale) with NO duplicated financial effect;
 *   3. `request_version` is honoured by PostgreSQL (rowCount = 0 on stale CAS);
 *   4. payment / earning / ledger stay atomically consistent (no orphan debit);
 *   5. a gateway failure or timeout NEVER produces a false `executed`;
 *   6. the R3 fail-closed state (`executing` without receipt) still refuses;
 *   7. no external gateway is reachable (only injected/mocked gateways are used);
 *   8. no migration is applied to a durable database;
 *   9. no staging/production resource is touched.
 *
 * HOW TO RUN (operator, explicit):
 *   cd backend
 *   node scripts/c36de07-ephemeral-pg.mjs up      # throwaway pgvector container
 *   $env:C36DE07_DATABASE_URL='<printed URL>'
 *   npx jest src/__tests__/integration/refund-request-execution.postgres.integration.test.ts --runInBand
 *   node scripts/c36de07-ephemeral-pg.mjs down    # container + data destroyed
 *
 * WITHOUT C36DE07_DATABASE_URL the suite is skipped and imports no application
 * module, so the default `npm test` baseline is untouched.
 *
 * The suite NEVER calls `applyTestMigrations` / `npm run migrate`: migrations are
 * applied only by the explicit ephemeral harness above.
 */

const EPHEMERAL_DATABASE_URL = process.env.C36DE07_DATABASE_URL;

/**
 * `src/db/drizzle` builds its Pool at import time, so the ephemeral URL has to be
 * in place BEFORE any application module is required. The value injected by the
 * jest `setupFiles` env defaults is overwritten here on purpose.
 */
if (EPHEMERAL_DATABASE_URL) {
  process.env.DATABASE_URL = EPHEMERAL_DATABASE_URL;
}

const describeWithPostgres = EPHEMERAL_DATABASE_URL ? describe : describe.skip;

if (!EPHEMERAL_DATABASE_URL) {
  console.warn(
    '[C36-DE-07] PostgreSQL concurrency suite SKIPPED — set C36DE07_DATABASE_URL ' +
      '(see backend/scripts/c36de07-ephemeral-pg.mjs up)',
  );
}

const ADMIN_ACTOR = { actorId: 4242, actorRole: 'admin' };

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
let executeRefundRequest: any;
let createDrizzleRefundExecutionPorts: any;
let createProductionExecutionDeps: any;
let createSimulatedRefundGateway: any;
let SIMULATED_REFUND_GATEWAY_NAME: string;
let applyEarningReversalOnPaymentRefund: any;
let reverseEarningForPaymentRefund: any;
let readExecutionMetadata: any;
let readProviderReceipt: any;
let EXECUTION_METADATA_KEY: string;

describeWithPostgres('C36-DE-07 — RefundRequest execution on real PostgreSQL (ephemeral)', () => {
  const tracked = {
    requestIds: [] as string[],
    paymentIds: [] as string[],
    partnerIds: [] as string[],
  };

  let fetchSpy: jest.SpyInstance;
  let httpsRequestSpy: jest.SpyInstance;
  let httpRequestSpy: jest.SpyInstance;

  beforeAll(async () => {
    // Late requires (not top-level imports): the shared Pool must be built from the
    // ephemeral DATABASE_URL, which is only correct after the gate above ran.
    ({ db, closeDbPool } = require('../../../src/db/drizzle'));
    ({ eq, and, sql } = require('drizzle-orm'));
    ({ refundRequests, payments } = require('../../../src/db/schema/payments'));
    ({
      partners,
      partnerEarnings,
      partnerLedgerEntries,
    } = require('../../../src/db/schema/partners'));
    ({ executeRefundRequest } = require('../../../server/modules/payments/services/refund-request-execution.service'));
    ({ createDrizzleRefundExecutionPorts } = require('../../../server/modules/payments/services/refund-request-execution.ports'));
    ({ createProductionExecutionDeps } = require('../../../server/modules/payments/services/refund-request-execution.deps'));
    ({
      createSimulatedRefundGateway,
      SIMULATED_REFUND_GATEWAY_NAME,
    } = require('../../../server/modules/payments/lib/simulated-refund.gateway'));
    ({
      applyEarningReversalOnPaymentRefund,
    } = require('../../../../server/modules/partners/services/partner-earning-on-refund.service'));
    ({
      reverseEarningForPaymentRefund,
    } = require('../../../../server/modules/partners/services/partner-earning-reversal.service'));
    ({ BOOKING_PAYMENT_SOURCE } = require('../../../../server/modules/partners/services/partner-earning-writer.types'));
    ({
      readExecutionMetadata,
      readProviderReceipt,
      EXECUTION_METADATA_KEY,
    } = require('../../../server/modules/payments/services/refund-request-execution.service'));

    // ── Guard: the suite must be wired to the EPHEMERAL database only ────────
    const probe = await db.execute(sql`select current_database() as db, version() as version`);
    const row = probe.rows[0];
    const expectedDatabase = String(EPHEMERAL_DATABASE_URL).split('/').pop();
    if (row.db !== expectedDatabase) {
      throw new Error(
        `refusing to run: connected to database "${row.db}", expected the ephemeral "${expectedDatabase}"`,
      );
    }
    console.log(`[C36-DE-07] connected database=${row.db} server=${String(row.version).split(',')[0]}`);

    // ── Guard: no external gateway / provider HTTP may be reached ────────────
    const forbid = (label: string) => () => {
      throw new Error(`C36DE07_NETWORK_FORBIDDEN (${label})`);
    };
    fetchSpy = jest.spyOn(globalThis as any, 'fetch').mockImplementation(forbid('fetch'));
    httpsRequestSpy = jest.spyOn(require('node:https'), 'request').mockImplementation(forbid('https.request'));
    httpRequestSpy = jest.spyOn(require('node:http'), 'request').mockImplementation(forbid('http.request'));
  });

  afterAll(async () => {
    if (!db) return;
    const leftovers: string[] = [];
    try {
      for (const id of tracked.requestIds) {
        await db.delete(refundRequests).where(eq(refundRequests.id, id));
      }
      for (const paymentId of tracked.paymentIds) {
        await db
          .delete(partnerLedgerEntries)
          .where(eq(partnerLedgerEntries.idempotencyKey, `booking_payment_debit:${paymentId}`));
        await db
          .delete(partnerEarnings)
          .where(
            and(
              eq(partnerEarnings.sourceType, BOOKING_PAYMENT_SOURCE),
              eq(partnerEarnings.sourceId, paymentId),
            ),
          );
        await db.delete(payments).where(eq(payments.id, paymentId));
      }
      for (const id of tracked.partnerIds) {
        await db.delete(partners).where(eq(partners.id, id));
      }

      // Objective proof the suite left no residue in the ephemeral database.
      for (const id of tracked.requestIds) {
        if (await readRequest(id)) leftovers.push(`refund_request:${id}`);
      }
      for (const paymentId of tracked.paymentIds) {
        if ((await countDebits(paymentId)) !== 0) leftovers.push(`debit:${paymentId}`);
        if (await readEarning(paymentId)) leftovers.push(`earning:${paymentId}`);
        if (await readPayment(paymentId)) leftovers.push(`payment:${paymentId}`);
      }
      console.log(
        `[C36-DE-07] fixture cleanup: requests=${tracked.requestIds.length} payments=${tracked.paymentIds.length} partners=${tracked.partnerIds.length} leftovers=${leftovers.length}`,
      );
    } finally {
      if (fetchSpy) fetchSpy.mockRestore();
      if (httpsRequestSpy) httpsRequestSpy.mockRestore();
      if (httpRequestSpy) httpRequestSpy.mockRestore();
      await closeDbPool();
    }
    if (leftovers.length > 0) {
      throw new Error(`C36-DE-07 fixture cleanup left residue: ${leftovers.join(', ')}`);
    }
  });

  /* ─────────────────────────────────────────────────────────────────────
   * Utilitários e fixtures
   * ───────────────────────────────────────────────────────────────────── */

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  async function waitUntil(predicate: () => boolean, label: string, timeoutMs = 20000) {
    const started = Date.now();
    while (!predicate()) {
      if (Date.now() - started > timeoutMs) {
        throw new Error(`waitUntil timeout after ${timeoutMs}ms: ${label}`);
      }
      await sleep(5);
    }
  }

  function newUuid(): string {
    return require('node:crypto').randomUUID() as string;
  }

  async function seedFixture(
    options: { status?: string; requestVersion?: number; metadata?: unknown } = {},
  ) {
    const tag = `de07_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const [partner] = await db
      .insert(partners)
      .values({ code: tag, displayName: `C36-DE-07 ${tag}` })
      .returning({ id: partners.id });

    const [payment] = await db
      .insert(payments)
      .values({
        enterpriseId: newUuid(),
        provider: 'mercadopago',
        method: 'pix',
        status: 'approved',
        amount: '150.00',
        currency: 'BRL',
        description: 'C36-DE-07 ephemeral fixture',
      })
      .returning({ id: payments.id });

    const [earning] = await db
      .insert(partnerEarnings)
      .values({
        partnerId: partner.id,
        sourceType: BOOKING_PAYMENT_SOURCE,
        sourceId: payment.id,
        amountCents: 15000,
        currency: 'BRL',
        status: 'confirmed',
      })
      .returning({ id: partnerEarnings.id });

    const [request] = await db
      .insert(refundRequests)
      .values({
        paymentId: payment.id,
        amount: '150.00',
        currency: 'BRL',
        reason: 'c36-de-07 ephemeral fixture',
        status: options.status ?? 'approved',
        requestVersion: options.requestVersion ?? 1,
        metadata: options.metadata ?? { paymentStatusAtRequest: 'approved' },
      })
      .returning();

    tracked.partnerIds.push(partner.id);
    tracked.paymentIds.push(payment.id);
    tracked.requestIds.push(request.id);

    return {
      tag,
      partnerId: partner.id as string,
      paymentId: payment.id as string,
      earningId: earning.id as string,
      requestId: request.id as string,
      request,
    };
  }

  async function readRequest(id: string) {
    const [row] = await db.select().from(refundRequests).where(eq(refundRequests.id, id)).limit(1);
    return row ?? null;
  }

  async function readPayment(id: string) {
    const [row] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return row ?? null;
  }

  async function readEarning(paymentId: string) {
    const [row] = await db
      .select()
      .from(partnerEarnings)
      .where(
        and(
          eq(partnerEarnings.sourceType, BOOKING_PAYMENT_SOURCE),
          eq(partnerEarnings.sourceId, paymentId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async function countDebits(paymentId: string) {
    const rows = await db
      .select({ id: partnerLedgerEntries.id })
      .from(partnerLedgerEntries)
      .where(eq(partnerLedgerEntries.idempotencyKey, `booking_payment_debit:${paymentId}`));
    return rows.length;
  }

  /** Gateway that must never be reached — used to prove a path does not call it. */
  function createForbiddenGateway() {
    const calls: any[] = [];
    return {
      name: 'c36de07-forbidden-gateway',
      calls,
      async createRefund(request: any) {
        calls.push({ ...request });
        throw new Error('C36DE07_GATEWAY_MUST_NOT_BE_CALLED');
      },
    };
  }

  /**
   * Gateway whose acceptance is withheld until `release()` is called. It makes the
   * concurrency scenario deterministic: the winner stays inside the provider call
   * while every loser performs its own claim/read, so all losers observe the row in
   * `executing` and are refused with EXECUTION_IN_PROGRESS.
   */
  function createBarrierGateway() {
    const calls: any[] = [];
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    return {
      name: 'c36de07-barrier-gateway',
      calls,
      release,
      async createRefund(request: any) {
        calls.push({ ...request });
        await barrier;
        return { kind: 'accepted' as const, externalRef: `de07_refund_${request.requestId}`, status: 'accepted' };
      },
    };
  }

  /** Financial step double used only where the outcome must be observed, not applied. */
  function createSpyFinancial() {
    const calls: any[] = [];
    return {
      calls,
      fn: async (input: any) => {
        calls.push({ ...input });
        return { kind: 'applied' as const, detail: 'c36de07_spy_financial' };
      },
    };
  }

  /** Financial step double that always throws (provider accepted, finance failed). */
  function createThrowingFinancial(detail = 'C36DE07_FINANCIAL_UPDATE_FAILED') {
    const calls: any[] = [];
    return {
      calls,
      fn: async (input: any) => {
        calls.push({ ...input });
        throw new Error(detail);
      },
    };
  }

  /** Production composition with an injected gateway (never a real provider). */
  function depsWith(gateway: any, applyFinancialUpdate: any) {
    return {
      ports: createDrizzleRefundExecutionPorts(),
      gateway,
      applyFinancialUpdate,
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * A — CAS / request_version vs. the real PostgreSQL row
   * ═══════════════════════════════════════════════════════════════════════ */

  describe('A — compare-and-set on (status, request_version)', () => {
    it('claim wins once and reports the CURRENT row when the version is stale', async () => {
      const fx = await seedFixture();
      const ports = createDrizzleRefundExecutionPorts();

      const claim = await ports.claim({
        requestId: fx.requestId,
        executedBy: ADMIN_ACTOR.actorId,
        expectedVersion: 1,
        metadata: { claimed: true },
      });
      expect(claim.kind).toBe('updated');
      expect(claim.request.status).toBe('executing');
      expect(claim.request.requestVersion).toBe(2);

      const persisted = await readRequest(fx.requestId);
      expect(persisted.status).toBe('executing');
      expect(persisted.requestVersion).toBe(2);

      // Same expected version again: the UPDATE matches 0 rows (rowCount = 0) and the
      // adapter reloads the row instead of guessing.
      const stale = await ports.claim({
        requestId: fx.requestId,
        executedBy: ADMIN_ACTOR.actorId,
        expectedVersion: 1,
        metadata: { claimed: 'stale' },
      });
      expect(stale.kind).toBe('conflict');
      expect(stale.current.status).toBe('executing');
      expect(stale.current.requestVersion).toBe(2);

      const afterStale = await readRequest(fx.requestId);
      expect(afterStale.requestVersion).toBe(2);
      expect(afterStale.metadata).toEqual({ claimed: true });

      console.log(
        `[C36-DE-07][A1] claim=updated@${claim.request.requestVersion} stale=conflict@${stale.current.requestVersion} metadata_untouched=${JSON.stringify(afterStale.metadata)}`,
      );
    });

    it('only the exact expected version advances: 1 → 2 → 3 → 4, never twice', async () => {
      const fx = await seedFixture();
      const ports = createDrizzleRefundExecutionPorts();

      const claim = await ports.claim({
        requestId: fx.requestId,
        executedBy: ADMIN_ACTOR.actorId,
        expectedVersion: 1,
        metadata: { claimed: true },
      });
      expect(claim.request.requestVersion).toBe(2);

      // A finalize is NOT allowed while the row is `executing` without a receipt —
      // the adapter still honours the CAS, but the service would refuse; here we only
      // assert the version arithmetic of the adapter itself.
      const receipt = await ports.recordReceipt({
        requestId: fx.requestId,
        executedBy: ADMIN_ACTOR.actorId,
        expectedVersion: 2,
        metadata: { claimed: true, receipt: { accepted: true, provider: 'x', externalRef: 'y' } },
      });
      expect(receipt.kind).toBe('updated');
      expect(receipt.request.requestVersion).toBe(3);

      const staleReceipt = await ports.recordReceipt({
        requestId: fx.requestId,
        executedBy: ADMIN_ACTOR.actorId,
        expectedVersion: 2,
        metadata: { claimed: true, receipt: 'stale' },
      });
      expect(staleReceipt.kind).toBe('conflict');
      expect(staleReceipt.current.requestVersion).toBe(3);

      const finalized = await ports.finalize({
        requestId: fx.requestId,
        executedBy: ADMIN_ACTOR.actorId,
        expectedVersion: 3,
        next: 'executed',
        metadata: { claimed: true },
      });
      expect(finalized.kind).toBe('updated');
      expect(finalized.request.status).toBe('executed');
      expect(finalized.request.requestVersion).toBe(4);

      const persisted = await readRequest(fx.requestId);
      expect(persisted.status).toBe('executed');
      expect(persisted.requestVersion).toBe(4);

      console.log(
        `[C36-DE-07][A2] versions=1->2->3->4 stale_receipt=conflict@${staleReceipt.current.requestVersion}`,
      );
    });

    it('8 simultaneous claim() calls on the same version produce exactly one winner', async () => {
      const fx = await seedFixture();
      const ports = createDrizzleRefundExecutionPorts();

      const attempts = await Promise.all(
        Array.from({ length: 8 }, () =>
          ports.claim({
            requestId: fx.requestId,
            executedBy: ADMIN_ACTOR.actorId,
            expectedVersion: 1,
            metadata: { claimed: true },
          }),
        ),
      );

      const winners = attempts.filter((a: any) => a.kind === 'updated');
      const losers = attempts.filter((a: any) => a.kind === 'conflict');
      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(7);
      for (const loser of losers) {
        expect(loser.current.status).toBe('executing');
        expect(loser.current.requestVersion).toBe(2);
      }

      const persisted = await readRequest(fx.requestId);
      expect(persisted.requestVersion).toBe(2);

      console.log(
        `[C36-DE-07][A3] winners=1 losers=7 final_version=${persisted.requestVersion} loser_versions=${[...new Set(losers.map((l: any) => l.current.requestVersion))].join(',')}`,
      );
    });
  });

  /* ═══════════════════════════════════════════════════════════════════════
   * B — N concurrent executors → exactly one winner, no duplicated effect
   * ═══════════════════════════════════════════════════════════════════════ */

  describe('B — simultaneous execution attempts', () => {
    it('8 simultaneous executors: 1 executed, 7 refused while the row is `executing`', async () => {
      const fx = await seedFixture();
      const gateway = createBarrierGateway();
      const financial = createSpyFinancial();
      const deps = depsWith(gateway, financial.fn);

      const N = 8;
      const results: any[] = new Array(N);
      const run = (index: number) =>
        executeRefundRequest(
          {
            actorId: ADMIN_ACTOR.actorId,
            actorRole: 'admin',
            requestId: fx.requestId,
            expectedVersion: 1,
          },
          deps,
        ).then((result: any) => {
          results[index] = result;
          return result;
        });

      const winnerPromise = run(0);
      const loserPromises: Promise<any>[] = [];
      for (let index = 1; index < N; index += 1) loserPromises.push(run(index));

      // The winner is parked inside the (mocked) provider, so every loser performs its
      // own read + CAS while the row is `executing`: the refusal is deterministic.
      await waitUntil(
        () => results.filter(Boolean).length === N - 1,
        'all losers settled while the winner waits in the gateway',
      );
      const persistedDuringContention = await readRequest(fx.requestId);
      expect(persistedDuringContention.status).toBe('executing');
      expect(persistedDuringContention.requestVersion).toBe(2);

      gateway.release();
      await Promise.all([winnerPromise, ...loserPromises]);

      const executed = results.filter((r) => r.kind === 'executed');
      const refused = results.filter((r) => r.kind === 'rejected');
      const reasons = refused.map((r) => r.reason);

      expect(executed).toHaveLength(1);
      expect(refused).toHaveLength(N - 1);
      expect(reasons).toEqual(new Array(N - 1).fill('EXECUTION_IN_PROGRESS'));
      expect(results.filter((r) => r.kind === 'failed')).toHaveLength(0);
      expect(results.filter((r) => r.kind === 'retry_required')).toHaveLength(0);

      // The provider and the financial step ran exactly once.
      expect(gateway.calls).toHaveLength(1);
      expect(financial.calls).toHaveLength(1);
      expect(financial.calls[0].paymentId).toBe(fx.paymentId);

      const persisted = await readRequest(fx.requestId);
      expect(persisted.status).toBe('executed');
      expect(persisted.requestVersion).toBe(4);
      expect(readProviderReceipt(persisted.metadata)?.externalRef).toBe(`de07_refund_${fx.requestId}`);

      console.log(
        `[C36-DE-07][B1] N=${N} executed=1 refused=${refused.length} reasons=${JSON.stringify([...new Set(reasons)])} gateway_calls=${gateway.calls.length} financial_calls=${financial.calls.length} final_version=${persisted.requestVersion}`,
      );
    });

    it('6 simultaneous executions through the PRODUCTION composition never duplicate finance', async () => {
      const fx = await seedFixture();
      const deps = createProductionExecutionDeps();
      const N = 6;

      const results = await Promise.all(
        Array.from({ length: N }, () =>
          executeRefundRequest(
            {
              actorId: ADMIN_ACTOR.actorId,
              actorRole: 'admin',
              requestId: fx.requestId,
              expectedVersion: 1,
            },
            deps,
          ),
        ),
      );

      const executed = results.filter((r: any) => r.kind === 'executed');
      const others = results.filter((r: any) => r.kind !== 'executed');
      expect(executed).toHaveLength(1);
      for (const other of others) {
        expect(['rejected', 'idempotent']).toContain(other.kind);
        if (other.kind === 'rejected') {
          expect(['EXECUTION_IN_PROGRESS', 'VERSION_CONFLICT']).toContain(other.reason);
        }
      }

      const request = await readRequest(fx.requestId);
      const payment = await readPayment(fx.paymentId);
      const earning = await readEarning(fx.paymentId);
      const debits = await countDebits(fx.paymentId);

      expect(request.status).toBe('executed');
      expect(request.requestVersion).toBe(4);
      expect(payment.status).toBe('refunded');
      expect(earning.status).toBe('reversed');
      expect(debits).toBe(1);

      const metadata = readExecutionMetadata(request.metadata);
      expect(metadata.gatewayAccepted).toBe(true);
      expect((metadata.financial as any)?.kind).toBe('applied');
      expect(metadata.provider).toBe(SIMULATED_REFUND_GATEWAY_NAME);

      console.log(
        `[C36-DE-07][B2] N=${N} executed=1 others=${JSON.stringify(others.map((o: any) => `${o.kind}${o.reason ? `:${o.reason}` : ''}`))} payment=${payment.status} earning=${earning.status} debits=${debits} version=${request.requestVersion}`,
      );
    });
  });

  /* ═══════════════════════════════════════════════════════════════════════
   * C — provider refusal / timeout / error ⇒ `failed`, never a false `executed`
   * ═══════════════════════════════════════════════════════════════════════ */

  describe('C — provider failure never produces `executed`', () => {
    it('refusal → failed (terminal) with zero financial effect and no second call', async () => {
      const fx = await seedFixture();
      const gateway = createSimulatedRefundGateway({ behavior: { mode: 'reject' } });
      const financial = createSpyFinancial();

      const result = await executeRefundRequest(
        { actorId: ADMIN_ACTOR.actorId, actorRole: 'admin', requestId: fx.requestId },
        depsWith(gateway, financial.fn),
      );

      expect(result.kind).toBe('failed');
      const request = await readRequest(fx.requestId);
      expect(request.status).toBe('failed');
      expect(request.requestVersion).toBe(3);
      expect(readProviderReceipt(request.metadata)).toBeNull();
      const metadata = readExecutionMetadata(request.metadata);
      expect(metadata.gatewayAccepted).toBe(false);
      expect(metadata.failureReason).toBe('REFUND_REJECTED');

      const payment = await readPayment(fx.paymentId);
      const earning = await readEarning(fx.paymentId);
      expect(payment.status).toBe('approved');
      expect(earning.status).toBe('confirmed');
      expect(await countDebits(fx.paymentId)).toBe(0);
      expect(financial.calls).toHaveLength(0);
      expect(gateway.calls).toHaveLength(1);

      // `failed` is terminal: a retry must not call the provider again.
      const retry = await executeRefundRequest(
        { actorId: ADMIN_ACTOR.actorId, actorRole: 'admin', requestId: fx.requestId },
        depsWith(gateway, financial.fn),
      );
      expect(retry.kind).toBe('rejected');
      expect(retry.reason).toBe('ALREADY_FAILED');
      expect(gateway.calls).toHaveLength(1);
      const afterRetry = await readRequest(fx.requestId);
      expect(afterRetry.status).toBe('failed');
      expect(afterRetry.requestVersion).toBe(3);

      console.log(
        `[C36-DE-07][C1] status=${afterRetry.status} version=${afterRetry.requestVersion} failureReason=${metadata.failureReason} payment=${payment.status} earning=${earning.status} debits=0 gateway_calls=${gateway.calls.length} retry=${retry.reason}`,
      );
    });

    it('timeout → failed with PROVIDER_TIMEOUT and zero financial effect', async () => {
      const fx = await seedFixture();
      const gateway = createSimulatedRefundGateway({ behavior: { mode: 'timeout' } });
      const financial = createSpyFinancial();

      const result = await executeRefundRequest(
        { actorId: ADMIN_ACTOR.actorId, actorRole: 'admin', requestId: fx.requestId },
        depsWith(gateway, financial.fn),
      );

      expect(result.kind).toBe('failed');
      expect(result.detail).toBe('PROVIDER_TIMEOUT');
      const request = await readRequest(fx.requestId);
      expect(request.status).toBe('failed');
      expect(request.requestVersion).toBe(3);
      expect(readExecutionMetadata(request.metadata).failureReason).toBe('PROVIDER_TIMEOUT');
      expect((await readPayment(fx.paymentId)).status).toBe('approved');
      expect((await readEarning(fx.paymentId)).status).toBe('confirmed');
      expect(await countDebits(fx.paymentId)).toBe(0);
      expect(financial.calls).toHaveLength(0);

      console.log(
        `[C36-DE-07][C2] status=${request.status} version=${request.requestVersion} failureReason=PROVIDER_TIMEOUT debits=0 financial_calls=0`,
      );
    });

    it('unexpected provider error → failed with PROVIDER_ERROR and zero financial effect', async () => {
      const fx = await seedFixture();
      const gateway = createSimulatedRefundGateway({ behavior: { mode: 'error' } });
      const financial = createSpyFinancial();

      const result = await executeRefundRequest(
        { actorId: ADMIN_ACTOR.actorId, actorRole: 'admin', requestId: fx.requestId },
        depsWith(gateway, financial.fn),
      );

      expect(result.kind).toBe('failed');
      expect(result.detail).toBe('PROVIDER_ERROR');
      const request = await readRequest(fx.requestId);
      expect(request.status).toBe('failed');
      expect(readExecutionMetadata(request.metadata).failureReason).toBe('PROVIDER_ERROR');
      expect((await readPayment(fx.paymentId)).status).toBe('approved');
      expect(await countDebits(fx.paymentId)).toBe(0);
      expect(financial.calls).toHaveLength(0);

      console.log(
        `[C36-DE-07][C3] status=${request.status} version=${request.requestVersion} failureReason=PROVIDER_ERROR debits=0 financial_calls=0`,
      );
    });
  });

  /* ═══════════════════════════════════════════════════════════════════════
   * D — R3: `executing` without a receipt stays fail-closed
   * ═══════════════════════════════════════════════════════════════════════ */

  describe('D — R3 fail-closed (`executing` without provider receipt)', () => {
    it('refuses with EXECUTION_IN_PROGRESS and mutates absolutely nothing', async () => {
      // Simulates a crash right after the claim: status/version advanced, no receipt.
      const fx = await seedFixture({
        status: 'executing',
        requestVersion: 2,
        metadata: {
          paymentStatusAtRequest: 'approved',
          [EXECUTION_METADATA_KEY]: {
            executedBy: ADMIN_ACTOR.actorId,
            provider: 'c36de07-crashed-run',
            claimedAt: '2026-09-30T00:00:00.000Z',
            simulated: true,
          },
        },
      });
      const gateway = createForbiddenGateway();
      const financial = createSpyFinancial();
      const deps = depsWith(gateway, financial.fn);
      const before = await readRequest(fx.requestId);

      const first = await executeRefundRequest(
        { actorId: ADMIN_ACTOR.actorId, actorRole: 'admin', requestId: fx.requestId },
        deps,
      );
      expect(first.kind).toBe('rejected');
      expect(first.reason).toBe('EXECUTION_IN_PROGRESS');
      expect(String(first.detail)).toContain('manual resolution');

      // No auto-recovery: a second attempt behaves identically.
      const second = await executeRefundRequest(
        { actorId: ADMIN_ACTOR.actorId, actorRole: 'admin', requestId: fx.requestId },
        deps,
      );
      expect(second.kind).toBe('rejected');
      expect(second.reason).toBe('EXECUTION_IN_PROGRESS');

      const after = await readRequest(fx.requestId);
      expect(after.status).toBe('executing');
      expect(after.requestVersion).toBe(2);
      expect(after.metadata).toEqual(before.metadata);
      expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());

      expect(gateway.calls).toHaveLength(0);
      expect(financial.calls).toHaveLength(0);
      expect((await readPayment(fx.paymentId)).status).toBe('approved');
      expect((await readEarning(fx.paymentId)).status).toBe('confirmed');
      expect(await countDebits(fx.paymentId)).toBe(0);

      console.log(
        `[C36-DE-07][D1] first=${first.reason} second=${second.reason} status=${after.status} version=${after.requestVersion} updatedAt_unchanged=true gateway_calls=0 financial_calls=0`,
      );
    });
  });

  /* ═══════════════════════════════════════════════════════════════════════
   * E — payment / earning / ledger atomic consistency (real orchestrator)
   * ═══════════════════════════════════════════════════════════════════════ */

  describe('E — financial consistency and atomicity on PostgreSQL', () => {
    it('production composition: executed + payment refunded + earning reversed + ONE debit', async () => {
      const fx = await seedFixture();

      const result = await executeRefundRequest(
        { actorId: ADMIN_ACTOR.actorId, actorRole: 'admin', requestId: fx.requestId },
        createProductionExecutionDeps(),
      );
      expect(result.kind).toBe('executed');

      const request = await readRequest(fx.requestId);
      const payment = await readPayment(fx.paymentId);
      const earning = await readEarning(fx.paymentId);
      const [debit] = await db
        .select()
        .from(partnerLedgerEntries)
        .where(eq(partnerLedgerEntries.idempotencyKey, `booking_payment_debit:${fx.paymentId}`))
        .limit(1);

      expect(request.status).toBe('executed');
      expect(request.requestVersion).toBe(4);
      expect(payment.status).toBe('refunded');
      expect(earning.status).toBe('reversed');
      expect(debit).toBeTruthy();
      expect(debit.earningId).toBe(fx.earningId);
      expect(debit.partnerId).toBe(fx.partnerId);
      expect(Number(debit.amountCents)).toBe(15000);
      expect(await countDebits(fx.paymentId)).toBe(1);

      const metadata = readExecutionMetadata(request.metadata);
      expect((metadata.financial as any)?.kind).toBe('applied');
      expect(readProviderReceipt(request.metadata)?.externalRef).toBe(`sim_refund_${fx.requestId}`);

      console.log(
        `[C36-DE-07][E1] request=${request.status}@${request.requestVersion} payment=${payment.status} earning=${earning.status} debits=1 debit_earning=${debit.earningId === fx.earningId} financial=${(metadata.financial as any)?.kind}`,
      );
    });

    it('replaying an executed request is idempotent: no new reversal, no second debit', async () => {
      const fx = await seedFixture();
      const first = await executeRefundRequest(
        { actorId: ADMIN_ACTOR.actorId, actorRole: 'admin', requestId: fx.requestId },
        createProductionExecutionDeps(),
      );
      expect(first.kind).toBe('executed');
      const receiptAfterFirst = readProviderReceipt((await readRequest(fx.requestId)).metadata);

      const replay = await executeRefundRequest(
        { actorId: ADMIN_ACTOR.actorId, actorRole: 'admin', requestId: fx.requestId },
        createProductionExecutionDeps(),
      );
      expect(replay.kind).toBe('idempotent');

      const request = await readRequest(fx.requestId);
      expect(request.status).toBe('executed');
      expect(request.requestVersion).toBe(4);
      expect(readProviderReceipt(request.metadata)).toEqual(receiptAfterFirst);
      expect((await readPayment(fx.paymentId)).status).toBe('refunded');
      expect((await readEarning(fx.paymentId)).status).toBe('reversed');
      expect(await countDebits(fx.paymentId)).toBe(1);

      console.log(
        `[C36-DE-07][E2] replay=${replay.kind} version=${request.requestVersion} debits=1 receipt_unchanged=true`,
      );
    });

    it('financial failure ⇒ retry_required with a rolled-back reversal, then a real resume', async () => {
      const fx = await seedFixture();
      const gateway = createSimulatedRefundGateway();

      // The reversal really writes (earning → reversed, ledger → debit) inside a
      // transaction and then blows up: PostgreSQL must undo both writes.
      const failingPorts = {
        async findEarningByPayment(paymentId: string) {
          const earning = await readEarning(paymentId);
          return earning
            ? {
                id: earning.id,
                partnerId: earning.partnerId,
                amountCents: Number(earning.amountCents),
                currency: earning.currency,
                status: earning.status,
              }
            : null;
        },
        async findDebitByPayment(paymentId: string) {
          const [row] = await db
            .select({ id: partnerLedgerEntries.id })
            .from(partnerLedgerEntries)
            .where(eq(partnerLedgerEntries.idempotencyKey, `booking_payment_debit:${paymentId}`))
            .limit(1);
          return row ?? null;
        },
        async reverseAtomic(input: any) {
          return db.transaction(async (tx: any) => {
            await tx
              .update(partnerEarnings)
              .set({ status: 'reversed' })
              .where(eq(partnerEarnings.id, input.earningId));
            await tx.insert(partnerLedgerEntries).values({
              partnerId: input.partnerId,
              entryType: 'debit',
              amountCents: input.amountCents,
              currency: input.currency,
              earningId: input.earningId,
              idempotencyKey: `booking_payment_debit:${input.paymentId}`,
            });
            throw new Error('C36DE07_FORCED_ROLLBACK');
          });
        },
      };

      const failingFinancial = async ({ paymentId }: any) => {
        await reverseEarningForPaymentRefund(paymentId, failingPorts);
        return { kind: 'applied' as const, detail: 'unreachable' };
      };

      const attempt = await executeRefundRequest(
        { actorId: ADMIN_ACTOR.actorId, actorRole: 'admin', requestId: fx.requestId },
        depsWith(gateway, failingFinancial),
      );

      expect(attempt.kind).toBe('retry_required');
      expect(attempt.detail).toBe('FINANCIAL_UPDATE_FAILED');

      const afterFailure = await readRequest(fx.requestId);
      expect(afterFailure.status).toBe('executing');
      expect(afterFailure.requestVersion).toBe(3);
      const receiptAfterFailure = readProviderReceipt(afterFailure.metadata);
      expect(receiptAfterFailure?.accepted).toBe(true);
      expect(readExecutionMetadata(afterFailure.metadata).gatewayAccepted).toBe(true);

      // Nothing financial was applied, and nothing leaked out of the rolled back TX.
      expect((await readPayment(fx.paymentId)).status).toBe('approved');
      expect((await readEarning(fx.paymentId)).status).toBe('confirmed');
      expect(await countDebits(fx.paymentId)).toBe(0);
      expect(gateway.calls).toHaveLength(1);

      console.log(
        `[C36-DE-07][E3] attempt=${attempt.kind} status=${afterFailure.status}@${afterFailure.requestVersion} payment=approved earning=confirmed debits=0 gateway_calls=1`,
      );

      // Resume with the REAL composition: the provider is not called again and the
      // reversal is applied exactly once.
      const resumed = await executeRefundRequest(
        { actorId: ADMIN_ACTOR.actorId, actorRole: 'admin', requestId: fx.requestId },
        createProductionExecutionDeps(),
      );
      expect(resumed.kind).toBe('executed');

      const finalRequest = await readRequest(fx.requestId);
      expect(finalRequest.status).toBe('executed');
      expect(finalRequest.requestVersion).toBe(4);
      expect(readProviderReceipt(finalRequest.metadata)).toEqual(receiptAfterFailure);
      expect((await readPayment(fx.paymentId)).status).toBe('refunded');
      expect((await readEarning(fx.paymentId)).status).toBe('reversed');
      expect(await countDebits(fx.paymentId)).toBe(1);

      console.log(
        `[C36-DE-07][E4] resumed=${resumed.kind} version=${finalRequest.requestVersion} payment=refunded earning=reversed debits=1 receipt_unchanged=true`,
      );
    });

    it('a statement that throws inside db.transaction leaves the row untouched', async () => {
      const fx = await seedFixture();
      const before = await readRequest(fx.requestId);

      await expect(
        db.transaction(async (tx: any) => {
          await tx
            .update(refundRequests)
            .set({ status: 'executing', requestVersion: 99, updatedAt: new Date() })
            .where(eq(refundRequests.id, fx.requestId));
          throw new Error('C36DE07_FORCED_ROLLBACK');
        }),
      ).rejects.toThrow('C36DE07_FORCED_ROLLBACK');

      const after = await readRequest(fx.requestId);
      expect(after.status).toBe('approved');
      expect(after.requestVersion).toBe(1);
      expect(after.metadata).toEqual(before.metadata);
      expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());

      console.log(
        `[C36-DE-07][E5] status=${after.status} version=${after.requestVersion} updatedAt_unchanged=true`,
      );
    });
  });

  /* ═══════════════════════════════════════════════════════════════════════
   * F — isolation: no external gateway, no durable database
   * ═══════════════════════════════════════════════════════════════════════ */

  describe('F — isolation evidence', () => {
    it('the production composition can only inject the simulated gateway', () => {
      const { readFileSync } = require('node:fs');
      const { join } = require('node:path');

      const deps = createProductionExecutionDeps();
      expect(deps.gateway.name).toBe(SIMULATED_REFUND_GATEWAY_NAME);

      const depsSource = readFileSync(
        join(__dirname, '../../../server/modules/payments/services/refund-request-execution.deps.ts'),
        'utf8',
      );
      expect(depsSource).toContain('createSimulatedRefundGateway');
      expect(depsSource).not.toMatch(/mercadopago|stripe|axios|node-fetch|got\(/i);
      expect(depsSource).not.toMatch(/https?:\/\//i);

      console.log(
        `[C36-DE-07][F1] production_gateway=${deps.gateway.name} provider_sdk_refs=0`,
      );
    });

    it('the suite never left the ephemeral database and nothing durable was touched', async () => {
      const probe = await db.execute(sql`select current_database() as db, current_user as usr`);
      const expectedDatabase = String(EPHEMERAL_DATABASE_URL).split('/').pop();
      expect(probe.rows[0].db).toBe(expectedDatabase);
      expect(String(EPHEMERAL_DATABASE_URL)).toContain('127.0.0.1:55433');
      expect(String(EPHEMERAL_DATABASE_URL)).not.toContain(':5433');

      console.log(
        `[C36-DE-07][F3] database=${probe.rows[0].db} user=${probe.rows[0].usr} host=127.0.0.1:55433 durable_touched=false`,
      );
    });

    it('no HTTP request was attempted during the entire suite', () => {
      expect(fetchSpy.mock.calls).toHaveLength(0);
      expect(httpsRequestSpy.mock.calls).toHaveLength(0);
      expect(httpRequestSpy.mock.calls).toHaveLength(0);

      console.log(
        `[C36-DE-07][F2] fetch_calls=${fetchSpy.mock.calls.length} https_request_calls=${httpsRequestSpy.mock.calls.length} http_request_calls=${httpRequestSpy.mock.calls.length}`,
      );
    });
  });
});
