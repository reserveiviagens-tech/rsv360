/**
 * Unit tests for auction settlement helpers (no DB).
 */
describe('auction-settlement helpers', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { listStayNights, paymentDueHours } = require('../../../../server/modules/auctions/auction-settlement.service');

  it('listStayNights returns exclusive checkout nights', () => {
    expect(listStayNights('2026-09-01', '2026-09-03')).toEqual(['2026-09-01', '2026-09-02']);
  });

  it('listStayNights returns empty for invalid range', () => {
    expect(listStayNights('2026-09-03', '2026-09-01')).toEqual([]);
    expect(listStayNights('', '')).toEqual([]);
  });

  it('paymentDueHours defaults to 24', () => {
    const prev = process.env.AUCTION_PAYMENT_DUE_HOURS;
    delete process.env.AUCTION_PAYMENT_DUE_HOURS;
    expect(paymentDueHours()).toBe(24);
    process.env.AUCTION_PAYMENT_DUE_HOURS = '12';
    expect(paymentDueHours()).toBe(12);
    if (prev === undefined) delete process.env.AUCTION_PAYMENT_DUE_HOURS;
    else process.env.AUCTION_PAYMENT_DUE_HOURS = prev;
  });
});
