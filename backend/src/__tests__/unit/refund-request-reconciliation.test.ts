/**
 * C36-DE-08 — RefundRequest RECONCILIATION (timeout recovery, no blind retry).
 * Pure domain proof with in-memory CAS ports + read-only probe double:
 * no DB, no migration, no network, no credential, no real money.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { createReconciliationProbeDouble } from '../../../server/modules/payments/lib/reconciliation-probe.double';
import {
  reconcileRefundRequest,
  type ReconcileRefundRequestInput,
  type RefundReconciliationDeps,
} from '../../../server/modules/payments/services/refund-request-reconciliation.service';
import {
  EXECUTION_METADATA_KEY,
  readExecutionMetadata,
  readProviderReceipt,
  type ApplyFinancialUpdate,
  type ExecutionMutationInput,
  type ExecutionMutationResult,
  type RefundExecutionPorts,
} from '../../../server/modules/payments/services/refund-request-execution.service';
import type { RefundRequestRow } from '../../../server/modules/payments/services/refund-request.service';

const REQ_ID = 'c36de08a-0000-4000-8000-000000000001';
const PAYMENT_ID = 'c36de08b-0000-4000-8000-000000000001';
const NOW = new Date('2026-09-15T12:00:00.000Z');
const ACTOR = { actorId: 4242, actorRole: 'admin' };

function seedRow(overrides: Partial<RefundRequestRow> = {}): RefundRequestRow {
  return {
    id: REQ_ID, paymentId: PAYMENT_ID, bookingId: 808, amount: '200.00',
    currency: 'BRL', reason: 'de08 timeout recovery', requestedBy: 9,
    status: 'executing', requestVersion: 5,
    idempotencyKey: `refund_request_execution:${REQ_ID}`,
    metadata: { paymentStatusAtRequest: 'approved' },
    createdAt: NOW, updatedAt: NOW, decidedBy: 42, decidedAt: NOW, decisionReason: null,
    ...overrides,
  };
}

function createMemoryPorts(seed: RefundRequestRow): RefundExecutionPorts & { store: Map<string, RefundRequestRow> } {
  const store = new Map<string, RefundRequestRow>([[seed.id, { ...seed }]]);
  const mutate = async (
    input: ExecutionMutationInput & { expectedStatus: string; next?: string },
  ): Promise<ExecutionMutationResult> => {
    const row = store.get(input.requestId);
    if (!row || row.status !== input.expectedStatus || row.requestVersion !== input.expectedVersion) {
      const current = store.get(input.requestId);
      return { kind: 'conflict', current: current ? { ...current } : null };
    }
    const next: RefundRequestRow = {
      ...row, status: input.next ?? row.status,
      requestVersion: row.requestVersion + 1, metadata: input.metadata, updatedAt: new Date(),
    };
    store.set(next.id, next);
    return { kind: 'updated', request: { ...next } };
  };
  return {
    store,
    findById: async (id: string) => {
      const row = store.get(id);
      return row ? { ...row } : null;
    },
    claim: async (input) => mutate({ ...input, expectedStatus: 'approved', next: 'executing' }),
    recordReceipt: async (input) => mutate({ ...input, expectedStatus: 'executing' }),
    finalize: async (input) => mutate({ ...input, expectedStatus: 'executing', next: input.next }),
  };
}

function depsFor(seed: RefundRequestRow, opts: { financial?: ApplyFinancialUpdate; probeMode?: 'confirmed' | 'denied' | 'unknown' } = {}) {
  const ports = createMemoryPorts(seed);
  const probe = createReconciliationProbeDouble({
    behavior: opts.probeMode === 'confirmed' ? { mode: 'confirmed' }
      : opts.probeMode === 'denied' ? { mode: 'denied' } : { mode: 'unknown' },
  });
  const financial: ApplyFinancialUpdate = opts.financial ?? (async () => ({ kind: 'applied' as const, detail: 'de08' }));
  const deps: RefundReconciliationDeps = { ports, probe, applyFinancialUpdate: financial };
  return { ports, probe, deps };
}

describe('C36-DE-08 — reconciliation (unit, in-memory)', () => {
  test('R1 unknown probe keeps executing and never touches finance', async () => {
    let financeCalls = 0;
    const { deps, probe } = depsFor(seedRow(), {
      financial: async () => { financeCalls += 1; return { kind: 'applied' }; },
    });
    const out = await reconcileRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps);
    expect(out.kind).toBe('still_executing');
    expect(financeCalls).toBe(0);
    expect(probe.calls).toHaveLength(1);
    const row = await deps.ports.findById(REQ_ID);
    expect(row?.status).toBe('executing');
    expect(row?.requestVersion).toBe(5);
  });

  test('R2 denied probe finalizes failed with no financial effect', async () => {
    let financeCalls = 0;
    const { deps } = depsFor(seedRow(), {
      probeMode: 'denied',
      financial: async () => { financeCalls += 1; return { kind: 'applied' }; },
    });
    const out = await reconcileRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps);
    expect(out.kind).toBe('failed');
    expect(financeCalls).toBe(0);
    expect((await deps.ports.findById(REQ_ID))?.status).toBe('failed');
  });

  test('R3 confirmed probe adopts receipt then executes', async () => {
    let financeCalls = 0;
    const { deps } = depsFor(seedRow(), {
      probeMode: 'confirmed',
      financial: async () => { financeCalls += 1; return { kind: 'applied' }; },
    });
    const out = await reconcileRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps);
    expect(out.kind).toBe('executed');
    expect(financeCalls).toBe(1);
    const row = await deps.ports.findById(REQ_ID);
    expect(row?.status).toBe('executed');
    expect(readProviderReceipt(row?.metadata)).toBeTruthy();
  });

  test('R4 persisted receipt resumes without any probe call', async () => {
    const seed = seedRow({
      metadata: {
        paymentStatusAtRequest: 'approved',
        [EXECUTION_METADATA_KEY]: {
          receipt: {
            accepted: true, provider: 'simulated-refund-gateway',
            externalRef: 'sim_refund_x', providerStatus: 'simulated_accepted',
            acceptedAt: NOW.toISOString(),
          },
          gatewayAccepted: true,
        },
      },
    });
    let financeCalls = 0;
    const { deps, probe } = depsFor(seed, {
      financial: async () => { financeCalls += 1; return { kind: 'applied' }; },
    });
    const out = await reconcileRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps);
    expect(out.kind).toBe('executed');
    expect(probe.calls).toHaveLength(0);
    expect(financeCalls).toBe(1);
  });

  test('R5 idempotent second reconcile is a no-op', async () => {
    const { deps, probe } = depsFor(seedRow(), { probeMode: 'confirmed' });
    expect((await reconcileRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps )).kind).toBe('executed');
    let financeCalls = 0;
    deps.applyFinancialUpdate = async () => { financeCalls += 1; return { kind: 'applied' }; };
    probe.reset();
    expect((await reconcileRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps )).kind).toBe('already_executed');
    expect(financeCalls).toBe(0);
    expect(probe.calls).toHaveLength(0);
  });
});

describe('C36-DE-08 — reconciler guardrails (unit)', () => {
  test('R6 no createRefund invocation in reconciler module', () => {
    const src = readFileSync(
      join(__dirname, '../../../server/modules/payments/services/refund-request-reconciliation.service.ts'), 'utf8');
    expect(src).not.toMatch(/createRefund\s*\(/);
  });

  test('R7 stale expectedVersion refused before any probe call', async () => {
    const { deps, probe } = depsFor(seedRow(), { probeMode: 'confirmed' });
    const input: ReconcileRefundRequestInput = { requestId: REQ_ID, ...ACTOR, expectedVersion: 999 };
    expect((await reconcileRefundRequest(input, deps)).kind).toBe('conflict');
    expect(probe.calls).toHaveLength(0);
  });

  test('R8 non-executing and terminal states never move', async () => {
    for (const status of ['approved', 'draft'] as const) {
      const { deps } = depsFor(seedRow({ status }), { probeMode: 'confirmed' });
      expect((await reconcileRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps )).kind).toBe('not_executing');
    }
    const { deps } = depsFor(seedRow({ status: 'executed' }), { probeMode: 'confirmed' });
    expect((await reconcileRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps )).kind).toBe('already_executed');
  });

  test('R9 RBAC mirrors execution roles (viewer refused)', async () => {
    const { deps, probe } = depsFor(seedRow(), { probeMode: 'confirmed' });
    const out = await reconcileRefundRequest({ requestId: REQ_ID, actorId: 1, actorRole: 'viewer' }, deps);
    expect(out.kind).toBe('refused');
    expect(probe.calls).toHaveLength(0);
  });

  test('R10 metadata carries reconciliation evidence', async () => {
    const { deps } = depsFor(seedRow(), { probeMode: 'confirmed' });
    await reconcileRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps);
    const row = await deps.ports.findById(REQ_ID);
    const meta = readExecutionMetadata(row?.metadata) as Record<string, unknown>;
    expect(meta?.reconciliation).toBeTruthy();
  });
});
