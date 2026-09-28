/**
 * C36-DA — Staging ledger reconciliation probe (run inside backend container via tsx).
 * Env: C36DA_NS, C36DA_PAYMENT_A, C36DA_PAYMENT_F, C36DA_PARTNER_F
 *
 * Proves: Payment → Earning → Ledger Credit (amount match, key, idempotent retry,
 * forced atomic rollback when credit unique key collides).
 * Does NOT touch payout / refund / production.
 */

import { and, eq } from 'drizzle-orm';
import { db } from '../../server/lib/db';
import {
  partnerEarnings,
  partnerLedgerEntries,
} from '../src/db/schema/partners';
import { createEarningFromConfirmedPayment } from '../../server/modules/partners/services/partner-earning-on-payment.service';
import { BOOKING_PAYMENT_SOURCE } from '../../server/modules/partners/services/partner-earning-writer.types';

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

function creditKey(paymentId: string): string {
  return `booking_payment_credit:${paymentId}`;
}

async function countEarnings(paymentId: string): Promise<number> {
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

async function countCredits(paymentId: string): Promise<number> {
  const rows = await db
    .select({ id: partnerLedgerEntries.id })
    .from(partnerLedgerEntries)
    .where(eq(partnerLedgerEntries.idempotencyKey, creditKey(paymentId)));
  return rows.length;
}

async function loadPair(paymentId: string): Promise<{
  earningAmount: number;
  creditAmount: number;
  creditEarningId: string | null;
  earningId: string;
  entryType: string;
}> {
  const [earning] = await db
    .select()
    .from(partnerEarnings)
    .where(
      and(
        eq(partnerEarnings.sourceType, BOOKING_PAYMENT_SOURCE),
        eq(partnerEarnings.sourceId, paymentId),
      ),
    )
    .limit(1);
  if (!earning) throw new Error(`earning missing for ${paymentId}`);

  const [credit] = await db
    .select()
    .from(partnerLedgerEntries)
    .where(eq(partnerLedgerEntries.idempotencyKey, creditKey(paymentId)))
    .limit(1);
  if (!credit) throw new Error(`credit missing for ${paymentId}`);

  return {
    earningId: earning.id,
    earningAmount: Number(earning.amountCents),
    creditAmount: Number(credit.amountCents),
    creditEarningId: credit.earningId,
    entryType: credit.entryType,
  };
}

async function main() {
  const ns = req('C36DA_NS');
  if (!ns.startsWith('c36da_')) throw new Error('NS must start with c36da_');

  const paymentA = req('C36DA_PAYMENT_A');
  const paymentF = req('C36DA_PAYMENT_F');
  const partnerF = req('C36DA_PARTNER_F');

  const results: Record<string, string | number | boolean> = { ns };

  // --- Before counts for A/F (expect 0) ---
  const beforeEarnA = await countEarnings(paymentA);
  const beforeCredA = await countCredits(paymentA);
  const beforeEarnF = await countEarnings(paymentF);
  const beforeCredF = await countCredits(paymentF);
  results.beforeEarnA = beforeEarnA;
  results.beforeCredA = beforeCredA;
  if (beforeEarnA !== 0 || beforeCredA !== 0) {
    throw new Error('A dirty before probe');
  }
  if (beforeEarnF !== 0 || beforeCredF !== 0) {
    throw new Error('F dirty before probe');
  }

  // --- Happy path A: create ---
  const a1 = await createEarningFromConfirmedPayment(paymentA);
  results.A1 = a1.kind;
  if (a1.kind !== 'created') {
    throw new Error(`A1 expected created, got ${JSON.stringify(a1)}`);
  }

  const pair1 = await loadPair(paymentA);
  results.earningAmount = pair1.earningAmount;
  results.creditAmount = pair1.creditAmount;
  results.amountMatch = pair1.earningAmount === pair1.creditAmount;
  results.creditLinked = pair1.creditEarningId === pair1.earningId;
  results.entryType = pair1.entryType;
  // 1000.00 BRL * 1500 bps = 15000 cents
  if (pair1.earningAmount !== 15_000) {
    throw new Error(`expected amount 15000, got ${pair1.earningAmount}`);
  }
  if (!results.amountMatch) throw new Error('amount mismatch earning vs credit');
  if (!results.creditLinked) throw new Error('credit.earning_id != earning.id');
  if (pair1.entryType !== 'credit') throw new Error('entry_type != credit');

  // --- Retry A: idempotent, no second earning/credit ---
  const a2 = await createEarningFromConfirmedPayment(paymentA);
  results.A2 = a2.kind;
  if (a2.kind !== 'idempotent') {
    throw new Error(`A2 expected idempotent, got ${JSON.stringify(a2)}`);
  }
  const earnCount = await countEarnings(paymentA);
  const credCount = await countCredits(paymentA);
  results.earnCountAfterRetry = earnCount;
  results.credCountAfterRetry = credCount;
  if (earnCount !== 1 || credCount !== 1) {
    throw new Error(`after retry expected 1/1 earning/credit, got ${earnCount}/${credCount}`);
  }

  // --- Atomic fail F: poison credit key outside TX, then create must roll back earning ---
  await db.insert(partnerLedgerEntries).values({
    partnerId: partnerF,
    entryType: 'credit',
    amountCents: 1,
    currency: 'BRL',
    earningId: null,
    idempotencyKey: creditKey(paymentF),
  });
  results.poisonCredit = true;

  let atomicThrew = false;
  try {
    await createEarningFromConfirmedPayment(paymentF);
  } catch {
    atomicThrew = true;
  }
  results.atomicThrew = atomicThrew;
  if (!atomicThrew) {
    throw new Error('F expected throw when ledger unique collides inside TX');
  }

  const earnF = await countEarnings(paymentF);
  const credF = await countCredits(paymentF);
  results.earnFAfterFail = earnF;
  results.credFAfterFail = credF;
  // Poison credit remains (outside TX); earning must be 0 (rolled back)
  if (earnF !== 0) {
    throw new Error(`atomic fail left orphan earning count=${earnF}`);
  }
  if (credF !== 1) {
    throw new Error(`expected only poison credit for F, got ${credF}`);
  }

  // Orphan check for A: credit must point to existing earning
  const pairFinal = await loadPair(paymentA);
  if (
    !pairFinal.creditEarningId ||
    pairFinal.creditEarningId !== pairFinal.earningId
  ) {
    throw new Error('orphan or mismatched credit for A');
  }
  results.orphanCreditsA = 0;

  console.log('C36DA_PROBE_OK', JSON.stringify(results));
}

main().catch((err) => {
  console.error('C36DA_PROBE_FAIL', err instanceof Error ? err.message : err);
  process.exit(1);
});
