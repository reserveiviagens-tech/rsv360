/**
 * Aruanda B4 — tracking event_id dedup (Redis SET NX when available, memory fallback).
 * Same degradation model as createIpRateLimiter: never fail-open (duplicate may be blocked
 * in-memory; Redis preferred for multi-instance).
 */
import {
  getRedisConnection,
  isRedisRequiredForLocks,
} from '../fornecedores-hub/redis-connection';

/** Meta/TikTok CAPI event_id window — 48h. */
export const TRACKING_DEDUP_TTL_MS = 48 * 60 * 60 * 1000;
const KEY_PREFIX = 'tracking:evt:';

type MemoryEntry = { expiresAt: number };

const memoryStore = new Map<string, MemoryEntry>();

let redisClaimForTests:
  | ((eventId: string, ttlMs: number) => Promise<boolean | null>)
  | null = null;

function memoryClaim(eventId: string, ttlMs: number): boolean {
  const now = Date.now();
  const existing = memoryStore.get(eventId);
  if (existing && existing.expiresAt > now) {
    return false;
  }
  memoryStore.set(eventId, { expiresAt: now + ttlMs });
  // Opportunistic prune (bounded sweep)
  if (memoryStore.size > 5000) {
    for (const [k, v] of memoryStore) {
      if (v.expiresAt <= now) memoryStore.delete(k);
    }
  }
  return true;
}

async function redisClaim(eventId: string, ttlMs: number): Promise<boolean | null> {
  if (redisClaimForTests) {
    return redisClaimForTests(eventId, ttlMs);
  }
  if (!isRedisRequiredForLocks()) {
    return null;
  }
  try {
    const redis = await getRedisConnection();
    const key = `${KEY_PREFIX}${eventId}`;
    const result = await redis.set(key, '1', 'PX', ttlMs, 'NX');
    return result === 'OK';
  } catch (error) {
    console.warn(
      '[TRACKING] Redis dedup unavailable — memory fallback:',
      (error as Error).message,
    );
    return null;
  }
}

/**
 * Returns true if this is the first time we see eventId within TTL (should dispatch).
 * Returns false if already processed (deduplicated).
 */
export async function claimTrackingEventId(
  eventId: string,
  ttlMs: number = TRACKING_DEDUP_TTL_MS,
): Promise<{ claimed: boolean; store: 'redis' | 'memory' }> {
  const id = String(eventId || '').trim();
  if (!id) {
    return { claimed: true, store: 'memory' };
  }

  const fromRedis = await redisClaim(id, ttlMs);
  if (fromRedis === true) {
    return { claimed: true, store: 'redis' };
  }
  if (fromRedis === false) {
    return { claimed: false, store: 'redis' };
  }

  const claimed = memoryClaim(id, ttlMs);
  return { claimed, store: 'memory' };
}

/** Test helpers */
export function clearTrackingDedupMemoryForTests(): void {
  memoryStore.clear();
}

export function setTrackingRedisClaimForTests(
  fn: ((eventId: string, ttlMs: number) => Promise<boolean | null>) | null,
): void {
  redisClaimForTests = fn;
}
