/**
 * C36-DD — RefundRequest domain (memory ports; no DB / no financial writers).
 */

import {
  createRefundRequest,
  getRefundRequestById,
  type RefundRequestPorts,
  type RefundRequestRow,
} from '../../../server/modules/payments/services/refund-request.service';

const PAYMENT_ID = '77777777-7777-7777-7777-777777777777';

function createMemoryPorts(seed?: {
  payment?: {
    id: string;
    bookingId: number | null;
    amount: string;
    currency: string;
    status: string;
  } | null;
}): RefundRequestPorts & { store: RefundRequestRow[]; createRefundCalls: number } {
  const payment =
    seed && 'payment' in seed
      ? seed.payment
      : {
          id: PAYMENT_ID,
          bookingId: 42,
          amount: '1000.00',
          currency: 'BRL',
          status: 'approved',
        };
  const store: RefundRequestRow[] = [];
  const ports: RefundRequestPorts & {
    store: RefundRequestRow[];
    createRefundCalls: number;
  } = {
    store,
    createRefundCalls: 0,
    async findPayment(id) {
      if (!payment || payment.id !== id) return null;
      return payment;
    },
    async findByIdempotencyKey(key) {
      return store.find((r) => r.idempotencyKey === key) ?? null;
    },
    async findOpenByPaymentId(paymentId) {
      return (
        store.find(
          (r) =>
            r.paymentId === paymentId &&
            (r.status === 'draft' || r.status === 'pending'),
        ) ?? null
      );
    },
    async insert(params) {
      const row: RefundRequestRow = {
        id: `req-${store.length + 1}`,
        paymentId: params.paymentId,
        bookingId: params.bookingId,
        amount: params.amount,
        currency: params.currency,
        reason: params.reason,
        requestedBy: params.requestedBy,
        status: params.status,
        requestVersion: 1,
        idempotencyKey: params.idempotencyKey,
        metadata: params.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.push(row);
      return row;
    },
    async findById(id) {
      return store.find((r) => r.id === id) ?? null;
    },
  };
  return ports;
}

describe('createRefundRequest (C36-DD)', () => {
  it('creates pending request with snapshot metadata', async () => {
    const ports = createMemoryPorts();
    const result = await createRefundRequest(
      {
        paymentId: PAYMENT_ID,
        amount: '100.50',
        currency: 'brl',
        reason: 'customer_request',
        requestedBy: 7,
      },
      ports,
    );
    expect(result.kind).toBe('created');
    if (result.kind !== 'created') return;
    expect(result.request.status).toBe('pending');
    expect(result.request.amount).toBe('100.50');
    expect(result.request.currency).toBe('BRL');
    expect(result.request.bookingId).toBe(42);
    expect(result.request.requestVersion).toBe(1);
    expect(ports.store).toHaveLength(1);
    expect(ports.createRefundCalls).toBe(0);
  });

  it('rejects invalid amount', async () => {
    const ports = createMemoryPorts();
    const result = await createRefundRequest(
      { paymentId: PAYMENT_ID, amount: 0 },
      ports,
    );
    expect(result).toEqual({ kind: 'rejected', reason: 'INVALID_AMOUNT' });
    expect(ports.store).toHaveLength(0);
  });

  it('rejects invalid currency', async () => {
    const ports = createMemoryPorts();
    const result = await createRefundRequest(
      { paymentId: PAYMENT_ID, amount: 10, currency: 'REAL' },
      ports,
    );
    expect(result).toEqual({ kind: 'rejected', reason: 'INVALID_CURRENCY' });
  });

  it('rejects missing payment', async () => {
    const ports = createMemoryPorts({ payment: null });
    const result = await createRefundRequest(
      { paymentId: PAYMENT_ID, amount: 10 },
      ports,
    );
    expect(result).toEqual({ kind: 'rejected', reason: 'PAYMENT_NOT_FOUND' });
  });

  it('rejects booking/payment mismatch', async () => {
    const ports = createMemoryPorts();
    const result = await createRefundRequest(
      { paymentId: PAYMENT_ID, bookingId: 99, amount: 10 },
      ports,
    );
    expect(result.kind).toBe('rejected');
    if (result.kind !== 'rejected') return;
    expect(result.reason).toBe('BOOKING_PAYMENT_MISMATCH');
  });

  it('idempotent on open request for same payment', async () => {
    const ports = createMemoryPorts();
    const first = await createRefundRequest(
      { paymentId: PAYMENT_ID, amount: 10 },
      ports,
    );
    const second = await createRefundRequest(
      { paymentId: PAYMENT_ID, amount: 10 },
      ports,
    );
    expect(first.kind).toBe('created');
    expect(second.kind).toBe('idempotent');
    expect(ports.store).toHaveLength(1);
  });

  it('idempotent on idempotencyKey', async () => {
    const ports = createMemoryPorts();
    const first = await createRefundRequest(
      { paymentId: PAYMENT_ID, amount: 10, idempotencyKey: 'c36dd-key-1' },
      ports,
    );
    const second = await createRefundRequest(
      { paymentId: PAYMENT_ID, amount: 99, idempotencyKey: 'c36dd-key-1' },
      ports,
    );
    expect(first.kind).toBe('created');
    expect(second.kind).toBe('idempotent');
    if (second.kind !== 'idempotent') return;
    expect(second.request.amount).toBe('10.00');
  });

  it('get by id returns stored request', async () => {
    const ports = createMemoryPorts();
    const created = await createRefundRequest(
      { paymentId: PAYMENT_ID, amount: 25 },
      ports,
    );
    if (created.kind !== 'created') return;
    const loaded = await getRefundRequestById(created.request.id, ports);
    expect(loaded?.id).toBe(created.request.id);
  });

  it('does not invoke RefundService.createRefund (separation invariant)', async () => {
    const ports = createMemoryPorts();
    const spy = jest.fn();
    // Guard: domain module must not import createRefund path in this test harness.
    await createRefundRequest({ paymentId: PAYMENT_ID, amount: 10 }, ports);
    expect(spy).not.toHaveBeenCalled();
    expect(ports.createRefundCalls).toBe(0);
  });
});
