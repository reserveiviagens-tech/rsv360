import { Worker, type Job } from 'bullmq';
import { createBullMQConnection } from '../fornecedores-hub/redis-connection';
import {
  AUCTIONS_QUEUE_NAME,
  JOB_EXPIRE_PAYMENT,
  JOB_FINALIZE,
  JOB_SCAN_DUE,
  JOB_SCAN_EXPIRED_PAYMENTS,
  JOB_SETTLE_PAYMENT,
  enfileirarExpirePayment,
  enfileirarFinalizeAuction,
  garantirRepeatableScans,
  type AuctionsJobData,
} from './auctions.queue';

// CJS settlement module (raw SQL)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const settlement = require('./auction-settlement.service') as {
  finalizeAuction: (id: number) => Promise<Record<string, unknown>>;
  settleAuctionPayment: (
    id: number,
    outcome: 'paid' | 'cancelled' | 'expired',
  ) => Promise<Record<string, unknown>>;
  scanDueAuctionIds: (limit?: number) => Promise<number[]>;
  scanExpiredPaymentAuctionIds: (limit?: number) => Promise<number[]>;
  paymentDueHours: () => number;
};

let worker: Worker<AuctionsJobData> | null = null;

async function processFinalize(job: Job<AuctionsJobData>) {
  const auctionId = Number((job.data as { auctionId: number }).auctionId);
  const result = await settlement.finalizeAuction(auctionId);
  if (result?.settlement === 'pending_payment' && result.paymentDueAt) {
    const dueAt = new Date(String(result.paymentDueAt)).getTime();
    const delayMs = Math.max(0, dueAt - Date.now());
    try {
      await enfileirarExpirePayment(auctionId, delayMs);
    } catch (err) {
      console.warn('[auctions] enfileirarExpirePayment falhou:', (err as Error).message);
    }
  }
  return result;
}

async function processExpire(job: Job<AuctionsJobData>) {
  const auctionId = Number((job.data as { auctionId: number }).auctionId);
  return settlement.settleAuctionPayment(auctionId, 'expired');
}

async function processSettle(job: Job<AuctionsJobData>) {
  const data = job.data as { auctionId: number; outcome: 'paid' | 'cancelled' | 'expired' };
  return settlement.settleAuctionPayment(data.auctionId, data.outcome);
}

async function processScanDue(job: Job<AuctionsJobData>) {
  const limit = Number((job.data as { limit?: number }).limit ?? 50);
  const ids = await settlement.scanDueAuctionIds(limit);
  for (const id of ids) {
    try {
      await enfileirarFinalizeAuction(id);
    } catch (err) {
      console.warn('[auctions] enqueue finalize falhou', id, (err as Error).message);
    }
  }
  return { enqueued: ids.length, ids };
}

async function processScanExpired(job: Job<AuctionsJobData>) {
  const limit = Number((job.data as { limit?: number }).limit ?? 50);
  const ids = await settlement.scanExpiredPaymentAuctionIds(limit);
  for (const id of ids) {
    try {
      await settlement.settleAuctionPayment(id, 'expired');
    } catch (err) {
      console.warn('[auctions] expire falhou', id, (err as Error).message);
    }
  }
  return { expired: ids.length, ids };
}

export async function startAuctionsWorker(): Promise<void> {
  if (worker) return;
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    console.warn('[auctions] Worker BullMQ omitido — REDIS_URL ausente');
    return;
  }

  const connection = await createBullMQConnection();
  worker = new Worker<AuctionsJobData>(
    AUCTIONS_QUEUE_NAME,
    async (job) => {
      switch (job.name) {
        case JOB_FINALIZE:
          return processFinalize(job);
        case JOB_EXPIRE_PAYMENT:
          return processExpire(job);
        case JOB_SETTLE_PAYMENT:
          return processSettle(job);
        case JOB_SCAN_DUE:
          return processScanDue(job);
        case JOB_SCAN_EXPIRED_PAYMENTS:
          return processScanExpired(job);
        default:
          console.warn('[auctions] job desconhecido', job.name);
          return { skipped: true };
      }
    },
    {
      connection,
      concurrency: 3,
    },
  );

  worker.on('failed', (job, err) => {
    console.error('[auctions] job failed', job?.name, job?.id, err.message);
  });

  try {
    await garantirRepeatableScans();
  } catch (err) {
    console.warn('[auctions] repeatable scans não registrados:', (err as Error).message);
  }

  console.log('[auctions] Worker BullMQ (finalize/scan/expire/settle) registrado ✓');
}

export async function stopAuctionsWorker(): Promise<void> {
  if (!worker) return;
  await worker.close();
  worker = null;
}
