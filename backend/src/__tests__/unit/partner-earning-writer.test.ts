/**
 * C36-CL — PartnerEarningWriterService unit tests (memory ports; no DB).
 */

import { PartnerEarningWriterService } from '../../../../server/modules/partners/services/partner-earning-writer.service';
import type {
  BookingPaymentEarningInput,
  PartnerEarningRow,
  PartnerEarningWriterPorts,
  PeaCommercialCandidate,
} from '../../../../server/modules/partners/services/partner-earning-writer.types';
import { BOOKING_PAYMENT_SOURCE } from '../../../../server/modules/partners/services/partner-earning-writer.types';
import {
  filterCommercialOwnersAt,
  isPeaEffectiveAt,
} from '../../../../server/modules/partners/services/partner-commercial-terms.util';

function baseInput(
  overrides: Partial<BookingPaymentEarningInput> = {},
): BookingPaymentEarningInput {
  return {
    paymentId: '11111111-1111-1111-1111-111111111111',
    paymentStatus: 'approved',
    bookingId: 42,
    baseCents: 100_000,
    currency: 'BRL',
    tPay: new Date('2026-06-15T12:00:00.000Z'),
    bookingType: 'accommodation',
    itemId: 7,
    bookingMetadata: {},
    ...overrides,
  };
}

function createMemoryPorts(seed: {
  inventory?: Awaited<ReturnType<PartnerEarningWriterPorts['resolveInventory']>>;
  peas?: PeaCommercialCandidate[];
  terms?: Awaited<ReturnType<PartnerEarningWriterPorts['findEffectiveTermsAt']>>;
  existing?: PartnerEarningRow | null;
  onInsert?: (params: unknown) => void;
}): PartnerEarningWriterPorts & { store: PartnerEarningRow[] } {
  const store: PartnerEarningRow[] = seed.existing ? [seed.existing] : [];

  const ports: PartnerEarningWriterPorts & { store: PartnerEarningRow[] } = {
    store,
    async findExistingBySource(sourceType, sourceId) {
      return (
        store.find((e) => e.sourceType === sourceType && e.sourceId === sourceId) ??
        null
      );
    },
    async resolveInventory() {
      return (
        seed.inventory ?? {
          status: 'resolved',
          inventoryKind: 'accommodation_unit',
          empreendimentoId: 10,
          hotelId: 'H1',
          acomodacaoId: 7,
        }
      );
    },
    async listPeasByEmpreendimentoId() {
      return seed.peas ?? [];
    },
    async findEffectiveTermsAt() {
      return (
        seed.terms ?? {
          kind: 'ok',
          terms: {
            termsId: 'term-1',
            termsVersion: 1,
            rateBps: 1500,
            rateKind: 'percent_bps',
            basis: 'booking_total',
          },
        }
      );
    },
    async insertEarning(params) {
      seed.onInsert?.(params);
      if (
        store.some(
          (e) =>
            e.sourceType === params.sourceType && e.sourceId === params.sourceId,
        )
      ) {
        const err = Object.assign(new Error('unique'), {
          code: '23505',
          constraint: 'partner_earnings_source_unique',
        });
        throw err;
      }
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
  return ports;
}

const oneOwner: PeaCommercialCandidate = {
  peaId: 'pea-1',
  partnerId: 'partner-1',
  associationRole: 'commercial_owner',
  status: 'active',
  effectiveFrom: null,
  effectiveTo: null,
};

describe('PartnerEarningWriterService (C36-CL)', () => {
  it('skips when payment is not confirmed', async () => {
    const ports = createMemoryPorts({ peas: [oneOwner] });
    const svc = new PartnerEarningWriterService(ports);
    const result = await svc.createFromBookingPayment(
      baseInput({ paymentStatus: 'pending' }),
    );
    expect(result).toEqual({ kind: 'skipped', reason: 'PAYMENT_NOT_CONFIRMED' });
    expect(ports.store).toHaveLength(0);
  });

  it('creates earning for single commercial_owner with effective terms', async () => {
    const ports = createMemoryPorts({ peas: [oneOwner] });
    const svc = new PartnerEarningWriterService(ports);
    const result = await svc.createFromBookingPayment(baseInput());
    expect(result.kind).toBe('created');
    if (result.kind !== 'created') return;
    expect(result.earning.sourceType).toBe(BOOKING_PAYMENT_SOURCE);
    expect(result.earning.sourceId).toBe(baseInput().paymentId);
    expect(result.earning.amountCents).toBe(15_000); // 15% of 100000
    expect(result.earning.metadata).toMatchObject({
      policyVersion: 'C36-CC/CD',
      rateBps: 1500,
      bookingId: 42,
      peaId: 'pea-1',
      termsId: 'term-1',
    });
  });

  it('skips when zero commercial_owner PEAs', async () => {
    const ports = createMemoryPorts({
      peas: [
        {
          ...oneOwner,
          associationRole: 'agency',
        },
      ],
    });
    const svc = new PartnerEarningWriterService(ports);
    const result = await svc.createFromBookingPayment(baseInput());
    expect(result).toEqual({ kind: 'skipped', reason: 'ATTR_NO_OWNER' });
  });

  it('fail-closed when two commercial_owner PEAs', async () => {
    const ports = createMemoryPorts({
      peas: [
        oneOwner,
        {
          peaId: 'pea-2',
          partnerId: 'partner-2',
          associationRole: 'commercial_owner',
          status: 'active',
          effectiveFrom: null,
          effectiveTo: null,
        },
      ],
    });
    const svc = new PartnerEarningWriterService(ports);
    const result = await svc.createFromBookingPayment(baseInput());
    expect(result.kind).toBe('fail_closed');
    if (result.kind !== 'fail_closed') return;
    expect(result.reason).toBe('ATTR_AMBIGUOUS_OWNERS');
    expect(ports.store).toHaveLength(0);
  });

  it('skips when no effective terms', async () => {
    const ports = createMemoryPorts({
      peas: [oneOwner],
      terms: { kind: 'none' },
    });
    const svc = new PartnerEarningWriterService(ports);
    const result = await svc.createFromBookingPayment(baseInput());
    expect(result).toEqual({ kind: 'skipped', reason: 'NO_EFFECTIVE_TERMS' });
  });

  it('idempotent: second call returns existing earning', async () => {
    const ports = createMemoryPorts({ peas: [oneOwner] });
    const svc = new PartnerEarningWriterService(ports);
    const first = await svc.createFromBookingPayment(baseInput());
    const second = await svc.createFromBookingPayment(baseInput());
    expect(first.kind).toBe('created');
    expect(second.kind).toBe('idempotent');
    expect(ports.store).toHaveLength(1);
  });

  it('idempotent on unique race (23505)', async () => {
    const ports = createMemoryPorts({ peas: [oneOwner] });
    // Pre-seed after findExisting returns null once — simulate race via insert throw path
    let findCalls = 0;
    const origFind = ports.findExistingBySource.bind(ports);
    ports.findExistingBySource = async (st, sid) => {
      findCalls += 1;
      if (findCalls === 1) return null;
      return origFind(st, sid);
    };
    // Insert pre-existing so insert throws unique
    ports.store.push({
      id: 'earn-pre',
      partnerId: 'partner-1',
      sourceType: BOOKING_PAYMENT_SOURCE,
      sourceId: baseInput().paymentId,
      amountCents: 15_000,
      currency: 'BRL',
      status: 'pending',
      metadata: null,
    });
    // But first find returns null (race), insert throws, second find returns row
    findCalls = 0;
    ports.findExistingBySource = async () => {
      findCalls += 1;
      if (findCalls === 1) return null;
      return ports.store[0];
    };

    const svc = new PartnerEarningWriterService(ports);
    const result = await svc.createFromBookingPayment(baseInput());
    expect(result.kind).toBe('idempotent');
  });

  it('skips unresolved inventory', async () => {
    const ports = createMemoryPorts({
      inventory: {
        status: 'unresolved',
        inventoryKind: 'none',
        reasonCode: 'ITEM_NOT_FOUND',
      },
    });
    const svc = new PartnerEarningWriterService(ports);
    const result = await svc.createFromBookingPayment(baseInput());
    expect(result).toEqual({
      kind: 'skipped',
      reason: 'INVENTORY_UNRESOLVED:ITEM_NOT_FOUND',
    });
  });

  it('excludes suspended PEA and PEA outside window', () => {
    const tPay = new Date('2026-06-15T12:00:00.000Z');
    expect(
      isPeaEffectiveAt(
        { status: 'suspended', effectiveFrom: null, effectiveTo: null },
        tPay,
      ),
    ).toBe(false);
    expect(
      isPeaEffectiveAt(
        {
          status: 'active',
          effectiveFrom: '2026-07-01T00:00:00.000Z',
          effectiveTo: null,
        },
        tPay,
      ),
    ).toBe(false);
    const owners = filterCommercialOwnersAt(
      [
        {
          peaId: 'a',
          partnerId: 'p1',
          associationRole: 'commercial_owner',
          status: 'active',
          effectiveFrom: null,
          effectiveTo: null,
        },
        {
          peaId: 'b',
          partnerId: 'p2',
          associationRole: 'commercial_owner',
          status: 'ended',
          effectiveFrom: null,
          effectiveTo: null,
        },
      ],
      tPay,
    );
    expect(owners).toHaveLength(1);
    expect(owners[0].peaId).toBe('a');
  });
});
