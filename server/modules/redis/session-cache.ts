/**
 * Cache de sessão/chave-valor com fallback em memória.
 * Use quando Redis estiver desligado (REDIS_DISABLED=true) ou indisponível.
 */

type CacheValue = string | number | boolean | object | null;

const memoryStore = new Map<string, { value: CacheValue; expiresAt?: number }>();
const memoryTimers = new Map<string, ReturnType<typeof setTimeout>>();

let redisClient: import('ioredis').default | null = null;
let useMemoryStore =
  process.env.REDIS_DISABLED === 'true' || process.env.REDIS_ENABLED === 'false';

function pruneExpired(key: string): void {
  const row = memoryStore.get(key);
  if (row?.expiresAt && Date.now() > row.expiresAt) {
    memoryStore.delete(key);
  }
}

async function ensureRedis(): Promise<import('ioredis').default | null> {
  if (useMemoryStore) return null;
  if (!process.env.REDIS_URL) {
    useMemoryStore = true;
    return null;
  }
  if (redisClient) return redisClient;
  try {
    const Redis = (await import('ioredis')).default;
    const client = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 5_000,
      retryStrategy: () => null,
    });
    client.on('error', (err) => {
      console.warn('[session-cache] Redis error — memory fallback:', err?.message || err);
      useMemoryStore = true;
    });
    await client.connect();
    redisClient = client;
    return client;
  } catch (err) {
    console.warn(
      '[session-cache] Falha na conexão Redis. Alternando para Memory Store.',
      err instanceof Error ? err.message : err,
    );
    useMemoryStore = true;
    redisClient = null;
    return null;
  }
}

export const sessionCache = {
  async get<T = CacheValue>(key: string): Promise<T | undefined> {
    const client = await ensureRedis();
    if (!client || useMemoryStore) {
      pruneExpired(key);
      return memoryStore.get(key)?.value as T | undefined;
    }
    const raw = await client.get(key);
    if (raw == null) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as T;
    }
  },

  async set(key: string, value: CacheValue, ttlSeconds?: number): Promise<void> {
    const client = await ensureRedis();
    if (!client || useMemoryStore) {
      const prev = memoryTimers.get(key);
      if (prev) clearTimeout(prev);
      const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
      memoryStore.set(key, { value, expiresAt });
      if (ttlSeconds) {
        const t = setTimeout(() => {
          memoryStore.delete(key);
          memoryTimers.delete(key);
        }, ttlSeconds * 1000);
        memoryTimers.set(key, t);
      }
      return;
    }
    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await client.set(key, payload, 'EX', ttlSeconds);
    } else {
      await client.set(key, payload);
    }
  },

  async del(key: string): Promise<void> {
    const client = await ensureRedis();
    if (!client || useMemoryStore) {
      memoryStore.delete(key);
      const prev = memoryTimers.get(key);
      if (prev) clearTimeout(prev);
      memoryTimers.delete(key);
      return;
    }
    await client.del(key);
  },

  isMemory(): boolean {
    return useMemoryStore;
  },
};
