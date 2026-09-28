/**
 * C36-CO — snapshot immutability + concurrent idempotency (memory ports).
 */

import { PartnerEarningWriterService } from '../../../../server/modules/partners/services/partner-earning-writer.service';
import type {
  BookingPaymentEarningInput,
  PartnerEarningRow,
  PartnerEarningWriterPorts,
} from '../../../../server/modules/partners/services/partner-earning-writer.types';
import { BOOKING_PAYMENT_SOURCE } from '../../../../server/modules/partners/services/partner-earning-writer.types';

function baseInput(overrides: Partial<BookingPaymentEarningInput> = {}): BookingPaymentEarningInput {
  return {
    paymentId: '33333333-3333-3333-3333-333333333333',
    paymentStatus: 'approved',
    bookingId: 99,
    baseCents: 200_000,
    currency: 'BRL',
    tPay: new Date('2026-06-15T12:00:00.000Z'),
    bookingType: 'accommodation',
    itemId: 1,
    bookingMetadata: {},
    ...overrides,
  };
}

describe('C36-CO snapshot + idempotency', () => {
  it('historical earning keeps snapshot rate after terms rate changes', async () => {
    let rateBps = 1000;
    const store: PartnerEarningRow[] = [];
    const ports: PartnerEarningWriterPorts = {
      async findExistingBySource(st, sid) {
        return store.find((e) => e.sourceType === st && e.sourceId === sid) ?? null;
      },
      async resolveInventory() {
        return {
          status: 'resolved',
          inventoryKind: 'accommodation_unit',
          empreendimentoId: 1,
          hotelId: 'H',
          acomodacaoId: 1,
        };
      },
      async listPeasByEmpreendimentoId() {
        return [
          {
            peaId: 'pea',
            partnerId: 'partner',
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
            termsId: 'term',
            termsVersion: 1,
            rateBps,
            rateKind: 'percent_bps',
            basis: 'booking_total',
          },
        };
      },
      async insertEarning(params) {
        const row: PartnerEarningRow = {
          id: 'earn-1',
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

    const svc = new PartnerEarningWriterService(ports);
    const first = await svc.createFromBookingPayment(baseInput());
    expect(first.kind).toBe('created');
    if (first.kind !== 'created') return;
    expect(first.earning.amountCents).toBe(20_000);
    expect((first.earning.metadata as { rateBps: number }).rateBps).toBe(1000);

    rateBps = 5000; // terms changed after T_pay
    const second = await svc.createFromBookingPayment(baseInput());
    expect(second.kind).toBe('idempotent');
    if (second.kind !== 'idempotent') return;
    expect((second.earning.metadata as { rateBps: number }).rateBps).toBe(1000);
    expect(second.earning.amountCents).toBe(20_000);
    expect(store).toHaveLength(1);
  });

  it('concurrent duplicate insert resolves to single earning', async () => {
    const store: PartnerEarningRow[] = [];
    let insertCalls = 0;
    const ports: PartnerEarningWriterPorts = {
      async findExistingBySource(st, sid) {
        return store.find((e) => e.sourceType === st && e.sourceId === sid) ?? null;
      },
      async resolveInventory() {
        return {
          status: 'resolved',
          inventoryKind: 'accommodation_unit',
          empreendimentoId: 1,
          hotelId: 'H',
          acomodacaoId: 1,
        };
      },
      async listPeasByEmpreendimentoId() {
        return [
          {
            peaId: 'pea',
            partnerId: 'partner',
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
            termsId: 'term',
            termsVersion: 1,
            rateBps: 1000,
            rateKind: 'percent_bps',
            basis: 'booking_total',
          },
        };
      },
      async insertEarning(params) {
        insertCalls += 1;
        if (insertCalls === 1) {
          // simulate race: both passed findExisting; second insert hits unique
          store.push({
            id: 'earn-race',
            partnerId: params.partnerId,
            sourceType: params.sourceType,
            sourceId: params.sourceId,
            amountCents: params.amountCents,
            currency: params.currency,
            status: params.status,
            metadata: params.metadata,
          });
          return store[0];
        }
        const err = Object.assign(new Error('unique'), {
          code: '23505',
          constraint: 'partner_earnings_source_unique',
        });
        throw err;
      },
    };

    const svc = new PartnerEarningWriterService(ports);
    const r1 = await svc.createFromBookingPayment(baseInput());
    const r2 = await svc.createFromBookingPayment(baseInput());
    expect(r1.kind).toBe('created');
    expect(r2.kind).toBe('idempotent');
    expect(store.filter((e) => e.sourceType === BOOKING_PAYMENT_SOURCE)).toHaveLength(1);
  });
});
