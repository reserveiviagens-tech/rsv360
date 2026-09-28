/**
 * C36-CN — staging earning probe (run inside backend container via tsx).
 * Env: C36CN_NS, C36CN_PAYMENT_A|C|D|E
 */

import { createEarningFromConfirmedPayment } from '../../server/modules/partners/services/partner-earning-on-payment.service';
import { createDrizzlePartnerEarningWriterPorts } from '../../server/modules/partners/services/partner-earning-writer.ports';

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

async function main() {
  const ns = req('C36CN_NS');
  if (!ns.startsWith('c36cn_')) throw new Error('NS must start with c36cn_');

  const paymentA = req('C36CN_PAYMENT_A');
  const paymentC = req('C36CN_PAYMENT_C');
  const paymentD = req('C36CN_PAYMENT_D');
  const paymentE = req('C36CN_PAYMENT_E');

  const results: Record<string, string> = {};

  const a1 = await createEarningFromConfirmedPayment(paymentA);
  results.A1 = a1.kind;
  if (a1.kind !== 'created' && a1.kind !== 'idempotent') {
    throw new Error(`A expected created, got ${JSON.stringify(a1)}`);
  }

  const a2 = await createEarningFromConfirmedPayment(paymentA);
  results.B = a2.kind;
  if (a2.kind !== 'idempotent') {
    throw new Error(`B expected idempotent, got ${JSON.stringify(a2)}`);
  }

  const c = await createEarningFromConfirmedPayment(paymentC);
  results.C = `${c.kind}:${'reason' in c ? c.reason : ''}`;
  if (c.kind !== 'skipped' || !String(c.reason).includes('ATTR_NO_OWNER')) {
    throw new Error(`C expected ATTR_NO_OWNER skip, got ${JSON.stringify(c)}`);
  }

  const d = await createEarningFromConfirmedPayment(paymentD);
  results.D = `${d.kind}:${'reason' in d ? d.reason : ''}`;
  if (d.kind !== 'fail_closed' || d.reason !== 'ATTR_AMBIGUOUS_OWNERS') {
    throw new Error(`D expected ATTR_AMBIGUOUS_OWNERS, got ${JSON.stringify(d)}`);
  }

  const e = await createEarningFromConfirmedPayment(paymentE);
  results.E = `${e.kind}:${'reason' in e ? e.reason : ''}`;
  if (e.kind !== 'skipped' || e.reason !== 'NO_EFFECTIVE_TERMS') {
    throw new Error(`E expected NO_EFFECTIVE_TERMS, got ${JSON.stringify(e)}`);
  }

  const existing = await createDrizzlePartnerEarningWriterPorts().findExistingBySource(
    'booking_payment',
    paymentA,
  );
  if (!existing?.metadata || typeof existing.metadata !== 'object') {
    throw new Error('A earning missing metadata snapshot');
  }
  results.snapshotRateBps = String(
    (existing.metadata as { rateBps?: number }).rateBps,
  );

  console.log('C36CN_PROBE_OK', JSON.stringify(results));
}

main().catch((err) => {
  console.error('C36CN_PROBE_FAIL', err instanceof Error ? err.message : err);
  process.exit(1);
});
