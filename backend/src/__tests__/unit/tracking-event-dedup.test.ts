/**
 * Aruanda B4 — tracking event dedup (Redis SET NX + memory fallback).
 */
describe('tracking event-dedup (B4)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('memory fallback claims once then dedups', async () => {
    jest.doMock('../../../../server/modules/fornecedores-hub/redis-connection', () => ({
      isRedisRequiredForLocks: () => false,
      getRedisConnection: jest.fn(),
    }));

    const {
      claimTrackingEventId,
      clearTrackingDedupMemoryForTests,
    } = require('../../../../server/modules/tracking/event-dedup');

    clearTrackingDedupMemoryForTests();
    const first = await claimTrackingEventId('evt-1', 60_000);
    const second = await claimTrackingEventId('evt-1', 60_000);

    expect(first).toEqual({ claimed: true, store: 'memory' });
    expect(second).toEqual({ claimed: false, store: 'memory' });
  });

  it('uses Redis when SET NX succeeds / rejects', async () => {
    const set = jest.fn();
    jest.doMock('../../../../server/modules/fornecedores-hub/redis-connection', () => ({
      isRedisRequiredForLocks: () => true,
      getRedisConnection: async () => ({ set }),
    }));

    const {
      claimTrackingEventId,
      clearTrackingDedupMemoryForTests,
      setTrackingRedisClaimForTests,
    } = require('../../../../server/modules/tracking/event-dedup');

    clearTrackingDedupMemoryForTests();
    setTrackingRedisClaimForTests(null);

    set.mockResolvedValueOnce('OK');
    const first = await claimTrackingEventId('evt-redis-1', 60_000);
    expect(first).toEqual({ claimed: true, store: 'redis' });
    expect(set).toHaveBeenCalledWith('tracking:evt:evt-redis-1', '1', 'PX', 60_000, 'NX');

    set.mockResolvedValueOnce(null);
    const second = await claimTrackingEventId('evt-redis-1', 60_000);
    expect(second).toEqual({ claimed: false, store: 'redis' });

    setTrackingRedisClaimForTests(null);
  });

  it('falls back to memory when Redis throws', async () => {
    jest.doMock('../../../../server/modules/fornecedores-hub/redis-connection', () => ({
      isRedisRequiredForLocks: () => true,
      getRedisConnection: async () => {
        throw new Error('redis down');
      },
    }));

    const {
      claimTrackingEventId,
      clearTrackingDedupMemoryForTests,
      setTrackingRedisClaimForTests,
    } = require('../../../../server/modules/tracking/event-dedup');

    clearTrackingDedupMemoryForTests();
    setTrackingRedisClaimForTests(null);

    const first = await claimTrackingEventId('evt-fb-1', 60_000);
    const second = await claimTrackingEventId('evt-fb-1', 60_000);
    expect(first.store).toBe('memory');
    expect(first.claimed).toBe(true);
    expect(second.claimed).toBe(false);
  });
});
