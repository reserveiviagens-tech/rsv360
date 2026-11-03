import { Queue, Worker, Job } from 'bullmq';
import { eq, and, lt } from 'drizzle-orm';
import { db } from '../../../../backend/src/db/drizzle';
import { cloudJobs } from '../db/schema';
import { generateThumbnails, optimizeImage } from './image-optimization.service';
import { getCloudRedis } from './redis-lazy';

const queues: Record<string, Queue> = {};
const workers: Record<string, Worker> = {};

async function requireRedis() {
  const redis = await getCloudRedis();
  if (!redis) {
    throw new Error('Redis job queue unavailable (REDIS_DISABLED ou conexão falhou)');
  }
  return redis;
}

export async function createQueue(queueName: string, options?: { concurrency?: number; removeOnComplete?: number; removeOnFail?: number }) {
  const { concurrency = 5, removeOnComplete = 50, removeOnFail = 50 } = options || {};

  if (queues[queueName]) return queues[queueName];

  const redis = await requireRedis();

  queues[queueName] = new Queue(queueName, {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete,
      removeOnFail,
    },
  });

  // Create worker
  workers[queueName] = new Worker(queueName, async (job) => {
    await processJob(job);
  }, {
    connection: redis,
    concurrency,
  });

  return queues[queueName];
}

export async function addJob(queueName: string, jobData: any, options?: { priority?: number; delay?: number; attempts?: number; backoff?: { type: 'fixed' | 'exponential'; delay: number } }) {
  const queue = await createQueue(queueName);

  const job = await queue.add(queueName, jobData, {
    priority: options?.priority || 0,
    delay: options?.delay || 0,
    attempts: options?.attempts || 3,
    backoff: options?.backoff || { type: 'exponential', delay: 2000 },
  });

  // Save to database
  await db.insert(cloudJobs).values({
    id: job.id,
    queueName,
    payload: jobData,
    status: 'waiting',
    priority: options?.priority || 0,
    attempts: 0,
    maxAttempts: options?.attempts || 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return job;
}

export async function getJobStatus(jobId: string) {
  const jobRecord = await db.select().from(cloudJobs).where(eq(cloudJobs.id, jobId)).then(r => r[0]);
  if (!jobRecord) return null;

  const queue = queues[jobRecord.queueName];
  if (!queue) return jobRecord;

  const job = await queue.getJob(jobId);
  if (!job) return jobRecord;

  const state = await job.getState();
  const progress = job.progress;

  return {
    ...jobRecord,
    state,
    progress,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason,
  };
}

export async function cancelJob(jobId: string) {
  const jobRecord = await db.select().from(cloudJobs).where(eq(cloudJobs.id, jobId)).then(r => r[0]);
  if (!jobRecord) throw new Error('Job not found');

  const queue = queues[jobRecord.queueName];
  if (queue) {
    const job = await queue.getJob(jobId);
    if (job) await job.remove();
  }

  await db.update(cloudJobs)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(cloudJobs.id, jobId));

  return true;
}

export async function retryJob(jobId: string) {
  const jobRecord = await db.select().from(cloudJobs).where(eq(cloudJobs.id, jobId)).then(r => r[0]);
  if (!jobRecord) throw new Error('Job not found');

  const queue = queues[jobRecord.queueName];
  if (!queue) throw new Error('Queue not found');

  const job = await queue.getJob(jobId);
  if (!job) throw new Error('Job not found in queue');

  await job.retry();

  await db.update(cloudJobs)
    .set({ status: 'waiting', attempts: 0, updatedAt: new Date() })
    .where(eq(cloudJobs.id, jobId));

  return true;
}

export async function getQueueStats(queueName: string) {
  const queue = queues[queueName];
  if (!queue) return null;

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaiting(),
    queue.getActive(),
    queue.getCompleted(),
    queue.getFailed(),
    queue.getDelayed(),
  ]);

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    delayed: delayed.length,
    total: waiting.length + active.length + completed.length + failed.length + delayed.length,
  };
}

export async function cleanQueue(queueName: string, grace?: number) {
  const queue = queues[queueName];
  if (!queue) return;

  await queue.clean(grace || 24 * 60 * 60 * 1000, 100); // Clean jobs older than grace period (default 24h)
  await queue.clean(grace || 24 * 60 * 60 * 1000, 100, 'failed');
}

export async function processJob(job: Job) {
  const jobRecord = await db.select().from(cloudJobs).where(eq(cloudJobs.id, job.id)).then(r => r[0]);
  if (!jobRecord) return;

  try {
    await db.update(cloudJobs)
      .set({ status: 'active', startedAt: new Date(), updatedAt: new Date() })
      .where(eq(cloudJobs.id, job.id));

    // Process based on job type
    let result;
    switch (jobRecord.queueName) {
      case 'image-optimization':
        result = await processImageOptimization(job.data);
        break;
      case 'file-processing':
        result = await processFileProcessing(job.data);
        break;
      case 'email-queue':
        result = await processEmailJob(job.data);
        break;
      case 'notification-queue':
        result = await processNotificationJob(job.data);
        break;
      default:
        result = await processGenericJob(job.data);
    }

    await db.update(cloudJobs)
      .set({
        status: 'completed',
        result,
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(cloudJobs.id, job.id));

  } catch (error) {
    const attempts = jobRecord.attempts + 1;

    await db.update(cloudJobs)
      .set({
        status: attempts >= jobRecord.maxAttempts ? 'failed' : 'waiting',
        attempts,
        error: String(error),
        updatedAt: new Date()
      })
      .where(eq(cloudJobs.id, job.id));

    throw error;
  }
}

// Job processors
async function processImageOptimization(data: any) {
  if (data.action === 'optimize') {
    return await optimizeImage(data.fileId, data.options);
  } else if (data.action === 'thumbnails') {
    return await generateThumbnails(data.fileId);
  }

  throw new Error('Unknown image optimization action');
}

async function processFileProcessing(data: any) {
  // File processing logic
  return { processed: true, fileId: data.fileId };
}

async function processEmailJob(data: any) {
  // Email sending logic
  return { sent: true, emailId: data.emailId };
}

async function processNotificationJob(data: any) {
  // Notification sending logic
  return { sent: true, notificationId: data.notificationId };
}

async function processGenericJob(data: any) {
  // Generic job processing
  return { processed: true, data };
}

export async function getFailedJobs(queueName?: string) {
  const whereClause = queueName ? eq(cloudJobs.queueName, queueName) : undefined;

  return await db.select()
    .from(cloudJobs)
    .where(and(
      whereClause,
      eq(cloudJobs.status, 'failed')
    ))
    .orderBy(cloudJobs.createdAt);
}

export async function getActiveJobs(queueName?: string) {
  const whereClause = queueName ? eq(cloudJobs.queueName, queueName) : undefined;

  return await db.select()
    .from(cloudJobs)
    .where(and(
      whereClause,
      eq(cloudJobs.status, 'active')
    ))
    .orderBy(cloudJobs.createdAt);
}