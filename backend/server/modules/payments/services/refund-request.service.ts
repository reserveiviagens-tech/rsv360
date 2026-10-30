/**
 * C36-DD — RefundRequest domain service.
 * Creates request records only. NEVER calls provider refund execution,
 * gateway, earning reversal, or ledger debit.
 */

import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../../../src/db/drizzle';
import { payments, refundRequests } from '../../../../src/db/schema/payments';

export const REFUND_REQUEST_OPEN_STATUSES = ['draft', 'pending'] as const;
export type RefundRequestOpenStatus = (typeof REFUND_REQUEST_OPEN_STATUSES)[number];

export type CreateRefundRequestInput = {
  paymentId: string;
  bookingId?: number | null;
  amount: string | number;
  currency?: string;
  reason?: string | null;
  requestedBy?: number | null;
  status?: RefundRequestOpenStatus;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type RefundRequestRow = {
  id: string;
  paymentId: string;
  bookingId: number | null;
  amount: string;
  currency: string;
  reason: string | null;
  requestedBy: number | null;
  status: string;
  requestVersion: number;
  idempotencyKey: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateRefundRequestResult =
  | { kind: 'created'; request: RefundRequestRow }
  | { kind: 'idempotent'; request: RefundRequestRow }
  | { kind: 'rejected'; reason: string; detail?: string };

export type RefundRequestPorts = {
  findPayment(paymentId: string): Promise<{
    id: string;
    bookingId: number | null;
    amount: string | number;
    currency: string;
    status: string;
  } | null>;
  findByIdempotencyKey(key: string): Promise<RefundRequestRow | null>;
  findOpenByPaymentId(paymentId: string): Promise<RefundRequestRow | null>;
  insert(row: {
    paymentId: string;
    bookingId: number | null;
    amount: string;
    currency: string;
    reason: string | null;
    requestedBy: number | null;
    status: RefundRequestOpenStatus;
    idempotencyKey: string | null;
    metadata: Record<string, unknown> | null;
  }): Promise<RefundRequestRow>;
  findById(id: string): Promise<RefundRequestRow | null>;
};

function mapRow(row: {
  id: string;
  paymentId: string;
  bookingId: number | null;
  amount: string | number;
  currency: string;
  reason: string | null;
  requestedBy: number | null;
  status: string;
  requestVersion: number;
  idempotencyKey: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}): RefundRequestRow {
  return {
    id: row.id,
    paymentId: row.paymentId,
    bookingId: row.bookingId,
    amount: String(row.amount),
    currency: row.currency,
    reason: row.reason,
    requestedBy: row.requestedBy,
    status: row.status,
    requestVersion: row.requestVersion,
    idempotencyKey: row.idempotencyKey,
    metadata: row.metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function normalizeAmount(raw: string | number): string | null {
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(2);
}

function normalizeCurrency(raw: string | undefined): string | null {
  const c = (raw ?? 'BRL').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(c)) return null;
  return c;
}

export function createDrizzleRefundRequestPorts(): RefundRequestPorts {
  return {
    async findPayment(paymentId) {
      const [row] = await db
        .select({
          id: payments.id,
          bookingId: payments.bookingId,
          amount: payments.amount,
          currency: payments.currency,
          status: payments.status,
        })
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);
      return row ?? null;
    },
    async findByIdempotencyKey(key) {
      const [row] = await db
        .select()
        .from(refundRequests)
        .where(eq(refundRequests.idempotencyKey, key))
        .limit(1);
      return row ? mapRow(row) : null;
    },
    async findOpenByPaymentId(paymentId) {
      const [row] = await db
        .select()
        .from(refundRequests)
        .where(
          and(
            eq(refundRequests.paymentId, paymentId),
            inArray(refundRequests.status, [...REFUND_REQUEST_OPEN_STATUSES]),
          ),
        )
        .limit(1);
      return row ? mapRow(row) : null;
    },
    async insert(params) {
      const [row] = await db
        .insert(refundRequests)
        .values({
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
        })
        .returning();
      return mapRow(row);
    },
    async findById(id) {
      const [row] = await db
        .select()
        .from(refundRequests)
        .where(eq(refundRequests.id, id))
        .limit(1);
      return row ? mapRow(row) : null;
    },
  };
}

/**
 * Create a RefundRequest. Does not mutate payment/earning/ledger or call gateway.
 */
export async function createRefundRequest(
  input: CreateRefundRequestInput,
  ports: RefundRequestPorts = createDrizzleRefundRequestPorts(),
): Promise<CreateRefundRequestResult> {
  const amount = normalizeAmount(input.amount);
  if (!amount) {
    return { kind: 'rejected', reason: 'INVALID_AMOUNT' };
  }

  const currency = normalizeCurrency(input.currency);
  if (!currency) {
    return { kind: 'rejected', reason: 'INVALID_CURRENCY' };
  }

  const status: RefundRequestOpenStatus =
    input.status === 'draft' ? 'draft' : 'pending';

  if (input.idempotencyKey) {
    const existingKey = await ports.findByIdempotencyKey(input.idempotencyKey);
    if (existingKey) {
      return { kind: 'idempotent', request: existingKey };
    }
  }

  const payment = await ports.findPayment(input.paymentId);
  if (!payment) {
    return { kind: 'rejected', reason: 'PAYMENT_NOT_FOUND' };
  }

  const bookingId =
    input.bookingId === undefined ? payment.bookingId : input.bookingId;

  if (
    bookingId != null &&
    payment.bookingId != null &&
    Number(bookingId) !== Number(payment.bookingId)
  ) {
    return {
      kind: 'rejected',
      reason: 'BOOKING_PAYMENT_MISMATCH',
      detail: 'bookingId does not match payment.bookingId',
    };
  }

  if (bookingId == null && payment.bookingId == null) {
    return { kind: 'rejected', reason: 'BOOKING_REQUIRED' };
  }

  const open = await ports.findOpenByPaymentId(payment.id);
  if (open) {
    return { kind: 'idempotent', request: open };
  }

  const snapshot = {
    policyVersion: 'C36-DD',
    paymentStatusAtRequest: payment.status,
    paymentAmountAtRequest: String(payment.amount),
    paymentCurrencyAtRequest: payment.currency,
    ...(input.metadata ?? {}),
  };

  try {
    const request = await ports.insert({
      paymentId: payment.id,
      bookingId: bookingId ?? payment.bookingId,
      amount,
      currency,
      reason: input.reason ?? null,
      requestedBy: input.requestedBy ?? null,
      status,
      idempotencyKey: input.idempotencyKey ?? null,
      metadata: snapshot,
    });
    return { kind: 'created', request };
  } catch (error) {
    const e = error as { code?: string; constraint?: string };
    if (e?.code === '23505') {
      const again =
        (input.idempotencyKey
          ? await ports.findByIdempotencyKey(input.idempotencyKey)
          : null) ?? (await ports.findOpenByPaymentId(payment.id));
      if (again) return { kind: 'idempotent', request: again };
    }
    throw error;
  }
}

export async function getRefundRequestById(
  id: string,
  ports: RefundRequestPorts = createDrizzleRefundRequestPorts(),
): Promise<RefundRequestRow | null> {
  return ports.findById(id);
}
