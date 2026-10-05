/**
 * C36-DE-06 — RefundRequest EXECUTION (simulated money movement).
 *
 * What is real here: the complete execution use case, the compare-and-set
 * claim, the simulated provider, the resume path and the existing local
 * earning/ledger reversal orchestrator (against in-memory ports).
 * What is substituted: persistence (in-memory CAS ports) and the provider
 * (the simulated gateway shipped by this gate).
 *
 * Consequence: no database write, no migration APPLY, no network call, no
 * credential and no real charge/refund can happen while these tests run — yet
 * every state below is produced by the real domain.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import {
  EXECUTION_METADATA_KEY,
  REFUND_EXECUTION_HTTP_STATUS,
  executeRefundRequest,
  readExecutionMetadata,
  readProviderReceipt,
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
import {
  REFUND_EXECUTION_ROLES,
  canExecuteRefundRequest,
  execucaoPermitida,
  execucoesDe,
  podeIniciarExecucao,
} from '../../../server/modules/payments/lib/refund-request-execution-state';
import { REFUND_DECISION_ROLES } from '../../../server/modules/payments/lib/refund-request-state';
import { createProductionExecutionDeps } from '../../../server/modules/payments/services/refund-request-execution.deps';
import type { RefundRequestRow } from '../../../server/modules/payments/services/refund-request.service';
import {
  applyEarningReversalOnPaymentRefund,
} from '../../../../server/modules/partners/services/partner-earning-on-refund.service';
import {
  reverseEarningForPaymentRefund,
  type ReversalPorts,
} from '../../../../server/modules/partners/services/partner-earning-reversal.service';

const REQ_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PAYMENT_ID = '11111111-1111-4111-8111-111111111111';
const REQUESTER_ID = 7;
const ADMIN_A = 442;
const ADMIN_B = 777;

const SERVICE = join(
  __dirname,
  '../../../server/modules/payments/services/refund-request-execution.service.ts',
);
const STATE_MODULE = join(
  __dirname,
  '../../../server/modules/payments/lib/refund-request-execution-state.ts',
);
const GATEWAY_MODULE = join(
  __dirname,
  '../../../server/modules/payments/lib/simulated-refund.gateway.ts',
);
const DEPS_MODULE = join(
  __dirname,
  '../../../server/modules/payments/services/refund-request-execution.deps.ts',
);
const EXEC_ROUTES = join(
  __dirname,
  '../../../server/modules/payments/routes/refund-request-execution.routes.ts',
);
const DECISION_ROUTES = join(
  __dirname,
  '../../../server/modules/payments/routes/refund-request.routes.ts',
);
const DECISION_SERVICE = join(
  __dirname,
  '../../../server/modules/payments/services/refund-request.service.ts',
);

/** Yields to the macrotask queue so two callers genuinely interleave. */
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

type FinancialLedger = {
  /** paymentIds with a completed reversal — double execution shows up here. */
  applied: string[];
  attempts: number;
  /** Next N calls throw; any partial write is rolled back (transactional). */
  failNext: number;
};

type ExecutionHarness = {
  requests: Map<string, RefundRequestRow>;
  gateway: ReturnType<typeof createSimulatedRefundGateway>;
  ledger: FinancialLedger;
  deps: RefundExecutionDeps;
};

function createHarness(
  seed: RefundRequestRow = seedRow(),
  gatewayBehavior?: SimulatedRefundGatewayBehavior,
): ExecutionHarness {
  const requests = new Map<string, RefundRequestRow>([[seed.id, { ...seed }]]);
  const gateway = createSimulatedRefundGateway(
    gatewayBehavior ? { behavior: gatewayBehavior } : {},
  );
  const ledger: FinancialLedger = { applied: [], attempts: 0, failNext: 0 };

  /** Atomic compare-and-set on (status, request_version) + metadata write. */
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
    ledger.attempts += 1;
    await tick();
    if (ledger.failNext > 0) {
      ledger.failNext -= 1;
      throw new Error('simulated financial update failure');
    }
    if (ledger.applied.includes(paymentId)) {
      return { kind: 'idempotent', detail: 'already_reversed' };
    }
    ledger.applied.push(paymentId);
    return { kind: 'applied', detail: 'reversed' };
  };

  return {
    requests,
    gateway,
    ledger,
    deps: { ports, gateway, applyFinancialUpdate },
  };
}

function run(
  h: ExecutionHarness,
  overrides: Partial<{
    requestId: string;
    actorId: number;
    actorRole: string | null;
    expectedVersion: number;
  }> = {},
) {
  // `'x' in overrides` (not `??`) so `null` / `undefined` overrides survive.
  return executeRefundRequest(
    {
      requestId: 'requestId' in overrides ? overrides.requestId! : REQ_ID,
      actorId: 'actorId' in overrides ? overrides.actorId! : ADMIN_A,
      actorRole: 'actorRole' in overrides ? overrides.actorRole! : 'admin',
      expectedVersion: 'expectedVersion' in overrides ? overrides.expectedVersion : undefined,
    },
    h.deps,
  );
}

const row = (h: ExecutionHarness) => h.requests.get(REQ_ID)!;

/* ─────────────────────────────────────────────────────────────────────── */

describe('C36-DE-06 approved → executed (happy path)', () => {
  it('moves approved → executing → executed with receipt, reversal and one provider call', async () => {
    const h = createHarness();

    const result = await run(h);

    expect(result.kind).toBe('executed');
    if (result.kind !== 'executed') return;

    const final = row(h);
    expect(final.status).toBe('executed');
    // claim + receipt + finalize = one version bump per mutation.
    expect(final.requestVersion).toBe(6);
    expect(final.decidedBy).toBe(42); // decision metadata untouched

    const execution = readExecutionMetadata(final.metadata);
    expect(execution.simulated).toBe(true);
    expect(execution.gatewayAccepted).toBe(true);
    expect(execution.executedBy).toBe(ADMIN_A);
    expect((execution.financial as { kind: string }).kind).toBe('applied');

    const receipt = readProviderReceipt(final.metadata);
    expect(receipt).toMatchObject({
      accepted: true,
      provider: 'simulated-refund-gateway',
      externalRef: `sim_refund_${REQ_ID}`,
    });
    expect(result.receipt).toEqual(receipt);

    expect(h.gateway.calls).toHaveLength(1);
    expect(h.gateway.calls[0]).toMatchObject({
      paymentId: PAYMENT_ID,
      amount: '150.00',
      currency: 'BRL',
      idempotencyKey: `refund_request_execution:${REQ_ID}`,
    });
    expect(h.ledger.applied).toEqual([PAYMENT_ID]);
  });

  it('keeps every other request untouched (only the target row mutates)', async () => {
    const h = createHarness();
    h.requests.set(OTHER_ID, seedRow({ id: OTHER_ID, status: 'pending' }));

    await run(h);

    expect(h.requests.get(OTHER_ID)!.status).toBe('pending');
    expect(h.requests.get(OTHER_ID)!.requestVersion).toBe(3);
  });
});

describe('C36-DE-06 approved → failed (provider refuses)', () => {
  it('rejection → failed, financial step never runs, nothing moves', async () => {
    const h = createHarness(seedRow(), { mode: 'reject' });

    const result = await run(h);

    expect(result.kind).toBe('failed');
    if (result.kind !== 'failed') return;
    expect(result.detail).toBe('REFUND_REJECTED');

    const final = row(h);
    expect(final.status).toBe('failed');
    const execution = readExecutionMetadata(final.metadata);
    expect(execution.gatewayAccepted).toBe(false);
    expect(execution.failureReason).toBe('REFUND_REJECTED');

    expect(h.gateway.calls).toHaveLength(1);
    expect(h.ledger.attempts).toBe(0);
    expect(h.ledger.applied).toEqual([]);
  });

  it('provider error → failed with PROVIDER_ERROR', async () => {
    const h = createHarness(seedRow(), { mode: 'error', message: 'boom 500' });

    const result = await run(h);

    expect(result).toMatchObject({ kind: 'failed', detail: 'PROVIDER_ERROR' });
    expect(row(h).status).toBe('failed');
    expect(h.ledger.attempts).toBe(0);
  });

  it('provider timeout → failed with PROVIDER_TIMEOUT', async () => {
    const h = createHarness(seedRow(), {
      mode: 'timeout',
      message: 'ETIMEDOUT: socket hang up',
    });

    const result = await run(h);

    expect(result).toMatchObject({ kind: 'failed', detail: 'PROVIDER_TIMEOUT' });
    expect(row(h).status).toBe('failed');
    expect(h.ledger.attempts).toBe(0);
  });
});

describe('C36-DE-06 refuses execution from incompatible states', () => {
  for (const status of [
    'draft',
    'pending',
    'under_review',
    'rejected',
    'cancelled',
    'expired',
  ]) {
    it(`${status} → execute → INVALID_TRANSITION with no side effect`, async () => {
      const h = createHarness(seedRow({ status }));

      const result = await run(h);

      expect(result).toMatchObject({ kind: 'rejected', reason: 'INVALID_TRANSITION' });
      expect(row(h).status).toBe(status);
      expect(row(h).requestVersion).toBe(3);
      expect(h.gateway.calls).toHaveLength(0);
      expect(h.ledger.attempts).toBe(0);
    });
  }

  it('unknown id → NOT_FOUND', async () => {
    const h = createHarness();
    const result = await run(h, { requestId: OTHER_ID });
    expect(result).toEqual({ kind: 'rejected', reason: 'NOT_FOUND' });
    expect(h.gateway.calls).toHaveLength(0);
  });

  it('missing actor → ACTOR_REQUIRED', async () => {
    const h = createHarness();
    const result = await run(h, { actorId: undefined as unknown as number });
    expect(result).toEqual({ kind: 'rejected', reason: 'ACTOR_REQUIRED' });
    expect(h.gateway.calls).toHaveLength(0);
  });

  it('unauthorised role → ROLE_NOT_ALLOWED before any read or write', async () => {
    const h = createHarness();
    for (const role of ['supervisor', 'agent', null]) {
      const result = await run(h, { actorRole: role });
      expect(result).toMatchObject({ kind: 'rejected', reason: 'ROLE_NOT_ALLOWED' });
    }
    expect(h.gateway.calls).toHaveLength(0);
    expect(h.ledger.attempts).toBe(0);
  });

  it('stale expectedVersion → VERSION_CONFLICT, nothing mutated', async () => {
    const h = createHarness();
    const result = await run(h, { expectedVersion: 999 });
    expect(result).toMatchObject({ kind: 'rejected', reason: 'VERSION_CONFLICT' });
    expect(row(h).status).toBe('approved');
    expect(h.gateway.calls).toHaveLength(0);
  });
});

describe('C36-DE-06 idempotency / double-execution protection', () => {
  it('first execution applies, the repeat is a no-op replay', async () => {
    const h = createHarness();

    const first = await run(h);
    const second = await run(h);

    expect(first.kind).toBe('executed');
    expect(second.kind).toBe('idempotent');
    if (second.kind !== 'idempotent') return;
    expect(second.request.status).toBe('executed');

    expect(h.gateway.calls).toHaveLength(1); // exactly-once at the provider
    expect(h.ledger.applied).toEqual([PAYMENT_ID]); // exactly-once financially
    expect(row(h).requestVersion).toBe(6); // the replay wrote nothing
  });

  it('already executed → idempotent without touching provider or ledger', async () => {
    const h = createHarness(
      seedRow({
        status: 'executed',
        requestVersion: 6,
        metadata: {
          paymentStatusAtRequest: 'approved',
          [EXECUTION_METADATA_KEY]: {
            executedBy: ADMIN_A,
            gatewayAccepted: true,
            receipt: {
              accepted: true,
              provider: 'simulated-refund-gateway',
              externalRef: `sim_refund_${REQ_ID}`,
              providerStatus: 'simulated_accepted',
              acceptedAt: '2026-09-01T12:00:00.000Z',
            },
          },
        },
      }),
    );

    const result = await run(h);

    expect(result.kind).toBe('idempotent');
    expect(h.gateway.calls).toHaveLength(0);
    expect(h.ledger.attempts).toBe(0);
  });

  it('failed is terminal → ALREADY_FAILED and no second provider call', async () => {
    const h = createHarness(
      seedRow({
        status: 'failed',
        requestVersion: 5,
        metadata: {
          paymentStatusAtRequest: 'approved',
          [EXECUTION_METADATA_KEY]: { failureReason: 'REFUND_REJECTED' },
        },
      }),
    );

    const result = await run(h);

    expect(result).toMatchObject({
      kind: 'rejected',
      reason: 'ALREADY_FAILED',
      detail: 'REFUND_REJECTED',
    });
    expect(row(h).status).toBe('failed');
    expect(h.gateway.calls).toHaveLength(0);
    expect(h.ledger.attempts).toBe(0);
  });

  it('executing without a receipt is refused (outcome unknown ⇒ never re-call)', async () => {
    const h = createHarness(
      seedRow({
        status: 'executing',
        requestVersion: 4,
        metadata: { paymentStatusAtRequest: 'approved' },
      }),
    );

    const result = await run(h);

    expect(result).toMatchObject({ kind: 'rejected', reason: 'EXECUTION_IN_PROGRESS' });
    expect(row(h).status).toBe('executing');
    expect(h.gateway.calls).toHaveLength(0);
    expect(h.ledger.attempts).toBe(0);
  });
});

describe('C36-DE-06 concurrency — two administrators execute simultaneously', () => {
  it('only one wins the claim: one provider call, one reversal, no double execution', async () => {
    const h = createHarness();

    const [first, second] = await Promise.all([
      run(h, { actorId: ADMIN_A }),
      run(h, { actorId: ADMIN_B }),
    ]);

    const executed = [first, second].filter((r) => r.kind === 'executed');
    const refused = [first, second].filter(
      (r) =>
        r.kind === 'rejected' &&
        (r.reason === 'EXECUTION_IN_PROGRESS' || r.reason === 'VERSION_CONFLICT'),
    );

    expect(executed).toHaveLength(1);
    expect(refused).toHaveLength(1);

    expect(h.gateway.calls).toHaveLength(1);
    expect(h.ledger.applied).toEqual([PAYMENT_ID]);
    expect(row(h).status).toBe('executed');

    // The loser's refusal carries a diagnostic, never a second success.
    const loser = refused[0];
    if (loser.kind === 'rejected') {
      expect(loser.detail).toBeTruthy();
    }
  });

  it('a burst of ten concurrent executions still produces one execution', async () => {
    const h = createHarness();

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        run(h, { actorId: index % 2 === 0 ? ADMIN_A : ADMIN_B }),
      ),
    );

    expect(results.filter((r) => r.kind === 'executed')).toHaveLength(1);
    expect(h.gateway.calls).toHaveLength(1);
    expect(h.ledger.applied).toEqual([PAYMENT_ID]);
    expect(row(h).status).toBe('executed');
  });
});

describe('C36-DE-06 provider accepted but the financial step failed', () => {
  it('does not report executed, keeps the receipt and never calls the provider twice', async () => {
    const h = createHarness();
    h.ledger.failNext = 1;

    const first = await run(h);

    expect(first.kind).toBe('retry_required');
    if (first.kind !== 'retry_required') return;
    expect(first.detail).toBe('FINANCIAL_UPDATE_FAILED');

    const mid = row(h);
    // Financially consistent: still executing, receipt on disk, nothing claimed
    // as executed, and the failed financial write was rolled back.
    expect(mid.status).toBe('executing');
    expect(readProviderReceipt(mid.metadata)).not.toBeNull();
    expect(h.ledger.applied).toEqual([]);
    expect(h.gateway.calls).toHaveLength(1);

    const second = await run(h);

    expect(second.kind).toBe('executed');
    expect(row(h).status).toBe('executed');
    expect(h.gateway.calls).toHaveLength(1); // provider still exactly once
    expect(h.ledger.applied).toEqual([PAYMENT_ID]); // reversal converged to one
    expect(h.ledger.attempts).toBe(2);
  });

  it('rollback / logical atomicity: a failed financial write leaves no partial reversal', async () => {
    const h = createHarness();
    h.ledger.failNext = 1;

    await run(h);

    expect(row(h).status).toBe('executing');
    expect(h.ledger.applied).toEqual([]); // transactional rollback
    expect(h.ledger.attempts).toBe(1);

    const resumed = await run(h);

    expect(resumed.kind).toBe('executed');
    expect(h.ledger.applied).toEqual([PAYMENT_ID]); // exactly one after resume
  });

  it('resume after a receipt never re-enters the claim (version advances only on writes)', async () => {
    const h = createHarness();
    h.ledger.failNext = 1;

    await run(h);
    const afterClaimAndReceipt = row(h).requestVersion;
    expect(afterClaimAndReceipt).toBe(5); // claim + receipt only

    await run(h);
    expect(row(h).requestVersion).toBe(6); // finalize only
  });
});

describe('C36-DE-06 execution state machine (pure)', () => {
  it('allows approved → executing → executed | failed only', () => {
    expect(execucaoPermitida('approved', 'executing')).toBe(true);
    expect(execucaoPermitida('executing', 'executed')).toBe(true);
    expect(execucaoPermitida('executing', 'failed')).toBe(true);
    // Direct jumps are refused: the claim is what serialises executors.
    expect(execucaoPermitida('approved', 'executed')).toBe(false);
    expect(execucaoPermitida('approved', 'failed')).toBe(false);
  });

  it('refuses every non-executable status instead of throwing', () => {
    for (const status of [
      'draft',
      'pending',
      'under_review',
      'rejected',
      'cancelled',
      'expired',
      'whatever',
    ]) {
      expect(podeIniciarExecucao(status)).toBe(false);
      expect(execucoesDe(status)).toEqual([]);
    }
  });

  it('executed and failed are terminal', () => {
    expect(execucoesDe('executed')).toEqual([]);
    expect(execucoesDe('failed')).toEqual([]);
    expect(execucaoPermitida('executed', 'approved')).toBe(false);
    expect(execucaoPermitida('failed', 'approved')).toBe(false);
    expect(execucaoPermitida('executed', 'executed')).toBe(false);
    expect(execucaoPermitida('failed', 'executed')).toBe(false);
  });

  it('mirrors the decision roles — this gate does not widen who may act', () => {
    expect([...REFUND_EXECUTION_ROLES]).toEqual([...REFUND_DECISION_ROLES]);
    expect(canExecuteRefundRequest('admin')).toBe(true);
    expect(canExecuteRefundRequest('manager')).toBe(true);
    expect(canExecuteRefundRequest('supervisor')).toBe(false);
    expect(canExecuteRefundRequest(null)).toBe(false);
    expect(canExecuteRefundRequest(undefined)).toBe(false);
  });
});

describe('C36-DE-06 error → HTTP status contract', () => {
  it('maps every execution failure to the required status', () => {
    expect(REFUND_EXECUTION_HTTP_STATUS).toEqual({
      ACTOR_REQUIRED: 401,
      ROLE_NOT_ALLOWED: 403,
      NOT_FOUND: 404,
      INVALID_TRANSITION: 409,
      VERSION_CONFLICT: 409,
      EXECUTION_IN_PROGRESS: 409,
      ALREADY_FAILED: 409,
    });
  });
});

describe('C36-DE-06 simulated gateway (offline, deterministic)', () => {
  const gatewayRequest = {
    requestId: REQ_ID,
    paymentId: PAYMENT_ID,
    amount: '150.00',
    currency: 'BRL',
    reason: 'hotel overcharge',
    idempotencyKey: `refund_request_execution:${REQ_ID}`,
  };

  it('answers the same reference for a replay, so a repeat can never look new', async () => {
    const gateway = createSimulatedRefundGateway();
    const first = await gateway.createRefund(gatewayRequest);
    const second = await gateway.createRefund(gatewayRequest);

    expect(first).toEqual(second);
    expect(first).toMatchObject({ kind: 'accepted', externalRef: `sim_refund_${REQ_ID}` });
    expect(gateway.calls).toHaveLength(2);
    expect(gateway.name).toBe('simulated-refund-gateway');
  });

  it('supports reject / error / timeout behaviours for failure drills', async () => {
    for (const behavior of [
      { mode: 'reject' },
      { mode: 'error' },
      { mode: 'timeout' },
    ] as const) {
      const gateway = createSimulatedRefundGateway({ behavior });
      if (behavior.mode === 'reject') {
        await expect(gateway.createRefund(gatewayRequest)).resolves.toMatchObject({
          kind: 'rejected',
        });
      } else {
        await expect(gateway.createRefund(gatewayRequest)).rejects.toThrow();
      }
      expect(gateway.calls).toHaveLength(1);
    }
  });
});

describe('C36-DE-06 ledger / earnings reversal (real orchestrator, in-memory ports)', () => {
  it('executes end-to-end with exactly one earning reversal and one ledger debit', async () => {
    const earning = {
      id: 'earning-1',
      partnerId: 'partner-1',
      amountCents: 15000,
      currency: 'BRL',
      status: 'active',
    };
    const debits: Array<{
      id: string;
      idempotencyKey: string;
      amountCents: number;
      entryType: string;
    }> = [];

    const reversalPorts: ReversalPorts = {
      async findEarningByPayment(paymentId) {
        await tick();
        return paymentId === PAYMENT_ID ? { ...earning } : null;
      },
      async findDebitByPayment(paymentId) {
        await tick();
        const key = `booking_payment_debit:${paymentId}`;
        return debits.find((d) => d.idempotencyKey === key) ?? null;
      },
      async reverseAtomic(input) {
        await tick();
        const key = `booking_payment_debit:${input.paymentId}`;
        if (debits.some((d) => d.idempotencyKey === key)) {
          throw Object.assign(new Error('duplicate key'), { code: '23505' });
        }
        const debitId = `debit-${debits.length + 1}`;
        debits.push({
          id: debitId,
          idempotencyKey: key,
          amountCents: input.amountCents,
          entryType: 'debit',
        });
        earning.status = 'reversed';
        return { debitId };
      },
    };

    const h = createHarness();
    h.deps.applyFinancialUpdate = async ({ paymentId }) => {
      const result = await applyEarningReversalOnPaymentRefund(
        paymentId,
        {
          async markPaymentRefunded() {
            return { status: 'refunded', transitioned: true };
          },
          reverse: reverseEarningForPaymentRefund,
        },
        reversalPorts,
      );
      const reversal = result.reversal;
      return reversal.kind === 'reversed'
        ? { kind: 'applied', detail: 'earning_reversed_and_debited' }
        : reversal.kind === 'idempotent'
          ? { kind: 'idempotent', detail: 'reversal_already_applied' }
          : { kind: 'skipped', detail: reversal.reason };
    };

    const result = await run(h);

    expect(result.kind).toBe('executed');
    expect(row(h).status).toBe('executed');
    expect(h.gateway.calls).toHaveLength(1);

    // Ledger evidence: one debit, keyed by payment, exactly the earning amount.
    expect(earning.status).toBe('reversed');
    expect(debits).toHaveLength(1);
    expect(debits[0]).toMatchObject({
      entryType: 'debit',
      amountCents: 15000,
      idempotencyKey: `booking_payment_debit:${PAYMENT_ID}`,
    });

    const financial = readExecutionMetadata(row(h).metadata).financial as { kind: string };
    expect(financial.kind).toBe('applied');

    // Replaying the real reversal on an already-reversed earning stays a no-op.
    const retry = await reverseEarningForPaymentRefund(PAYMENT_ID, reversalPorts);
    expect(retry.kind).toBe('idempotent');
    expect(debits).toHaveLength(1);

    // And a second full execution of the request never reaches any of it.
    const replay = await run(h);
    expect(replay.kind).toBe('idempotent');
    expect(h.gateway.calls).toHaveLength(1);
    expect(debits).toHaveLength(1);
  });
});

/* ─────────────────────────────────────────────────────────────────────── */

describe('C36-DE-06 financial isolation (static)', () => {
  const serviceSrc = readFileSync(SERVICE, 'utf8');
  const stateSrc = readFileSync(STATE_MODULE, 'utf8');
  const gatewaySrc = readFileSync(GATEWAY_MODULE, 'utf8');
  const depsSrc = readFileSync(DEPS_MODULE, 'utf8');
  const execRoutesSrc = readFileSync(EXEC_ROUTES, 'utf8');
  const decisionRoutesSrc = readFileSync(DECISION_ROUTES, 'utf8');
  const decisionServiceSrc = readFileSync(DECISION_SERVICE, 'utf8');
  const indexSrc = readFileSync(
    join(__dirname, '../../../server/modules/payments/routes/index.ts'),
    'utf8',
  );

  it('execution service reaches no real provider, DB, HTTP client or env var', () => {
    expect(serviceSrc).not.toMatch(/getPaymentProvider/);
    expect(serviceSrc).not.toMatch(/RefundService/);
    expect(serviceSrc).not.toMatch(/\/refund\.service['"]/);
    expect(serviceSrc).not.toMatch(/reverseEarningForPaymentRefund|applyEarningReversalOnPaymentRefund/);
    expect(serviceSrc).not.toMatch(/mercadopago|stripe/i);
    expect(serviceSrc).not.toMatch(/drizzle/);
    expect(serviceSrc).not.toMatch(/process\.env/);
    expect(serviceSrc).not.toMatch(/\bfetch\s*\(|axios|http\.request/);
    // ...but it does expose the injected use case.
    expect(serviceSrc).toMatch(/export async function executeRefundRequest/);
    expect(serviceSrc).toMatch(/RefundExecutionDeps/);
  });

  it('execution state machine stays pure (no I/O, no DB, no money vocabulary)', () => {
    expect(stateSrc).not.toMatch(/drizzle/);
    expect(stateSrc).not.toMatch(/from ['"]fs['"]/);
    expect(stateSrc).not.toMatch(/require\(/);
    expect(stateSrc).not.toMatch(/fetch\(/);
    expect(stateSrc).not.toMatch(/gateway|payout|ledger|earnings/i);
  });

  it('simulated gateway performs no I/O and reads no environment', () => {
    expect(gatewaySrc).not.toMatch(/\bfetch\s*\(|\baxios\b|http\.request|https?\.request/i);
    expect(gatewaySrc).not.toMatch(/process\.env/);
    expect(gatewaySrc).not.toMatch(/require\(/);
    expect(gatewaySrc).toMatch(/export function createSimulatedRefundGateway/);
  });

  it('composition root never resolves a real payment provider', () => {
    expect(depsSrc).not.toMatch(/getPaymentProvider/);
    expect(depsSrc).not.toMatch(/RefundService/);
    expect(depsSrc).not.toMatch(/\/refund\.service['"]/);
    expect(depsSrc).not.toMatch(/process\.env/);
    expect(depsSrc).toMatch(/createSimulatedRefundGateway/);
    expect(depsSrc).toMatch(/createDrizzleRefundExecutionPorts/);
    expect(depsSrc).toMatch(/applyEarningReversalOnPaymentRefund/);
  });

  it('execution router is a thin consumer: no DB, no provider, no financial writer', () => {
    expect(execRoutesSrc).toContain("router.post('/:id/execute'");
    expect(execRoutesSrc).toMatch(/executeRefundRequest\(/);
    expect(execRoutesSrc).not.toMatch(/drizzle|from ['"].*\/db\//);
    expect(execRoutesSrc).not.toMatch(/partner-earning/);
    expect(execRoutesSrc).not.toMatch(/getPaymentProvider/);
    expect(execRoutesSrc).not.toMatch(/RefundService|\/refund\.service['"]/);
    expect(execRoutesSrc).not.toMatch(/\bfetch\s*\(|\baxios\b|http\.request/);
  });

  it('decision surface is untouched: refund-request.routes.ts still has no /execute', () => {
    expect(decisionRoutesSrc).not.toMatch(/\/execute/);
    expect(decisionRoutesSrc).not.toMatch(/RefundService/);
    expect(decisionRoutesSrc).toMatch("router.post('/:id/approve'");
    expect(decisionRoutesSrc).toMatch("router.post('/:id/reject'");
  });

  it('decision service still references no execution or financial writer', () => {
    expect(decisionServiceSrc).not.toMatch(
      /reverseEarningForPaymentRefund|applyEarningReversalOnPaymentRefund|getPaymentProvider/,
    );
    expect(decisionServiceSrc).not.toMatch(/RefundService/);
    expect(decisionServiceSrc).not.toMatch(/executeRefundRequest/);
  });

  it('module index mounts both routers on the same base path, gate untouched', () => {
    expect(indexSrc).toContain("router.use('/refund-requests', refundRequestRoutes)");
    expect(indexSrc).toContain("router.use('/refund-requests', refundExecutionRoutes)");
    expect(indexSrc).toContain("router.use(requireRole('admin', 'manager'))");
    expect(indexSrc).not.toMatch(/supervisor/);
  });
});

describe('C36-DE-06 production composition (no DB call, simulated provider)', () => {
  it('injects the SIMULATED gateway — never a real payment provider', () => {
    const deps = createProductionExecutionDeps();

    expect(deps.gateway.name).toBe('simulated-refund-gateway');
    expect(typeof deps.gateway.createRefund).toBe('function');
    expect(typeof deps.ports.claim).toBe('function');
    expect(typeof deps.ports.recordReceipt).toBe('function');
    expect(typeof deps.ports.finalize).toBe('function');
    expect(typeof deps.applyFinancialUpdate).toBe('function');
  });
});








