import { eq } from 'drizzle-orm';
import { db } from '../../../../backend/src/db/drizzle';
import { cloudCacheConfig } from '../db/schema';
import { getCloudRedis } from './redis-lazy';

async function requireRedis() {
  const redis = await getCloudRedis();
  if (!redis) {
    throw new Error('Redis cloud cache unavailable (REDIS_DISABLED ou conexão falhou)');
  }
  return redis;
}

export async function setCache(key: string, value: any, ttl?: number) {
  const redis = await requireRedis();
  const serializedValue = JSON.stringify(value);
  const config = await getCacheConfig();

  if (ttl) {
    await redis.setex(key, ttl, serializedValue);
  } else {
    await redis.set(key, serializedValue);
  }

  // Apply default TTL if configured
  if (!ttl && config.ttl) {
    await redis.expire(key, config.ttl);
  }
}

export async function getCache(key: string) {
  const redis = await requireRedis();
  const value = await redis.get(key);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function deleteCache(key: string) {
  const redis = await requireRedis();
  return await redis.del(key);
}

export async function clearCache(pattern?: string) {
  const redis = await requireRedis();
  if (pattern) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return keys.length;
  } else {
    await redis.flushdb();
    return 0;
  }
}

export async function getCacheStats() {
  const redis = await getCloudRedis();
  if (!redis) {
    return { connected: false, dbSize: 0, info: {}, mode: 'memory-disabled' };
  }
  const info = await redis.info();
  const dbSize = await redis.dbsize();

  return {
    connected: redis.status === 'ready',
    dbSize,
    info: parseRedisInfo(info),
  };
}

export async function setCacheConfig(config: {
  key?: string;
  pattern?: string;
  ttl?: number;
  maxSize?: number;
  strategy?: string;
  description?: string;
  isActive?: boolean;
}) {
  await db.insert(cloudCacheConfig).values({
    id: 'default',
    key: config.key || 'default',
    pattern: config.pattern || '*',
    ttl: config.ttl || 3600,
    maxSize: config.maxSize || 100,
    strategy: config.strategy || 'lru',
    description: config.description || 'Default cache configuration',
    isActive: config.isActive ?? true,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: cloudCacheConfig.id,
    set: {
      key: config.key || 'default',
      pattern: config.pattern || '*',
      ttl: config.ttl || 3600,
      maxSize: config.maxSize || 100,
      strategy: config.strategy || 'lru',
      description: config.description || 'Default cache configuration',
      isActive: config.isActive ?? true,
      updatedAt: new Date(),
    }
  });
}

export async function getCacheConfig() {
  const [config] = await db.select().from(cloudCacheConfig).where(eq(cloudCacheConfig.id, 'default'));

  return config || {
    id: 'default',
    key: 'default',
    pattern: '*',
    ttl: 3600, // 1 hour
    maxSize: 100,
    strategy: 'lru',
    description: 'Default cache configuration',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function incrementCache(key: string, amount: number = 1) {
  return await redis.incrby(key, amount);
}

export async function decrementCache(key: string, amount: number = 1) {
  return await redis.decrby(key, amount);
}

export async function existsCache(key: string) {
  return await redis.exists(key) === 1;
}

export async function expireCache(key: string, ttl: number) {
  return await redis.expire(key, ttl);
}

export async function ttlCache(key: string) {
  return await redis.ttl(key);
}

export async function keysCache(pattern: string) {
  return await redis.keys(pattern);
}

export async function hashSetCache(key: string, field: string, value: any) {
  return await redis.hset(key, field, JSON.stringify(value));
}

export async function hashGetCache(key: string, field: string) {
  const value = await redis.hget(key, field);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function hashGetAllCache(key: string) {
  const hash = await redis.hgetall(key);
  const result: Record<string, any> = {};

  for (const [field, value] of Object.entries(hash)) {
    try {
      result[field] = JSON.parse(value);
    } catch {
      result[field] = value;
    }
  }

  return result;
}

export async function listPushCache(key: string, ...values: any[]) {
  const serializedValues = values.map(v => JSON.stringify(v));
  return await redis.rpush(key, ...serializedValues);
}

export async function listPopCache(key: string) {
  const value = await redis.rpop(key);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function listRangeCache(key: string, start: number, end: number) {
  const values = await redis.lrange(key, start, end);
  return values.map(v => {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  });
}

export async function setAddCache(key: string, ...members: any[]) {
  const serializedMembers = members.map(m => JSON.stringify(m));
  return await redis.sadd(key, ...serializedMembers);
}

export async function setMembersCache(key: string) {
  const members = await redis.smembers(key);
  return members.map(m => {
    try {
      return JSON.parse(m);
    } catch {
      return m;
    }
  });
}

export async function setRemoveCache(key: string, ...members: any[]) {
  const serializedMembers = members.map(m => JSON.stringify(m));
  return await redis.srem(key, ...serializedMembers);
}

function parseRedisInfo(info: string) {
  const lines = info.split('\r\n');
  const result: Record<string, any> = {};

  for (const line of lines) {
    if (line.startsWith('#') || !line.includes(':')) continue;
    const [key, value] = line.split(':');
    result[key] = value;
  }

  return result;
}

// Initialize default cache config if not exists
export async function initializeCacheConfig() {
  const existing = await db.select().from(cloudCacheConfig).where(eq(cloudCacheConfig.id, 'default')).then(r => r[0]);

  if (!existing) {
    await db.insert(cloudCacheConfig).values({
      id: 'default',
      defaultTtl: 3600,
      maxMemory: '256mb',
      evictionPolicy: 'allkeys-lru',
      compression: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}