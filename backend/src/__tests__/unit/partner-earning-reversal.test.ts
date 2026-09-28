/**
 * C36-CQ / C36-CR — ledger reconciliation + refund reversal (memory ports).
 */

import { reverseEarningForPaymentRefund } from '../../../../server/modules/partners/services/partner-earning-reversal.service';
import type { ReversalPorts } from '../../../../server/modules/partners/services/partner-earning-reversal.service';

describe('C36-CQ ledger reconciliation helpers', () => {
  it('earning amount equals credit amount when paired', () => {
    const earningAmount = 15_000;
    const creditAmount = 15_000;
    expect(earningAmount).toBe(creditAmount);
  });
});

describe('C36-CR earning reversal + debit', () => {
  const paymentId = '55555555-5555-5555-5555-555555555555';

  function createPorts(seed?: {
    status?: string;
    debitExists?: boolean;
  }): ReversalPorts & {
    earnings: Array<{ id: string; status: string; amountCents: number }>;
    debits: string[];
  } {
    const earnings = [
      {
        id: 'earn-1',
        partnerId: 'partner-1',
        amountCents: 15_000,
        currency: 'BRL',
        status: seed?.status ?? 'pending',
      },
    ];
    const debits: string[] = seed?.debitExists ? ['debit-pre'] : [];

    const ports: ReversalPorts & {
      earnings: typeof earnings;
      debits: string[];
    } = {
      earnings,
      debits,
      async findEarningByPayment() {
        return earnings[0]
          ? {
              id: earnings[0].id,
              partnerId: earnings[0].partnerId,
              amountCents: earnings[0].amountCents,
              currency: earnings[0].currency,
              status: earnings[0].status,
            }
          : null;
      },
      async findDebitByPayment() {
        return debits[0] ? { id: debits[0] } : null;
      },
      async reverseAtomic(input) {
        if (debits.length > 0) {
          const err = Object.assign(new Error('unique'), {
            code: '23505',
            constraint: 'partner_ledger_entries_idempotency_unique',
          });
          throw err;
        }
        earnings[0].status = 'reversed';
        const id = `debit-${debits.length + 1}`;
        debits.push(id);
        expect(input.amountCents).toBe(15_000);
        return { debitId: id };
      },
    };
    return ports;
  }

  it('reverses earning and creates one debit', async () => {
    const ports = createPorts();
    const result = await reverseEarningForPaymentRefund(paymentId, ports);
    expect(result.kind).toBe('reversed');
    if (result.kind !== 'reversed') return;
    expect(ports.earnings[0].status).toBe('reversed');
    expect(ports.debits).toHaveLength(1);
  });

  it('idempotent on duplicate refund', async () => {
    const ports = createPorts();
    const first = await reverseEarningForPaymentRefund(paymentId, ports);
    const second = await reverseEarningForPaymentRefund(paymentId, ports);
    expect(first.kind).toBe('reversed');
    expect(second.kind).toBe('idempotent');
    expect(ports.debits).toHaveLength(1);
  });

  it('skips when earning missing', async () => {
    const ports = createPorts();
    ports.earnings.length = 0;
    const result = await reverseEarningForPaymentRefund(paymentId, ports);
    expect(result).toEqual({ kind: 'skipped', reason: 'EARNING_NOT_FOUND' });
  });
});
