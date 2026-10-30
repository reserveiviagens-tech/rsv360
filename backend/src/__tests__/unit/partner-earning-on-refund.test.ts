/**
 * C36-DB — payment refund → earning reversal orchestrator (memory deps).
 */

import { applyEarningReversalOnPaymentRefund } from '../../../../server/modules/partners/services/partner-earning-on-refund.service';
import type { ReverseEarningResult } from '../../../../server/modules/partners/services/partner-earning-reversal.service';

describe('applyEarningReversalOnPaymentRefund (C36-DB)', () => {
  const paymentId = '66666666-6666-6666-6666-666666666666';

  it('marks refunded and reverses earning', async () => {
    let reverseCalls = 0;
    const result = await applyEarningReversalOnPaymentRefund(paymentId, {
      async markPaymentRefunded() {
        return { status: 'refunded', transitioned: true };
      },
      async reverse() {
        reverseCalls += 1;
        return {
          kind: 'reversed',
          earningId: 'earn-1',
          debitId: 'debit-1',
        } satisfies ReverseEarningResult;
      },
    });
    expect(result.paymentTransitioned).toBe(true);
    expect(result.paymentStatus).toBe('refunded');
    expect(result.reversal.kind).toBe('reversed');
    expect(reverseCalls).toBe(1);
  });

  it('skips reverse when payment not refundable', async () => {
    const result = await applyEarningReversalOnPaymentRefund(paymentId, {
      async markPaymentRefunded() {
        return { status: 'pending', transitioned: false };
      },
      async reverse() {
        throw new Error('should not reverse');
      },
    });
    expect(result.reversal).toEqual({
      kind: 'skipped',
      reason: 'PAYMENT_NOT_REFUNDABLE_FOR_EARNING',
    });
  });

  it('retry path returns idempotent reversal', async () => {
    const result = await applyEarningReversalOnPaymentRefund(paymentId, {
      async markPaymentRefunded() {
        return { status: 'refunded', transitioned: false };
      },
      async reverse() {
        return {
          kind: 'idempotent',
          earningId: 'earn-1',
          debitId: 'debit-1',
        };
      },
    });
    expect(result.reversal.kind).toBe('idempotent');
  });
});
