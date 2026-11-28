import type Redis from 'ioredis';

let sharedClient: Redis | null | undefined;

export function isRedisRequiredForLocks(): boolean {
  if (process.env.REDIS_DISABLED === 'true') return false;
  if (process.env.REDIS_ENABLED === 'false') return false;
  return Boolean(process.env.REDIS_URL);
}

function attachSafeHandlers(client: Redis, label: string): void {
  client.on('error', (err) => {
    // Evita crash do processo por "Unhandled error event" quando Redis cai.
    console.warn(`[redis:${label}]`, err?.message || err);
  });
}

async function connectOrThrow(client: Redis, label: string): Promise<Redis> {
  attachSafeHandlers(client, label);
  try {
    await client.connect();
    return client;
  } catch (err) {
    try {
      client.disconnect(false);
    } catch {
      /* ignore */
    }
    throw err;
  }
}

/** Cliente Redis dedicado a locks/BullMQ — exige REDIS_URL (sem fallback em memória). */
export async function getRedisConnection(): Promise<Redis> {
  if (sharedClient) {
    return sharedClient;
  }
  if (!isRedisRequiredForLocks()) {
    throw new Error(
      'Redis obrigatório para locks de vaga (defina REDIS_URL e não use REDIS_DISABLED=true)',
    );
  }
  const IORedis = (await import('ioredis')).default;
  const client = new IORedis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: 5_000,
    retryStrategy: () => null, // não reconectar em loop no boot
  });
  await connectOrThrow(client, 'shared');
  sharedClient = client;
  return client;
}

/** BullMQ reutiliza a mesma URL; conexão separada evita conflito com comandos do cache hub. */
export async function createBullMQConnection(): Promise<Redis> {
  const IORedis = (await import('ioredis')).default;
  if (!isRedisRequiredForLocks()) {
    throw new Error('Redis obrigatório para fila reservas (REDIS_URL)');
  }
  const client = new IORedis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: 5_000,
    retryStrategy: () => null,
  });
  await connectOrThrow(client, 'bullmq');
  return client;
}

export async function disconnectRedisConnection(): Promise<void> {
  if (sharedClient) {
    await sharedClient.quit();
  }
  sharedClient = undefined;
}
