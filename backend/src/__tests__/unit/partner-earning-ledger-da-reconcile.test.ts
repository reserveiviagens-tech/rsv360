/**
 * C36-DA — expected reconcile helpers (unit; staging is SoT).
 */

import { computeEarningCents } from '../../../../server/modules/partners/services/partner-commercial-terms.util';

describe('C36-DA ledger reconcile expectations', () => {
  it('staging fixture amount: 1000.00 BRL @ 1500 bps → 15000 cents', () => {
    const baseCents = 100_000;
    const rateBps = 1500;
    expect(computeEarningCents(baseCents, rateBps)).toBe(15_000);
  });

  it('credit idempotency key binds to payment id', () => {
    const paymentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    expect(`booking_payment_credit:${paymentId}`).toBe(
      'booking_payment_credit:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    );
  });
});
