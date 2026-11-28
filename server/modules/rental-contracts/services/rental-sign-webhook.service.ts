import { createHmac, randomUUID } from 'node:crypto';
import type { SignRequestRecord } from './rental-contract.types';
import { listSignRequestEvents, recordSignRequestEvent } from './rental-contract.service';
import { recordRentalSignWebhookMetric } from './rental-sign-webhook.metrics';

const MAX_ATTEMPTS = 3;

const RETRY_DELAYS_MS = process.env.JEST_WORKER_ID
  ? [0, 0, 0]
  : [0, 1_500, 5_000];

export type RentalSignWebhookConfig = {
  url: string;
  secret: string;
};

export function getRentalSignWebhookConfig(): RentalSignWebhookConfig | null {
  const url = process.env.RENTAL_SIGN_WEBHOOK_URL?.trim();
  const secret = process.env.RENTAL_SIGN_WEBHOOK_SECRET?.trim();
  if (!url || !secret) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return { url, secret };
  } catch {
    return null;
  }
}

export function buildRentalSignCompletedPayload(record: SignRequestRecord) {
  const deliveryId = `rsign_${record.id}_signed`;
  return {
    id: deliveryId,
    type: 'rental.sign.completed' as const,
    occurredAt: record.signedAt ?? new Date().toISOString(),
    data: {
      requestId: record.id,
      unitId: record.unitId,
      status: record.status,
      signedAt: record.signedAt,
    },
  };
}

export function signRentalSignWebhookBody(body: string, secret: string, timestampSec: number): string {
  const signedPayload = `${timestampSec}.${body}`;
  return createHmac('sha256', secret).update(signedPayload).digest('hex');
}

export function buildRentalSignWebhookHeaders(body: string, secret: string): Record<string, string> {
  const ts = Math.floor(Date.now() / 1000);
  const sig = signRentalSignWebhookBody(body, secret, ts);
  return {
    'Content-Type': 'application/json',
    'X-RSV-Webhook-Id': randomUUID(),
    'X-RSV-Timestamp': String(ts),
    'X-RSV-Signature': `v1=${sig}`,
  };
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function wasWebhookDelivered(requestId: string, unitId: string): Promise<boolean> {
  const events = await listSignRequestEvents(requestId, unitId);
  if (!events) return false;
  return events.some((e) => e.eventType === 'webhook_delivered');
}

export type DeliverWebhookResult = {
  delivered: boolean;
  skipped?: 'not_signed' | 'webhook_disabled' | 'idempotent';
};

export async function deliverRentalSignCompletedWebhook(
  record: SignRequestRecord,
  options?: { force?: boolean },
): Promise<DeliverWebhookResult> {
  if (record.status !== 'signed') {
    recordRentalSignWebhookMetric('skipped_not_signed');
    return { delivered: false, skipped: 'not_signed' };
  }

  const config = getRentalSignWebhookConfig();
  if (!config) {
    recordRentalSignWebhookMetric('skipped_webhook_disabled');
    return { delivered: false, skipped: 'webhook_disabled' };
  }

  if (!options?.force) {
    const already = await wasWebhookDelivered(record.id, record.unitId);
    if (already) {
      recordRentalSignWebhookMetric('skipped_idempotent');
      return { delivered: true, skipped: 'idempotent' };
    }
  }

  const payload = buildRentalSignCompletedPayload(record);
  const body = JSON.stringify(payload);
  const headers = buildRentalSignWebhookHeaders(body, config.secret);

  let lastStatus = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 0);

    try {
      const res = await fetch(config.url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(8_000),
      });
      lastStatus = res.status;
      if (res.ok) {
        await recordSignRequestEvent(record.id, record.unitId, 'webhook_delivered', {
          actor: 'system',
          httpStatus: res.status,
          deliveryId: payload.id,
          attempt,
        });
        recordRentalSignWebhookMetric('delivered');
        return { delivered: true };
      }
    } catch {
      lastStatus = 0;
    }

    if (attempt < MAX_ATTEMPTS) {
      await recordSignRequestEvent(record.id, record.unitId, 'webhook_failed', {
        actor: 'system',
        attempt,
        httpStatus: lastStatus || undefined,
        deliveryId: payload.id,
      });
    }
  }

  await recordSignRequestEvent(record.id, record.unitId, 'webhook_failed', {
    actor: 'system',
    attempt: MAX_ATTEMPTS,
    httpStatus: lastStatus || undefined,
    deliveryId: payload.id,
    final: true,
  });

  recordRentalSignWebhookMetric('failed');
  return { delivered: false };
}

export function enqueueRentalSignCompletedWebhook(record: SignRequestRecord): void {
  void deliverRentalSignCompletedWebhook(record).catch(() => undefined);
}