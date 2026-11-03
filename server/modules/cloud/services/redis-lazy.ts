/**
 * Lazy Redis para módulos cloud — não instancia ioredis no import
 * (evita crash do processo quando Redis está offline).
 */
import type Redis from 'ioredis';

let client: Redis | null | undefined;

function redisDisabled(): boolean {
  return (
    process.env.REDIS_DISABLED === 'true' ||
    process.env.REDIS_ENABLED === 'false' ||
    !process.env.REDIS_URL
  );
}

export async function getCloudRedis(): Promise<Redis | null> {
  if (redisDisabled()) return null;
  if (client) return client;
  const IORedis = (await import('ioredis')).default;
  const c = new IORedis(process.env.REDIS_URL!, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 5_000,
    retryStrategy: () => null,
  });
  c.on('error', (err) => {
    console.warn('[cloud-redis]', err?.message || err);
  });
  try {
    await c.connect();
    client = c;
    return c;
  } catch (err) {
    try {
      c.disconnect(false);
    } catch {
      /* ignore */
    }
    console.warn(
      '[cloud-redis] indisponível:',
      err instanceof Error ? err.message : err,
    );
    client = null;
    return null;
  }
}
