/**
 * C36-CM — Map confirmed payment → PartnerEarningWriter (no ledger).
 */

import { eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { bookings } from '../../../../backend/src/db/schema/bookings';
import { payments } from '../../../../backend/src/db/schema/payments';
import {
  createPartnerEarningWriterService,
  type EarningWriterResult,
  type PartnerEarningWriterService,
} from './partner-earning-writer';

export function moneyToCents(raw: string | number): number {
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || n < 0) {
    throw new Error('INVALID_MONEY_AMOUNT');
  }
  return Math.round(n * 100);
}

export type PaymentEarningOrchestratorDeps = {
  loadPayment: (paymentId: string) => Promise<{
    id: string;
    status: string;
    bookingId: number | null;
    amount: string | number;
    currency: string;
    paidAt: Date | null;
  } | null>;
  loadBooking: (bookingId: number) => Promise<{
    id: number;
    bookingType: string;
    itemId: number;
    totalAmount: string | number;
    currency: string;
    metadata: unknown;
  } | null>;
  writer: PartnerEarningWriterService;
};

function createDefaultDeps(): PaymentEarningOrchestratorDeps {
  return {
    async loadPayment(paymentId) {
      const [row] = await db
        .select({
          id: payments.id,
          status: payments.status,
          bookingId: payments.bookingId,
          amount: payments.amount,
          currency: payments.currency,
          paidAt: payments.paidAt,
        })
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);
      return row ?? null;
    },
    async loadBooking(bookingId) {
      const [row] = await db
        .select({
          id: bookings.id,
          bookingType: bookings.bookingType,
          itemId: bookings.itemId,
          totalAmount: bookings.totalAmount,
          currency: bookings.currency,
          metadata: bookings.metadata,
        })
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);
      return row ?? null;
    },
    writer: createPartnerEarningWriterService(),
  };
}

/**
 * Authorizing event = payment confirmed (status approved).
 * Never triggers on booking creation.
 */
export async function createEarningFromConfirmedPayment(
  paymentId: string,
  deps: PaymentEarningOrchestratorDeps = createDefaultDeps(),
): Promise<EarningWriterResult> {
  const payment = await deps.loadPayment(paymentId);
  if (!payment) {
    return { kind: 'skipped', reason: 'PAYMENT_NOT_FOUND' };
  }
  if (payment.status !== 'approved') {
    return { kind: 'skipped', reason: 'PAYMENT_NOT_CONFIRMED' };
  }
  if (payment.bookingId == null) {
    return { kind: 'skipped', reason: 'PAYMENT_WITHOUT_BOOKING' };
  }

  const booking = await deps.loadBooking(payment.bookingId);
  if (!booking) {
    return { kind: 'skipped', reason: 'BOOKING_NOT_FOUND' };
  }

  let baseCents: number;
  try {
    // SoT basis = booking_total (ADR C36-CC); payment.amount is cross-check only.
    baseCents = moneyToCents(booking.totalAmount);
  } catch {
    return { kind: 'fail_closed', reason: 'INVALID_BASE_CENTS' };
  }

  const tPay = payment.paidAt ?? new Date();

  return deps.writer.createFromBookingPayment({
    paymentId: payment.id,
    paymentStatus: payment.status,
    bookingId: booking.id,
    baseCents,
    currency: booking.currency || payment.currency || 'BRL',
    tPay,
    bookingType: booking.bookingType,
    itemId: booking.itemId,
    bookingMetadata: booking.metadata,
  });
}
