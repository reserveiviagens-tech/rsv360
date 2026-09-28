/**
 * C36-CR — Reverse partner earning + ledger debit (atomic).
 * Triggered by refund of the authorizing payment. Payout remains blocked.
 */

import { and, eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import {
  partnerEarnings,
  partnerLedgerEntries,
} from '../../../../backend/src/db/schema/partners';
import { BOOKING_PAYMENT_SOURCE } from './partner-earning-writer.types';

export type ReverseEarningResult =
  | { kind: 'skipped'; reason: string }
  | { kind: 'reversed'; earningId: string; debitId: string }
  | { kind: 'idempotent'; earningId: string; debitId: string | null };

export type ReversalPorts = {
  findEarningByPayment(paymentId: string): Promise<{
    id: string;
    partnerId: string;
    amountCents: number;
    currency: string;
    status: string;
  } | null>;
  reverseAtomic(input: {
    earningId: string;
    partnerId: string;
    amountCents: number;
    currency: string;
    paymentId: string;
  }): Promise<{ debitId: string }>;
  findDebitByPayment(paymentId: string): Promise<{ id: string } | null>;
};

function createDefaultReversalPorts(): ReversalPorts {
  return {
    async findEarningByPayment(paymentId) {
      const [row] = await db
        .select({
          id: partnerEarnings.id,
          partnerId: partnerEarnings.partnerId,
          amountCents: partnerEarnings.amountCents,
          currency: partnerEarnings.currency,
          status: partnerEarnings.status,
        })
        .from(partnerEarnings)
        .where(
          and(
            eq(partnerEarnings.sourceType, BOOKING_PAYMENT_SOURCE),
            eq(partnerEarnings.sourceId, paymentId),
          ),
        )
        .limit(1);
      return row
        ? {
            id: row.id,
            partnerId: row.partnerId,
            amountCents: Number(row.amountCents),
            currency: row.currency,
            status: row.status,
          }
        : null;
    },

    async findDebitByPayment(paymentId) {
      const key = `booking_payment_debit:${paymentId}`;
      const [row] = await db
        .select({ id: partnerLedgerEntries.id })
        .from(partnerLedgerEntries)
        .where(eq(partnerLedgerEntries.idempotencyKey, key))
        .limit(1);
      return row ?? null;
    },

    async reverseAtomic(input) {
      const debitKey = `booking_payment_debit:${input.paymentId}`;
      return await db.transaction(async (tx) => {
        await tx
          .update(partnerEarnings)
          .set({ status: 'reversed' })
          .where(eq(partnerEarnings.id, input.earningId));

        const [debit] = await tx
          .insert(partnerLedgerEntries)
          .values({
            partnerId: input.partnerId,
            entryType: 'debit',
            amountCents: input.amountCents,
            currency: input.currency,
            earningId: input.earningId,
            idempotencyKey: debitKey,
          })
          .returning({ id: partnerLedgerEntries.id });

        return { debitId: debit.id };
      });
    },
  };
}

/**
 * Reverse earning for a refunded booking_payment.
 * Idempotent on debit idempotency key + earning already reversed.
 */
export async function reverseEarningForPaymentRefund(
  paymentId: string,
  ports: ReversalPorts = createDefaultReversalPorts(),
): Promise<ReverseEarningResult> {
  const earning = await ports.findEarningByPayment(paymentId);
  if (!earning) {
    return { kind: 'skipped', reason: 'EARNING_NOT_FOUND' };
  }

  if (earning.status === 'reversed') {
    const debit = await ports.findDebitByPayment(paymentId);
    return {
      kind: 'idempotent',
      earningId: earning.id,
      debitId: debit?.id ?? null,
    };
  }

  if (earning.status === 'cancelled') {
    return { kind: 'skipped', reason: 'EARNING_CANCELLED' };
  }

  const existingDebit = await ports.findDebitByPayment(paymentId);
  if (existingDebit) {
    return {
      kind: 'idempotent',
      earningId: earning.id,
      debitId: existingDebit.id,
    };
  }

  try {
    const { debitId } = await ports.reverseAtomic({
      earningId: earning.id,
      partnerId: earning.partnerId,
      amountCents: earning.amountCents,
      currency: earning.currency,
      paymentId,
    });
    return { kind: 'reversed', earningId: earning.id, debitId };
  } catch (error) {
    const e = error as { code?: string; constraint?: string };
    if (e?.code === '23505') {
      const debit = await ports.findDebitByPayment(paymentId);
      return {
        kind: 'idempotent',
        earningId: earning.id,
        debitId: debit?.id ?? null,
      };
    }
    throw error;
  }
}
