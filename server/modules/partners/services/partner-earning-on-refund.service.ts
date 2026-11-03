/**
 * C36-DB — Apply partner earning reversal when authorizing payment is refunded.
 *
 * Local lifecycle only: mark payment refunded (no payment gateway call).
 * Reuses reverseEarningForPaymentRefund (atomic earning→reversed + ledger debit).
 * Payout remains blocked.
 */

import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { payments } from '../../../../backend/src/db/schema/payments';
import {
  reverseEarningForPaymentRefund,
  type ReverseEarningResult,
  type ReversalPorts,
} from './partner-earning-reversal.service';

export type PaymentRefundEarningResult = {
  paymentId: string;
  paymentStatus: string;
  paymentTransitioned: boolean;
  reversal: ReverseEarningResult;
};

export type PaymentRefundEarningDeps = {
  markPaymentRefunded: (paymentId: string) => Promise<{
    status: string;
    transitioned: boolean;
  } | null>;
  reverse: (
    paymentId: string,
    ports?: ReversalPorts,
  ) => Promise<ReverseEarningResult>;
};

const REFUND_MONEY_STATUSES = new Set([
  'refunded',
  'partially_refunded',
]);

function createDefaultDeps(): PaymentRefundEarningDeps {
  return {
    async markPaymentRefunded(paymentId) {
      const [existing] = await db
        .select({ id: payments.id, status: payments.status })
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);
      if (!existing) return null;

      if (REFUND_MONEY_STATUSES.has(existing.status)) {
        return { status: existing.status, transitioned: false };
      }

      // Only reverse earnings for previously approved money events.
      if (existing.status !== 'approved') {
        return { status: existing.status, transitioned: false };
      }

      const [updated] = await db
        .update(payments)
        .set({ status: 'refunded', updatedAt: new Date() })
        .where(
          and(eq(payments.id, paymentId), inArray(payments.status, ['approved'])),
        )
        .returning({ status: payments.status });

      if (updated) {
        return { status: updated.status, transitioned: true };
      }

      const [reloaded] = await db
        .select({ status: payments.status })
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);
      return {
        status: reloaded?.status ?? existing.status,
        transitioned: false,
      };
    },
    reverse: reverseEarningForPaymentRefund,
  };
}

/**
 * Controlled refund effects for partner earnings (no gateway / no payout).
 * Safe to retry — payment update and reversal are both idempotent.
 */
export async function applyEarningReversalOnPaymentRefund(
  paymentId: string,
  deps: PaymentRefundEarningDeps = createDefaultDeps(),
  reversalPorts?: ReversalPorts,
): Promise<PaymentRefundEarningResult> {
  const marked = await deps.markPaymentRefunded(paymentId);
  if (!marked) {
    return {
      paymentId,
      paymentStatus: 'missing',
      paymentTransitioned: false,
      reversal: { kind: 'skipped', reason: 'PAYMENT_NOT_FOUND' },
    };
  }

  if (!REFUND_MONEY_STATUSES.has(marked.status)) {
    return {
      paymentId,
      paymentStatus: marked.status,
      paymentTransitioned: marked.transitioned,
      reversal: { kind: 'skipped', reason: 'PAYMENT_NOT_REFUNDABLE_FOR_EARNING' },
    };
  }

  const reversal = await deps.reverse(paymentId, reversalPorts);

  return {
    paymentId,
    paymentStatus: marked.status,
    paymentTransitioned: marked.transitioned,
    reversal,
  };
}
