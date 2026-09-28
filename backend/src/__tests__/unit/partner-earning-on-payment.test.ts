/**
 * C36-CM — payment confirmed → earning orchestrator (memory deps; no DB).
 */

import {
  createEarningFromConfirmedPayment,
  moneyToCents,
} from '../../../../server/modules/partners/services/partner-earning-on-payment.service';
import { PartnerEarningWriterService } from '../../../../server/modules/partners/services/partner-earning-writer.service';
import type {
  PartnerEarningWriterPorts,
  PartnerEarningRow,
} from '../../../../server/modules/partners/services/partner-earning-writer.types';
import { BOOKING_PAYMENT_SOURCE } from '../../../../server/modules/partners/services/partner-earning-writer.types';

describe('moneyToCents', () => {
  it('converts decimal string', () => {
    expect(moneyToCents('1000.00')).toBe(100_000);
    expect(moneyToCents(99.9)).toBe(9990);
  });
});

describe('createEarningFromConfirmedPayment (C36-CM)', () => {
  const paymentId = '22222222-2222-2222-2222-222222222222';

  function buildWriterPorts(store: PartnerEarningRow[] = []): PartnerEarningWriterPorts {
    return {
      async findExistingBySource(st, sid) {
        return store.find((e) => e.sourceType === st && e.sourceId === sid) ?? null;
      },
      async resolveInventory() {
        return {
          status: 'resolved',
          inventoryKind: 'accommodation_unit',
          empreendimentoId: 10,
          hotelId: 'H1',
          acomodacaoId: 7,
        };
      },
      async listPeasByEmpreendimentoId() {
        return [
          {
            peaId: 'pea-1',
            partnerId: 'partner-1',
            associationRole: 'commercial_owner',
            status: 'active',
            effectiveFrom: null,
            effectiveTo: null,
          },
        ];
      },
      async findEffectiveTermsAt() {
        return {
          kind: 'ok',
          terms: {
            termsId: 'term-1',
            termsVersion: 1,
            rateBps: 1000,
            rateKind: 'percent_bps',
            basis: 'booking_total',
          },
        };
      },
      async insertEarning(params) {
        const row: PartnerEarningRow = {
          id: `earn-${store.length + 1}`,
          partnerId: params.partnerId,
          sourceType: params.sourceType,
          sourceId: params.sourceId,
          amountCents: params.amountCents,
          currency: params.currency,
          status: params.status,
          metadata: params.metadata,
        };
        store.push(row);
        return row;
      },
    };
  }

  it('skips when payment is not approved', async () => {
    const result = await createEarningFromConfirmedPayment(paymentId, {
      loadPayment: async () => ({
        id: paymentId,
        status: 'pending',
        bookingId: 1,
        amount: '100.00',
        currency: 'BRL',
        paidAt: null,
      }),
      loadBooking: async () => {
        throw new Error('should not load booking');
      },
      writer: new PartnerEarningWriterService(buildWriterPorts()),
    });
    expect(result).toEqual({ kind: 'skipped', reason: 'PAYMENT_NOT_CONFIRMED' });
  });

  it('creates earning from approved payment + booking total', async () => {
    const store: PartnerEarningRow[] = [];
    const result = await createEarningFromConfirmedPayment(paymentId, {
      loadPayment: async () => ({
        id: paymentId,
        status: 'approved',
        bookingId: 42,
        amount: '1000.00',
        currency: 'BRL',
        paidAt: new Date('2026-06-15T12:00:00.000Z'),
      }),
      loadBooking: async () => ({
        id: 42,
        bookingType: 'accommodation',
        itemId: 7,
        totalAmount: '1000.00',
        currency: 'BRL',
        metadata: {},
      }),
      writer: new PartnerEarningWriterService(buildWriterPorts(store)),
    });
    expect(result.kind).toBe('created');
    if (result.kind !== 'created') return;
    expect(result.earning.sourceType).toBe(BOOKING_PAYMENT_SOURCE);
    expect(result.earning.sourceId).toBe(paymentId);
    expect(result.earning.amountCents).toBe(10_000); // 10% of 100000
    expect(result.earning.metadata).toMatchObject({
      bookingId: 42,
      paymentId,
      rateBps: 1000,
      tPay: '2026-06-15T12:00:00.000Z',
    });
  });

  it('idempotent retry: same payment → one earning', async () => {
    const store: PartnerEarningRow[] = [];
    const deps = {
      loadPayment: async () => ({
        id: paymentId,
        status: 'approved' as const,
        bookingId: 42,
        amount: '1000.00',
        currency: 'BRL',
        paidAt: new Date('2026-06-15T12:00:00.000Z'),
      }),
      loadBooking: async () => ({
        id: 42,
        bookingType: 'accommodation',
        itemId: 7,
        totalAmount: '1000.00',
        currency: 'BRL',
        metadata: {},
      }),
      writer: new PartnerEarningWriterService(buildWriterPorts(store)),
    };
    const first = await createEarningFromConfirmedPayment(paymentId, deps);
    const second = await createEarningFromConfirmedPayment(paymentId, deps);
    expect(first.kind).toBe('created');
    expect(second.kind).toBe('idempotent');
    expect(store).toHaveLength(1);
  });

  it('skips when payment has no booking', async () => {
    const result = await createEarningFromConfirmedPayment(paymentId, {
      loadPayment: async () => ({
        id: paymentId,
        status: 'approved',
        bookingId: null,
        amount: '10.00',
        currency: 'BRL',
        paidAt: new Date(),
      }),
      loadBooking: async () => null,
      writer: new PartnerEarningWriterService(buildWriterPorts()),
    });
    expect(result).toEqual({ kind: 'skipped', reason: 'PAYMENT_WITHOUT_BOOKING' });
  });
});
