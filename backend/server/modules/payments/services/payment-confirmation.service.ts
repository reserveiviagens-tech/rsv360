/**
 * C36-CM — Confirm booking payment (authorizing money event) then trigger earning writer.
 * Does NOT write ledger / payout.
 */

import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../../../src/db/drizzle';
import { bookings, payments } from '../../../../src/db/schema';
import { createEarningFromConfirmedPayment } from '../../../../../server/modules/partners/services/partner-earning-on-payment.service';
import type { EarningWriterResult } from '../../../../../server/modules/partners/services/partner-earning-writer.types';

export type ConfirmPaymentResult = {
  paymentId: string;
  status: string;
  transitioned: boolean;
  bookingId: number | null;
  earning: EarningWriterResult | null;
};

const CONFIRMABLE = new Set(['pending', 'processing']);

export class PaymentConfirmationService {
  /**
   * Idempotent confirm: pending|processing → approved + paidAt.
   * Always attempts earning after approved (writer is idempotent).
   * Earning failure does not roll back payment confirmation.
   */
  async confirmById(
    paymentId: string,
    opts: { tPay?: Date; skipEarning?: boolean } = {},
  ): Promise<ConfirmPaymentResult> {
    const tPay = opts.tPay ?? new Date();

    const [existing] = await db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);

    if (!existing) {
      return {
        paymentId,
        status: 'missing',
        transitioned: false,
        bookingId: null,
        earning: { kind: 'skipped', reason: 'PAYMENT_NOT_FOUND' },
      };
    }

    let transitioned = false;
    let status = existing.status;
    let bookingId = existing.bookingId ?? null;

    if (CONFIRMABLE.has(existing.status)) {
      const [updated] = await db
        .update(payments)
        .set({
          status: 'approved',
          paidAt: existing.paidAt ?? tPay,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(payments.id, paymentId),
            inArray(payments.status, ['pending', 'processing']),
          ),
        )
        .returning();

      if (updated) {
        transitioned = true;
        status = updated.status;
        bookingId = updated.bookingId ?? null;

        if (bookingId != null) {
          await db
            .update(bookings)
            .set({
              paymentStatus: 'paid',
              status: 'confirmed',
              confirmedAt: tPay,
              updatedAt: new Date(),
            })
            .where(eq(bookings.id, bookingId));
        }
      } else {
        // Race: another worker confirmed — reload
        const [reloaded] = await db
          .select()
          .from(payments)
          .where(eq(payments.id, paymentId))
          .limit(1);
        status = reloaded?.status ?? status;
        bookingId = reloaded?.bookingId ?? bookingId;
      }
    }

    let earning: EarningWriterResult | null = null;
    if (!opts.skipEarning && status === 'approved') {
      try {
        earning = await createEarningFromConfirmedPayment(paymentId);
      } catch (err) {
        // Never undo payment confirmation for partner earning errors.
        console.error('[C36-CM] earning hook failed', {
          paymentId,
          message: err instanceof Error ? err.message : 'unknown',
        });
        earning = {
          kind: 'fail_closed',
          reason: 'EARNING_HOOK_ERROR',
          detail: err instanceof Error ? err.message : 'unknown',
        };
      }
    }

    return { paymentId, status, transitioned, bookingId, earning };
  }

  /**
   * Resolve payment by provider external id (checkout session / MP id) then confirm.
   */
  async confirmByExternalId(
    externalId: string,
    opts: { tPay?: Date; skipEarning?: boolean } = {},
  ): Promise<ConfirmPaymentResult | null> {
    const [row] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.externalId, externalId))
      .limit(1);
    if (!row) return null;
    return this.confirmById(row.id, opts);
  }
}

export const paymentConfirmationService = new PaymentConfirmationService();
