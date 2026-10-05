/**
 * C36-DE-08 (parte 2) — Reconciliation WORKER: expiração, lease CAS, attempts, backoff.
 * Pure/in-memory. No DB, no migration, no network, no real money.
 */
import {
  reconcileExpiredRefundRequest,
  reconcileRefundRequest,
  type RefundReconciliationDeps,
} from '../../../server/modules/payments/services/refund-request-reconciliation.service';
import {
  computeBackoffMs,
  evaluateExecutingExpiry,
  isAttemptsExhausted,
  isInBackoff,
  leaseClaimState,
  nextAttemptState,
  readReconciliationState,
  withReconciliationMetadata,
  RECONCILIATION_DEFAULTS,
} from '../../../server/modules/payments/lib/refund-request-reconciliation-policy';
import { createReconciliationProbeDouble } from '../../../server/modules/payments/lib/reconciliation-probe.double';
import {
  type ApplyFinancialUpdate,
  type ExecutionMutationInput,
  type ExecutionMutationResult,
  type RefundExecutionPorts,
} from '../../../server/modules/payments/services/refund-request-execution.service';
import type { RefundRequestRow } from '../../../server/modules/payments/services/refund-request.service';

const REQ_ID = 'c36de08w-0000-4000-8000-000000000001';
const PAYMENT_ID = 'c36de08w-0000-4000-8000-00000000000b';
const ACTOR = { actorId: 4242, actorRole: 'admin' };
const NOW = new Date('2026-09-15T12:00:00.000Z');
const STALE = new Date('2026-09-15T11:00:00.000Z'); // 60 min atras > ttl+grace

function seedRow(overrides: Partial<RefundRequestRow> = {}): RefundRequestRow {
  return {
    id: REQ_ID, paymentId: PAYMENT_ID, bookingId: 808, amount: '200.00',
    currency: 'BRL', reason: 'de08 worker', requestedBy: 9,
    status: 'executing', requestVersion: 5,
    idempotencyKey: `refund_request_execution:${REQ_ID}`,
    metadata: { paymentStatusAtRequest: 'approved' },
    createdAt: STALE, updatedAt: STALE, decidedBy: 42, decidedAt: STALE, decisionReason: null,
    ...overrides,
  };
}

function memoryPorts(seed: RefundRequestRow): RefundExecutionPorts {
  const store = new Map<string, RefundRequestRow>([[seed.id, { ...seed }]]);
  const mutate = async (
    input: ExecutionMutationInput & { expectedStatus: string; next?: string },
  ): Promise<ExecutionMutationResult> => {
    const row = store.get(input.requestId);
    if (!row || row.status !== input.expectedStatus || row.requestVersion !== input.expectedVersion) {
      const cur = store.get(input.requestId);
      return { kind: 'conflict', current: cur ? { ...cur } : null };
    }
    const next: RefundRequestRow = {
      ...row, status: input.next ?? row.status,
      requestVersion: row.requestVersion + 1, metadata: input.metadata, updatedAt: new Date(),
    };
    store.set(next.id, next);
    return { kind: 'updated', request: { ...next } };
  };
  return {
    findById: async (id) => { const r = store.get(id); return r ? { ...r } : null; },
    claim: async (input) => mutate({ ...input, expectedStatus: 'approved', next: 'executing' }),
    recordReceipt: async (input) => mutate({ ...input, expectedStatus: 'executing' }),
    finalize: async (input) => mutate({ ...input, expectedStatus: 'executing', next: input.next }),
  };
}

function depsFor(
  seed: RefundRequestRow,
  opts: { probeMode?: 'confirmed' | 'denied' | 'unknown'; financial?: ApplyFinancialUpdate } = {},
): { deps: RefundReconciliationDeps; probe: ReturnType<typeof createReconciliationProbeDouble> } {
  const ports = memoryPorts(seed);
  const probe = createReconciliationProbeDouble({
    behavior: opts.probeMode === 'confirmed' ? { mode: 'confirmed' }
      : opts.probeMode === 'denied' ? { mode: 'denied' } : { mode: 'unknown' },
  });
  const financial: ApplyFinancialUpdate = opts.financial ?? (async () => ({ kind: 'applied' }));
  return { deps: { ports, probe, applyFinancialUpdate: financial }, probe };
}

const CLOCK = { now: () => NOW };

describe('W1–W5 politica pura (ttl, grace, backoff, attempts, lease)', () => {
  test('W1 executing novo NAO expira (anti-falso-timeout)', () => {
    const verdict = evaluateExecutingExpiry(seedRow({ updatedAt: new Date(NOW.getTime() - 1000) }), NOW);
    expect(verdict.expired).toBe(false);
    expect(verdict.reason).toBe('not_expired');
  });

  test('W2 executing sem timestamp confiavel NUNCA expira (no_evidence)', () => {
    const verdict = evaluateExecutingExpiry(seedRow({ updatedAt: undefined, metadata: {} }), NOW);
    expect(verdict.expired).toBe(false);
    expect(verdict.reason).toBe('no_evidence');
  });

  test('W3 lease viva vence o TTL (lease_held)', () => {
    const meta = withReconciliationMetadata({}, leaseClaimState('w-1', NOW, 60_000), NOW);
    const verdict = evaluateExecutingExpiry(seedRow({ metadata: meta }), NOW);
    expect(verdict.expired).toBe(false);
    expect(verdict.reason).toBe('lease_held');
  });

  test('W4 executing velho expira', () => {
    const verdict = evaluateExecutingExpiry(seedRow(), NOW);
    expect(verdict.expired).toBe(true);
    expect(verdict.ageMs).toBeGreaterThan(RECONCILIATION_DEFAULTS.ttlMs);
  });

  test('W5 backoff cresce/satura; attempts esgotam', () => {
    expect(computeBackoffMs(1)).toBe(RECONCILIATION_DEFAULTS.backoffBaseMs);
    expect(computeBackoffMs(2)).toBe(RECONCILIATION_DEFAULTS.backoffBaseMs * 2);
    expect(computeBackoffMs(99)).toBe(RECONCILIATION_DEFAULTS.backoffMaxMs);
    const s1 = nextAttemptState({}, NOW, { maxAttempts: 3 });
    expect(s1.attempts).toBe(1);
    expect(s1.exhausted).toBe(false);
    expect(isInBackoff(withReconciliationMetadata({}, s1, NOW), NOW)).toBe(true);
    const m1 = withReconciliationMetadata({}, s1, NOW);
    const s2 = nextAttemptState(m1, NOW, { maxAttempts: 3 });
    const m2 = withReconciliationMetadata(m1, s2, NOW);
    const s3 = nextAttemptState(m2, NOW, { maxAttempts: 3 });
    const m3 = withReconciliationMetadata(m2, s3, NOW);
    expect(s3.exhausted).toBe(true);
    expect(isAttemptsExhausted(m3, 3)).toBe(true);
    expect(readReconciliationState(m3).nextEligibleAt).toBeNull();
  });
});

describe('W6–W13 worker com lease (timeout -> reconcile -> estado final)', () => {
  test('W6 executing novo => not_expired (nao toca provider nem financeiro)', async () => {
    const { deps, probe } = depsFor(seedRow({ updatedAt: NOW }), { probeMode: 'confirmed' });
    let fin = 0;
    deps.applyFinancialUpdate = async () => { fin += 1; return { kind: 'applied' }; };
    const out = await reconcileExpiredRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps, CLOCK);
    expect(out.kind).toBe('not_expired');
    expect(probe.calls).toHaveLength(0);
    expect(fin).toBe(0);
  });

  test('W7 expirado + probe confirmed => executed, exatamente 1 financeiro, lease inerte', async () => {
    const { deps, probe } = depsFor(seedRow(), { probeMode: 'confirmed' });
    let fin = 0;
    deps.applyFinancialUpdate = async () => { fin += 1; return { kind: 'applied' }; };
    const out = await reconcileExpiredRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps, CLOCK);
    expect(out.kind).toBe('executed');
    expect(fin).toBe(1);
    expect(probe.calls.length).toBeGreaterThanOrEqual(1);

    const row = await deps.ports.findById(REQ_ID);
    expect(row?.status).toBe('executed');
    expect(readReconciliationState(row?.metadata).leaseOwnerId).toBe('reconciler:4242');

    // lease residual em linha terminal e INERTE: nova reconciliacao nao usa probe nem dinheiro
    probe.reset();
    const again = await reconcileExpiredRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps, CLOCK);
    expect(again.kind).toBe('already_executed');
    expect(probe.calls).toHaveLength(0);
    expect(fin).toBe(1);
  });

  test('W8 expirado + probe unknown => still_executing, attempts=1, backoff agendado, sem financeiro', async () => {
    const { deps } = depsFor(seedRow(), { probeMode: 'unknown' });
    let fin = 0;
    deps.applyFinancialUpdate = async () => { fin += 1; return { kind: 'applied' }; };
    const out = await reconcileExpiredRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps, CLOCK);
    expect(out.kind).toBe('still_executing');
    const row = await deps.ports.findById(REQ_ID);
    expect(row?.status).toBe('executing');
    const state = readReconciliationState(row?.metadata);
    expect(state.attempts).toBe(1);
    expect(state.exhausted).toBe(false);
    expect(state.leaseOwnerId).toBeNull();
    expect(fin).toBe(0);
  });

  test('W9 backoff ativo => nao reprocessa (backoff_wait, sem probe)', async () => {
    const meta = withReconciliationMetadata(
      {}, nextAttemptState({}, NOW, { maxAttempts: 5 }), NOW,
    );
    const { deps, probe } = depsFor(seedRow({ metadata: meta, updatedAt: STALE }), { probeMode: 'confirmed' });
    const out = await reconcileExpiredRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps, CLOCK);
    expect(out.kind).toBe('backoff_wait');
    expect(probe.calls).toHaveLength(0);
  });

  test('W10 attempts esgotados => attempts_exhausted (sem probe, sem financeiro)', async () => {
    const meta = withReconciliationMetadata(
      {}, { attempts: 5, exhausted: true }, NOW,
    );
    const { deps, probe } = depsFor(seedRow({ metadata: meta }), { probeMode: 'confirmed' });
    const out = await reconcileExpiredRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps, CLOCK);
    expect(out.kind).toBe('attempts_exhausted');
    expect(probe.calls).toHaveLength(0);
  });

  test('W11 DUAL: dois reconciliadores concorrentes => apenas um age', async () => {
    const { deps, probe } = depsFor(seedRow(), { probeMode: 'confirmed' });
    let fin = 0;
    deps.applyFinancialUpdate = async () => { fin += 1; return { kind: 'applied' }; };

    // worker A marca a lease (CAS) antes de B ler a mesma versao
    const [a, b] = await Promise.all([
      reconcileExpiredRefundRequest({ requestId: REQ_ID, ...ACTOR, actorId: 1 }, deps, { ...CLOCK, ownerId: 'A' }),
      reconcileExpiredRefundRequest({ requestId: REQ_ID, ...ACTOR, actorId: 2 }, deps, { ...CLOCK, ownerId: 'B' }),
    ]);
    const kinds = [a.kind, b.kind];
    // um dos dois executa; o outro perde a corrida (lease_lost/conflict/already_executed)
    expect(kinds).toContain('executed');
    expect(kinds.filter((k) => k === 'executed')).toHaveLength(1);
    expect(fin).toBe(1); // NENHUMA movimentacao financeira duplicada
    expect(probe.calls.length).toBeGreaterThanOrEqual(1);
  });

  test('W12 idempotencia: segunda reconciliacao apos executed => already_executed, sem financeiro', async () => {
    const { deps } = depsFor(seedRow(), { probeMode: 'confirmed' });
    expect((await reconcileExpiredRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps, CLOCK)).kind).toBe('executed');
    let fin = 0;
    deps.applyFinancialUpdate = async () => { fin += 1; return { kind: 'applied' }; };
    const again = await reconcileExpiredRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps, CLOCK);
    expect(again.kind).toBe('already_executed');
    expect(fin).toBe(0);
  });

  test('W13 execucao viva com receipt persistido nao depende de probe nem de TTL', async () => {
    const { deps, probe } = depsFor(seedRow({ updatedAt: NOW }), { probeMode: 'unknown' });
    const out = await reconcileExpiredRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps, CLOCK);
    // updatedAt recente => not_expired, logo o probe nao e consultado (anti-falso-timeout)
    expect(out.kind).toBe('not_expired');
    expect(probe.calls).toHaveLength(0);
  });

  test('W14 RBAC: papel fora de admin/manager => refused (sem probe)', async () => {
    const { deps, probe } = depsFor(seedRow(), { probeMode: 'confirmed' });
    const out = await reconcileExpiredRefundRequest({ requestId: REQ_ID, actorId: 1, actorRole: 'viewer' }, deps, CLOCK);
    expect(out.kind).toBe('refused');
    expect(probe.calls).toHaveLength(0);
  });

  test('W15 reconciliador nao cria movimentacao financeira propria (sem createRefund no worker)', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../../../server/modules/payments/services/refund-request-reconciliation.service.ts'), 'utf8');
    expect(src).not.toMatch(/createRefund\s*\(/);
  });
});

describe('R11–R13 CONFIRMED sem receipt verificável (defeito do FINAL VALIDATION GATE)', () => {
  test('R11 confirmed + externalRef vazio => still_executing, 0 financeiro, sem receipt', async () => {
    const { deps } = depsFor(seedRow(), { probeMode: 'confirmed' });
    deps.probe.setBehavior({ mode: 'confirmed', externalRef: '' });
    let fin = 0;
    deps.applyFinancialUpdate = async () => { fin += 1; return { kind: 'applied' }; };

    const out = await reconcileRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps);
    expect(out.kind).toBe('still_executing');
    expect((out as { detail: string }).detail).toBe('PROBE_UNVERIFIABLE_CONFIRMATION');
    expect(fin).toBe(0);

    const row = await deps.ports.findById(REQ_ID);
    expect(row?.status).toBe('executing');
    const { readProviderReceipt } = require('../../../server/modules/payments/services/refund-request-execution.service');
    expect(readProviderReceipt(row?.metadata)).toBeNull();
  });

  test('R12 confirmed + receipt valido continua executed (sem regressao do caminho feliz)', async () => {
    const { deps } = depsFor(seedRow(), { probeMode: 'confirmed' });
    let fin = 0;
    deps.applyFinancialUpdate = async () => { fin += 1; return { kind: 'applied' }; };
    const out = await reconcileRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps);
    expect(out.kind).toBe('executed');
    expect(fin).toBe(1);
  });

  test('R13 confirmed invalido entra em backoff/attempts (retry controlado, sem dinheiro)', async () => {
    const { deps } = depsFor(seedRow(), { probeMode: 'confirmed' });
    deps.probe.setBehavior({ mode: 'confirmed', externalRef: '' });
    let fin = 0;
    deps.applyFinancialUpdate = async () => { fin += 1; return { kind: 'applied' }; };

    const out = await reconcileExpiredRefundRequest({ requestId: REQ_ID, ...ACTOR }, deps, CLOCK);
    expect(out.kind).toBe('still_executing');
    expect(fin).toBe(0);

    const row = await deps.ports.findById(REQ_ID);
    expect(row?.status).toBe('executing');
    const state = readReconciliationState(row?.metadata);
    expect(state.attempts).toBe(1);
    expect(state.exhausted).toBe(false);
    expect(isInBackoff(row?.metadata, NOW)).toBe(true);
  });
});


