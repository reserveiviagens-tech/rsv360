/**
 * C36-DB — Staging refund E2E probe (tsx inside backend container).
 * Env: C36DB_NS, C36DB_PAYMENT_A, C36DB_PAYMENT_F
 *
 * Proves: Payment→Earning→Credit→Refund→Reversed+Debit, retry idempotent,
 * forced TX rollback leaves earning non-reversed. No gateway / payout.
 */

import { and, eq } from 'drizzle-orm';
import { db } from '../../server/lib/db';
import {
  partnerEarnings,
  partnerLedgerEntries,
} from '../src/db/schema/partners';
import { payments } from '../src/db/schema/payments';
import { createEarningFromConfirmedPayment } from '../../server/modules/partners/services/partner-earning-on-payment.service';
import { applyEarningReversalOnPaymentRefund } from '../../server/modules/partners/services/partner-earning-on-refund.service';
import {
  reverseEarningForPaymentRefund,
  type ReversalPorts,
} from '../../server/modules/partners/services/partner-earning-reversal.service';
import { BOOKING_PAYMENT_SOURCE } from '../../server/modules/partners/services/partner-earning-writer.types';

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

function creditKey(paymentId: string): string {
  return `booking_payment_credit:${paymentId}`;
}

function debitKey(paymentId: string): string {
  return `booking_payment_debit:${paymentId}`;
}

async function countBySource(paymentId: string): Promise<number> {
  const rows = await db
    .select({ id: partnerEarnings.id })
    .from(partnerEarnings)
    .where(
      and(
        eq(partnerEarnings.sourceType, BOOKING_PAYMENT_SOURCE),
        eq(partnerEarnings.sourceId, paymentId),
      ),
    );
  return rows.length;
}

async function countLedger(key: string): Promise<number> {
  const rows = await db
    .select({ id: partnerLedgerEntries.id })
    .from(partnerLedgerEntries)
    .where(eq(partnerLedgerEntries.idempotencyKey, key));
  return rows.length;
}

async function loadEarning(paymentId: string) {
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
  return row
    ? {
        id: row.id,
        status: row.status,
        amountCents: Number(row.amountCents),
        partnerId: row.partnerId,
        currency: row.currency,
        rateBps: (row.metadata as { rateBps?: number } | null)?.rateBps ?? null,
      }
    : null;
}

async function main() {
  const ns = req('C36DB_NS');
  if (!ns.startsWith('c36db_')) throw new Error('NS must start with c36db_');

  const paymentA = req('C36DB_PAYMENT_A');
  const paymentF = req('C36DB_PAYMENT_F');

  const results: Record<string, string | number | boolean | null> = { ns };

  // --- Seed earning+credit for A (and F for atomic) ---
  const earnA1 = await createEarningFromConfirmedPayment(paymentA);
  results.earnA1 = earnA1.kind;
  if (earnA1.kind !== 'created' && earnA1.kind !== 'idempotent') {
    throw new Error(`A earning expected created, got ${JSON.stringify(earnA1)}`);
  }

  const before = {
    earnCount: await countBySource(paymentA),
    creditCount: await countLedger(creditKey(paymentA)),
    debitCount: await countLedger(debitKey(paymentA)),
    earning: await loadEarning(paymentA),
  };
  if (before.earnCount !== 1 || before.creditCount !== 1 || before.debitCount !== 0) {
    throw new Error(`before refund expected 1/1/0, got ${JSON.stringify(before)}`);
  }
  if (!before.earning || before.earning.status === 'reversed') {
    throw new Error('before refund earning missing or already reversed');
  }
  results.beforeEarnStatus = before.earning.status;
  results.beforeAmount = before.earning.amountCents;
  results.beforeRateBps = before.earning.rateBps;
  console.log('C36DB_BEFORE_REFUND', JSON.stringify(before));

  // --- Refund A ---
  const r1 = await applyEarningReversalOnPaymentRefund(paymentA);
  results.refundA1 = r1.reversal.kind;
  if (r1.reversal.kind !== 'reversed' && r1.reversal.kind !== 'idempotent') {
    throw new Error(`refund A1 expected reversed, got ${JSON.stringify(r1)}`);
  }

  const after = {
    earnCount: await countBySource(paymentA),
    creditCount: await countLedger(creditKey(paymentA)),
    debitCount: await countLedger(debitKey(paymentA)),
    earning: await loadEarning(paymentA),
    paymentStatus: (
      await db.select({ status: payments.status }).from(payments).where(eq(payments.id, paymentA)).limit(1)
    )[0]?.status,
  };
  if (after.earnCount !== 1 || after.creditCount !== 1 || after.debitCount !== 1) {
    throw new Error(`after refund expected 1/1/1, got ${JSON.stringify(after)}`);
  }
  if (after.earning?.status !== 'reversed') {
    throw new Error(`earning status expected reversed, got ${after.earning?.status}`);
  }
  if (after.earning.amountCents !== before.earning.amountCents) {
    throw new Error('refund must not change earning amount');
  }
  if (after.earning.rateBps !== before.earning.rateBps) {
    throw new Error('refund must not recalculate rate_bps snapshot');
  }
  if (after.paymentStatus !== 'refunded') {
    throw new Error(`payment status expected refunded, got ${after.paymentStatus}`);
  }
  results.afterEarnStatus = after.earning.status;
  results.afterDebitCount = after.debitCount;
  console.log('C36DB_AFTER_REFUND', JSON.stringify(after));

  // --- Retry refund A ---
  const r2 = await applyEarningReversalOnPaymentRefund(paymentA);
  results.refundA2 = r2.reversal.kind;
  if (r2.reversal.kind !== 'idempotent') {
    throw new Error(`retry expected idempotent, got ${JSON.stringify(r2)}`);
  }
  const retry = {
    earnCount: await countBySource(paymentA),
    creditCount: await countLedger(creditKey(paymentA)),
    debitCount: await countLedger(debitKey(paymentA)),
  };
  if (retry.earnCount !== 1 || retry.creditCount !== 1 || retry.debitCount !== 1) {
    throw new Error(`after retry expected 1/1/1, got ${JSON.stringify(retry)}`);
  }
  results.retryStable = true;
  console.log('C36DB_RETRY_RESULT', JSON.stringify(retry));

  // --- Atomic fail F: earning created, then forced TX rollback on reverse ---
  const earnF = await createEarningFromConfirmedPayment(paymentF);
  results.earnF = earnF.kind;
  if (earnF.kind !== 'created' && earnF.kind !== 'idempotent') {
    throw new Error(`F earning expected created, got ${JSON.stringify(earnF)}`);
  }

  const earningF = await loadEarning(paymentF);
  if (!earningF) throw new Error('F earning missing');

  // Mark payment refunded without reversal (use orchestrator deps reverse = noop), then
  // call reverse with ports that update then throw inside TX shape.
  await applyEarningReversalOnPaymentRefund(paymentF, {
    async markPaymentRefunded(id) {
      await db
        .update(payments)
        .set({ status: 'refunded', updatedAt: new Date() })
        .where(eq(payments.id, id));
      return { status: 'refunded', transitioned: true };
    },
    async reverse() {
      return { kind: 'skipped', reason: 'DEFER_ATOMIC_PROBE' };
    },
  });

  const failPorts: ReversalPorts = {
    async findEarningByPayment(paymentId) {
      const e = await loadEarning(paymentId);
      return e
        ? {
            id: e.id,
            partnerId: e.partnerId,
            amountCents: e.amountCents,
            currency: e.currency,
            status: e.status,
          }
        : null;
    },
    async findDebitByPayment(paymentId) {
      const [row] = await db
        .select({ id: partnerLedgerEntries.id })
        .from(partnerLedgerEntries)
        .where(eq(partnerLedgerEntries.idempotencyKey, debitKey(paymentId)))
        .limit(1);
      return row ?? null;
    },
    async reverseAtomic(input) {
      return await db.transaction(async (tx) => {
        await tx
          .update(partnerEarnings)
          .set({ status: 'reversed' })
          .where(eq(partnerEarnings.id, input.earningId));
        throw new Error('C36DB_FORCED_ROLLBACK');
      });
    },
  };

  let atomicThrew = false;
  try {
    await reverseEarningForPaymentRefund(paymentF, failPorts);
  } catch (err) {
    atomicThrew = err instanceof Error && err.message === 'C36DB_FORCED_ROLLBACK';
  }
  results.atomicThrew = atomicThrew;
  if (!atomicThrew) throw new Error('expected forced rollback throw');

  const earnFAfter = await loadEarning(paymentF);
  const debitF = await countLedger(debitKey(paymentF));
  results.earnFStatusAfterFail = earnFAfter?.status ?? null;
  results.debitFAfterFail = debitF;
  if (earnFAfter?.status === 'reversed') {
    throw new Error('atomic fail left earning reversed without debit');
  }
  if (debitF !== 0) {
    throw new Error('atomic fail left orphan debit');
  }

  // Complete F reversal for cleanup consistency (happy path)
  const rF = await reverseEarningForPaymentRefund(paymentF);
  if (rF.kind !== 'reversed' && rF.kind !== 'idempotent') {
    throw new Error(`F final reverse expected reversed, got ${JSON.stringify(rF)}`);
  }
  results.refundFFinal = rF.kind;

  console.log('C36DB_PROBE_OK', JSON.stringify(results));
}

main().catch((err) => {
  console.error('C36DB_PROBE_FAIL', err instanceof Error ? err.message : err);
  process.exit(1);
});
