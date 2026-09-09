/**
 * Notifications hub — catalog + dispatch metrics (no external providers).
 */
const catalog = require('../../../../server/modules/notifications/notification-events.catalog');
const dispatch = require('../../../../server/modules/notifications/notification-dispatch.service');

describe('notification-events.catalog', () => {
  it('lists known auction events', () => {
    const keys = catalog.listEvents().map((e: { key: string }) => e.key);
    expect(keys).toContain('auction.bid_placed');
    expect(keys).toContain('ops.auction.new_bid');
  });

  it('validates ops access roles', () => {
    expect(catalog.canAccessOpsFeed('admin')).toBe(true);
    expect(catalog.canAccessOpsFeed('user')).toBe(false);
  });
});

describe('notification-dispatch.service', () => {
  it('returns metrics counters', () => {
    const m = dispatch.getMetrics();
    expect(typeof m.sent_total).toBe('number');
  });
});
