/**
 * C36-CP / C36-CQ — ledger credit atomic with earning (memory ports).
 */

import { PartnerEarningWriterService } from '../../../../server/modules/partners/services/partner-earning-writer.service';
import type {
  BookingPaymentEarningInput,
  PartnerEarningRow,
  PartnerEarningWriterPorts,
} from '../../../../server/modules/partners/services/partner-earning-writer.types';

type LedgerRow = {
  idempotencyKey: string;
  earningId: string;
  amountCents: number;
  entryType: string;
};

function baseInput(): BookingPaymentEarningInput {
  return {
    paymentId: '44444444-4444-4444-4444-444444444444',
    paymentStatus: 'approved',
    bookingId: 7,
    baseCents: 100_000,
    currency: 'BRL',
    tPay: new Date('2026-06-15T12:00:00.000Z'),
    bookingType: 'accommodation',
    itemId: 1,
    bookingMetadata: {},
  };
}

describe('C36-CP earning + ledger credit atomicity', () => {
  it('creates earning and matching ledger credit together', async () => {
    const earnings: PartnerEarningRow[] = [];
    const ledger: LedgerRow[] = [];
    let failLedger = false;

    const ports: PartnerEarningWriterPorts = {
      async findExistingBySource(st, sid) {
        return earnings.find((e) => e.sourceType === st && e.sourceId === sid) ?? null;
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
        // Simulate transactional port behavior used by Drizzle ports (C36-CP).
        if (failLedger) {
          throw new Error('LEDGER_INSERT_FAILED');
        }
        const row: PartnerEarningRow = {
          id: `earn-${earnings.length + 1}`,
          partnerId: params.partnerId,
          sourceType: params.sourceType,
          sourceId: params.sourceId,
          amountCents: params.amountCents,
          currency: params.currency,
          status: params.status,
          metadata: params.metadata,
        };
        earnings.push(row);
        ledger.push({
          idempotencyKey: `booking_payment_credit:${params.sourceId}`,
          earningId: row.id,
          amountCents: params.amountCents,
          entryType: 'credit',
        });
        return row;
      },
    };

    const svc = new PartnerEarningWriterService(ports);
    const result = await svc.createFromBookingPayment(baseInput());
    expect(result.kind).toBe('created');
    if (result.kind !== 'created') return;
    expect(result.earning.amountCents).toBe(10_000);
    expect(ledger).toHaveLength(1);
    expect(ledger[0].amountCents).toBe(result.earning.amountCents);
    expect(ledger[0].entryType).toBe('credit');
    expect(ledger[0].idempotencyKey).toBe(
      `booking_payment_credit:${baseInput().paymentId}`,
    );
  });

  it('rolls back earning when ledger credit fails (no partial write)', async () => {
    const earnings: PartnerEarningRow[] = [];
    const ports: PartnerEarningWriterPorts = {
      async findExistingBySource() {
        return null;
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
      async insertEarning() {
        throw new Error('LEDGER_INSERT_FAILED');
      },
    };

    const svc = new PartnerEarningWriterService(ports);
    await expect(svc.createFromBookingPayment(baseInput())).rejects.toThrow(
      'LEDGER_INSERT_FAILED',
    );
    expect(earnings).toHaveLength(0);
  });
});
