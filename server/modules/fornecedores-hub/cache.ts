import type { OfertaNormalizada } from './types';

/** TTL Redis — camada quente (picos de leitura). */
export const REDIS_TTL_SECONDS = 5 * 60;

/** TTL lógico Postgres — validado no resolver (24h). */
export const POSTGRES_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const REDIS_PREFIX = 'rsv360:cotacao:';

type MemoryEntry = { payload: string; expiresAt: number };

let redisClient: import('ioredis').default | null | undefined;
const memoryStore = new Map<string, MemoryEntry>();

function isRedisDisabled(): boolean {
  return process.env.REDIS_DISABLED === 'true' || !process.env.REDIS_URL;
}

async function getRedisClient(): Promise<import('ioredis').default | null> {
  if (redisClient !== undefined) {
    return redisClient;
  }
  if (isRedisDisabled()) {
    redisClient = null;
    return null;
  }
  try {
    const Redis = (await import('ioredis')).default;
    const client = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 5_000,
      retryStrategy: () => null,
    });
    client.on('error', (err) => {
      console.warn('[fornecedores-hub/cache]', err?.message || err);
    });
    await client.connect();
    redisClient = client;
    return client;
  } catch {
    redisClient = null;
    return null;
  }
}

/** Chave normalizada: slug sem acento — `hospedagem:caldas-novas`. */
export function chaveCache(tipo: string, destino: string): string {
  const tipoNorm = tipo.trim().toLowerCase() || 'hospedagem';
  const slug = destino
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${tipoNorm}:${slug || 'default'}`;
}

function redisKey(chave: string): string {
  return `${REDIS_PREFIX}${chave}`;
}

export async function lerRedis(chave: string): Promise<OfertaNormalizada[] | null> {
  const key = redisKey(chave);
  const client = await getRedisClient();

  if (client) {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as OfertaNormalizada[];
  }

  const entry = memoryStore.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return JSON.parse(entry.payload) as OfertaNormalizada[];
}

export async function gravarRedis(chave: string, ofertas: OfertaNormalizada[]): Promise<void> {
  const key = redisKey(chave);
  const payload = JSON.stringify(ofertas);
  const client = await getRedisClient();

  if (client) {
    await client.setex(key, REDIS_TTL_SECONDS, payload);
    return;
  }

  memoryStore.set(key, {
    payload,
    expiresAt: Date.now() + REDIS_TTL_SECONDS * 1000,
  });
}

export async function apagarRedis(chave: string): Promise<void> {
  const key = redisKey(chave);
  const client = await getRedisClient();
  if (client) {
    await client.del(key);
  }
  memoryStore.delete(key);
}

/** Limpa fallback em memória (testes). */
export function limparMemoryCacheRedis(): void {
  memoryStore.clear();
  redisClient = undefined;
}

/** Encerra cliente Redis aberto (testes — evita Jest pendurado). */
export async function disconnectRedisCache(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
  }
  redisClient = undefined;
  memoryStore.clear();
}
