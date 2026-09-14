import { eq } from 'drizzle-orm';
const { db } = require('../../../../src/db/drizzle');
const { webhookEvents } = require('../../../../src/db/schema');
import { getPaymentProvider } from '../factory';
import { WebhookEvent } from '../interfaces';
import {
  MpWebhookAuthError,
  verifyMercadoPagoWebhookSignature,
} from '../lib/mp-webhook-signature';
import { resolveMpWebhookSecret } from '../config';
import {
  MpWebhookBodySchema,
  StripeWebhookEventSchema,
} from '../schemas/webhook-payload.schema';

export type ProcessMpWebhookInput = {
  body: Record<string, unknown>;
  /** Express query — prefer `data.id` for signature manifest. */
  query: Record<string, string | string[] | undefined>;
  xSignature: string | undefined;
  xRequestId: string | undefined;
  /** Injectable clock (ms) for tests. */
  nowMs?: number;
};

export type ProcessMpWebhookResult = {
  received: true;
  duplicate: boolean;
};

function firstQueryValue(
  query: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const raw = query[key];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

function resolveMpExternalEventId(body: Record<string, unknown>): string {
  if (typeof body.id === 'string' || typeof body.id === 'number') {
    return String(body.id);
  }
  const data = body.data as { id?: string | number } | undefined;
  if (data?.id != null) return String(data.id);
  throw new Error('Missing Mercado Pago event id');
}

function isUniqueViolation(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  return err?.code === '23505' || /unique/i.test(err?.message || '');
}

export class WebhookService {
  private provider = getPaymentProvider();

  async processStripeWebhook(payload: string, signature: string): Promise<void> {
    if (!this.provider.verifyWebhookSignature(payload, signature)) {
      throw new Error('Invalid signature');
    }

    const event = StripeWebhookEventSchema.parse(JSON.parse(payload));
    const inserted = await this.saveEvent('stripe', event.id, event.type, event);
    if (!inserted) return;

    await this.processEvent(event.id);
  }

  /**
   * Mercado Pago webhook: HMAC + ts window, then idempotent process via webhook_events.
   * Replay of the same external_event_id → 200 with duplicate=true and zero processEvent.
   */
  async processMPWebhook(input: ProcessMpWebhookInput): Promise<ProcessMpWebhookResult> {
    const dataIdFromQuery =
      firstQueryValue(input.query, 'data.id') ??
      firstQueryValue(input.query, 'id');

    verifyMercadoPagoWebhookSignature({
      xSignature: input.xSignature,
      xRequestId: input.xRequestId,
      dataIdFromQuery,
      secret: resolveMpWebhookSecret(),
      nowMs: input.nowMs,
    });

    const body = MpWebhookBodySchema.parse(input.body);
    const externalEventId = resolveMpExternalEventId(body as Record<string, unknown>);
    const eventType =
      (typeof body.type === 'string' && body.type) ||
      (typeof body.action === 'string' && body.action) ||
      'unknown';

    const inserted = await this.saveEvent(
      'mercadopago',
      externalEventId,
      eventType,
      body,
    );

    if (!inserted) {
      return { received: true, duplicate: true };
    }

    await this.processEvent(externalEventId);
    return { received: true, duplicate: false };
  }

  verifySignature(payload: string, signature: string): boolean {
    return this.provider.verifyWebhookSignature(payload, signature);
  }

  /**
   * @returns true if a new row was inserted; false if already present (idempotent skip).
   */
  async saveEvent(
    provider: string,
    externalEventId: string,
    eventType: string,
    payload: unknown,
  ): Promise<boolean> {
    const existing = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.externalEventId, externalEventId))
      .limit(1);

    if (existing.length) return false;

    try {
      await db.insert(webhookEvents).values({
        provider: provider as any,
        externalEventId,
        eventType,
        payload,
      });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }

  async processEvent(eventId: string): Promise<void> {
    const event = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.externalEventId, eventId))
      .limit(1);

    if (!event.length) return;

    // Process based on event type
    // Update payment/subscription status accordingly

    await db
      .update(webhookEvents)
      .set({ processed: true, processedAt: new Date() })
      .where(eq(webhookEvents.id, event[0].id));
  }

  async retryFailedEvents(): Promise<void> {
    const failedEvents = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.processed, false));

    for (const event of failedEvents) {
      try {
        await this.processEvent(event.externalEventId);
      } catch (error) {
        await db
          .update(webhookEvents)
          .set({ error: (error as Error).message, retryCount: event.retryCount + 1 })
          .where(eq(webhookEvents.id, event.id));
      }
    }
  }

  async getEventLog(limit = 10, offset = 0): Promise<WebhookEvent[]> {
    const results = await db
      .select()
      .from(webhookEvents)
      .limit(limit)
      .offset(offset)
      .orderBy(webhookEvents.createdAt);

    return results.map(
      (e: {
        provider: string;
        externalEventId: string;
        eventType: string;
        payload: unknown;
        processed: boolean;
        error: string | null;
      }) => ({
        provider: e.provider,
        externalEventId: e.externalEventId,
        eventType: e.eventType,
        payload: e.payload as any,
        processed: e.processed,
        error: e.error || undefined,
      }),
    );
  }
}

export { MpWebhookAuthError };
