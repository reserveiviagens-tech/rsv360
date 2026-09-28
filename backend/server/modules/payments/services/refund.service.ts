import { eq } from 'drizzle-orm';
const { db } = require('../../../../src/db/drizzle');
const { refunds, payments } = require('../../../../src/db/schema');
import { getPaymentProvider } from '../factory';
import { CreateRefundDTO, RefundResult } from '../interfaces';
import { reverseEarningForPaymentRefund } from '../../../../../server/modules/partners/services/partner-earning-reversal.service';

export class RefundService {
  private provider = getPaymentProvider();

  async createRefund(data: CreateRefundDTO): Promise<RefundResult> {
    const result = await this.provider.createRefund(data);

    await db.insert(refunds).values({
      paymentId: data.paymentId,
      provider: 'mercadopago' as any, // Adjust
      externalId: result.externalId,
      amount: data.amount.toString(),
      reason: data.reason,
      status: result.status as any,
      metadata: data.metadata,
    });

    // Update payment status
    await db.update(payments)
      .set({ status: 'refunded' as any })
      .where(eq(payments.id, data.paymentId));

    // C36-DB: reverse partner earning + ledger debit (idempotent). Never call payout.
    // Earning failure must not undo provider refund recording.
    try {
      await reverseEarningForPaymentRefund(data.paymentId);
    } catch (err) {
      console.error('[C36-DB] earning reversal hook failed', {
        paymentId: data.paymentId,
        message: err instanceof Error ? err.message : 'unknown',
      });
    }

    return result;
  }

  async getRefund(id: string): Promise<RefundResult | null> {
    const result = await db.select().from(refunds)
      .where(eq(refunds.id, id)).limit(1);

    if (!result.length) return null;

    return {
      id: result[0].id,
      externalId: result[0].externalId!,
      status: result[0].status,
      amount: parseFloat(result[0].amount),
      processedAt: result[0].processedAt || undefined,
      metadata: result[0].metadata as any,
    };
  }

  async listRefunds(limit = 10, offset = 0): Promise<RefundResult[]> {
    const results = await db.select().from(refunds)
      .limit(limit)
      .offset(offset)
      .orderBy(refunds.createdAt);

    return results.map((r: {
      id: string;
      externalId: string | null;
      status: string;
      amount: string;
      processedAt: Date | null;
      metadata: unknown;
    }) => ({
      id: r.id,
      externalId: r.externalId!,
      status: r.status,
      amount: parseFloat(r.amount),
      processedAt: r.processedAt || undefined,
      metadata: r.metadata as any,
    }));
  }

  async processRefund(id: string): Promise<RefundResult> {
    const refund = await this.getRefund(id);
    if (!refund) throw new Error('Refund not found');

    // Process with provider if needed
    await db.update(refunds)
      .set({ status: 'approved' as any, processedAt: new Date() })
      .where(eq(refunds.id, id));

    return refund;
  }

  async getRefundStats(): Promise<any> {
    const stats = await db.select({
      totalRefunds: db.$count(refunds.id),
      approvedRefunds: db.$count(refunds.id).where(eq(refunds.status, 'approved')),
    }).from(refunds);

    return stats[0];
  }
}