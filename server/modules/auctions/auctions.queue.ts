import { Queue } from 'bullmq';
import { createBullMQConnection } from '../fornecedores-hub/redis-connection';

export const AUCTIONS_QUEUE_NAME = 'auctions-settlement';
export const JOB_SCAN_DUE = 'auction-scan-due';
export const JOB_FINALIZE = 'auction-finalize';
export const JOB_EXPIRE_PAYMENT = 'auction-payment-expire';
export const JOB_SETTLE_PAYMENT = 'auction-payment-settle';
export const JOB_SCAN_EXPIRED_PAYMENTS = 'auction-scan-expired-payments';

export type FinalizeJobData = { auctionId: number };
export type ExpireJobData = { auctionId: number };
export type SettleJobData = { auctionId: number; outcome: 'paid' | 'cancelled' | 'expired' };
export type ScanJobData = { limit?: number };
export type AuctionsJobData = FinalizeJobData | ExpireJobData | SettleJobData | ScanJobData;

let queue: Queue<AuctionsJobData> | null = null;

export async function getAuctionsQueue(): Promise<Queue<AuctionsJobData>> {
  if (queue) return queue;
  const connection = await createBullMQConnection();
  queue = new Queue<AuctionsJobData>(AUCTIONS_QUEUE_NAME, { connection });
  return queue;
}

export async function enfileirarFinalizeAuction(auctionId: number): Promise<string> {
  const q = await getAuctionsQueue();
  const jobId = `finalize-auction-${auctionId}`;
  await q.add(JOB_FINALIZE, { auctionId }, {
    jobId,
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
  return jobId;
}

export async function enfileirarExpirePayment(auctionId: number, delayMs: number): Promise<string> {
  const q = await getAuctionsQueue();
  const jobId = `expire-auction-${auctionId}`;
  await q.add(
    JOB_EXPIRE_PAYMENT,
    { auctionId },
    {
      jobId,
      delay: Math.max(0, delayMs),
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  );
  return jobId;
}

export async function enfileirarSettlePayment(
  auctionId: number,
  outcome: 'paid' | 'cancelled' | 'expired',
): Promise<string> {
  const q = await getAuctionsQueue();
  const jobId = `settle-auction-${auctionId}-${outcome}`;
  await q.add(
    JOB_SETTLE_PAYMENT,
    { auctionId, outcome },
    {
      jobId,
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  );
  return jobId;
}

export async function garantirRepeatableScans(): Promise<void> {
  const q = await getAuctionsQueue();
  await q.add(
    JOB_SCAN_DUE,
    { limit: 50 },
    {
      repeat: { every: 60_000 },
      jobId: 'repeat-auction-scan-due',
      removeOnComplete: 20,
      removeOnFail: 20,
    },
  );
  await q.add(
    JOB_SCAN_EXPIRED_PAYMENTS,
    { limit: 50 },
    {
      repeat: { every: 60_000 },
      jobId: 'repeat-auction-scan-expired',
      removeOnComplete: 20,
      removeOnFail: 20,
    },
  );
}
