/**
 * C36-BY — BookingInventoryResolver unit tests (injectable lookup; no DB).
 */

import {
  resolveBookingInventory,
  resolveBookingInventoryFromRow,
  toBookingInventoryInput,
} from '../../../../server/modules/bookings/services/booking-inventory.resolver';
import type {
  BookingInventoryLookup,
  PartnerCandidate,
} from '../../../../server/modules/bookings/services/booking-inventory.types';
import { resolveAcomodacaoIdFromBookingRow } from '../../../../server/modules/guest-portal/services/booking-acomodacao.util';

function createMemoryLookup(seed: {
  websiteContent?: Array<{ id: number; contentId: string; pageType?: string | null }>;
  acomodacoes?: Array<{ id: number; hotelId: string }>;
  empreendimentos?: Array<{
    id: number;
    hotelId: string;
    websiteContentId?: string | null;
  }>;
  peas?: PartnerCandidate[];
}): BookingInventoryLookup {
  const wc = seed.websiteContent ?? [];
  const acos = seed.acomodacoes ?? [];
  const emps = seed.empreendimentos ?? [];
  const peas = seed.peas ?? [];

  return {
    async findWebsiteContentById(id) {
      const row = wc.find((r) => r.id === id);
      return row
        ? { id: row.id, contentId: row.contentId, pageType: row.pageType ?? 'hotels' }
        : null;
    },
    async findAcomodacaoById(id) {
      const row = acos.find((r) => r.id === id);
      return row ? { id: row.id, hotelId: row.hotelId } : null;
    },
    async findEmpreendimentoByWebsiteContentId(contentId) {
      const row = emps.find((e) => e.websiteContentId === contentId);
      return row ? { id: row.id, hotelId: row.hotelId } : null;
    },
    async findEmpreendimentoByHotelId(hotelId) {
      const row = emps.find((e) => e.hotelId === hotelId);
      return row ? { id: row.id, hotelId: row.hotelId } : null;
    },
    async listPeasByEmpreendimentoId(empreendimentoId) {
      return peas.filter((p) => p.empreendimentoId === empreendimentoId);
    },
  };
}

const EMP = { id: 10, hotelId: 'hotel-alpha', websiteContentId: 'cms-alpha' };
const ACO = { id: 42, hotelId: 'hotel-alpha' };
const ACO_OTHER = { id: 99, hotelId: 'hotel-other' };
const WC = { id: 7, contentId: 'cms-alpha', pageType: 'hotels' };

describe('BookingInventoryResolver (C36-BY)', () => {
  describe('hotel (website_content)', () => {
    it('resolves type=hotel via website_content — never treats item_id as acomodacao', async () => {
      const lookup = createMemoryLookup({
        websiteContent: [WC],
        // Coincidental acomodacao with same numeric id as CMS — must be ignored
        acomodacoes: [{ id: 7, hotelId: 'hotel-spoof' }],
        empreendimentos: [EMP],
      });

      const result = await resolveBookingInventory(
        { bookingType: 'hotel', itemId: 7 },
        lookup,
        { derivePartners: true },
      );

      expect(result.status).toBe('resolved');
      if (result.status !== 'resolved') return;
      expect(result.inventoryKind).toBe('website_hotel');
      if (result.inventoryKind !== 'website_hotel') return;
      expect(result.websiteContentId).toBe(7);
      expect(result.contentId).toBe('cms-alpha');
      expect(result.hotelId).toBe('hotel-alpha');
      expect(result.empreendimentoId).toBe(10);
      expect(result.acomodacaoId).toBeNull();
    });

    it('returns ITEM_NOT_FOUND when website_content missing', async () => {
      const lookup = createMemoryLookup({ acomodacoes: [ACO] });
      const result = await resolveBookingInventory(
        { bookingType: 'hotel', itemId: 7 },
        lookup,
      );
      expect(result).toMatchObject({
        status: 'unresolved',
        reasonCode: 'ITEM_NOT_FOUND',
      });
    });

    it('accepts optional metadata.acomodacaoId when hotel_id matches emp', async () => {
      const lookup = createMemoryLookup({
        websiteContent: [WC],
        acomodacoes: [ACO],
        empreendimentos: [EMP],
      });
      const result = await resolveBookingInventory(
        { bookingType: 'hotel', itemId: 7, metadata: { acomodacaoId: 42 } },
        lookup,
      );
      expect(result.status).toBe('resolved');
      if (result.status === 'resolved' && result.inventoryKind === 'website_hotel') {
        expect(result.acomodacaoId).toBe(42);
      }
    });

    it('fails CROSS_CHECK when metadata acomodacao hotel_id incompatible', async () => {
      const lookup = createMemoryLookup({
        websiteContent: [WC],
        acomodacoes: [ACO_OTHER],
        empreendimentos: [EMP],
      });
      const result = await resolveBookingInventory(
        { bookingType: 'hotel', itemId: 7, metadata: { acomodacaoId: 99 } },
        lookup,
      );
      expect(result).toMatchObject({
        status: 'unresolved',
        reasonCode: 'CROSS_CHECK_FAILED',
      });
    });
  });

  describe('auction / unit types', () => {
    it('resolves auction via acomodacoes.id → hotel_id', async () => {
      const lookup = createMemoryLookup({
        acomodacoes: [ACO],
        empreendimentos: [EMP],
      });
      const result = await resolveBookingInventory(
        { bookingType: 'auction', itemId: 42, metadata: { source: 'auction' } },
        lookup,
      );
      expect(result.status).toBe('resolved');
      if (result.status !== 'resolved') return;
      expect(result.inventoryKind).toBe('accommodation_unit');
      if (result.inventoryKind !== 'accommodation_unit') return;
      expect(result.acomodacaoId).toBe(42);
      expect(result.hotelId).toBe('hotel-alpha');
      expect(result.empreendimentoId).toBe(10);
    });

    it.each(['accommodation', 'acomodacao', 'acomodacao_rsv', 'stay'] as const)(
      'resolves unit type %s',
      async (bookingType) => {
        const lookup = createMemoryLookup({
          acomodacoes: [ACO],
          empreendimentos: [EMP],
        });
        const result = await resolveBookingInventory({ bookingType, itemId: 42 }, lookup);
        expect(result.status).toBe('resolved');
        if (result.status === 'resolved') {
          expect(result.inventoryKind).toBe('accommodation_unit');
        }
      },
    );

    it('returns ITEM_NOT_FOUND when acomodacao missing (does not pivot to website_content)', async () => {
      const lookup = createMemoryLookup({
        websiteContent: [{ id: 42, contentId: 'x', pageType: 'hotels' }],
      });
      const result = await resolveBookingInventory(
        { bookingType: 'auction', itemId: 42 },
        lookup,
      );
      expect(result).toMatchObject({
        status: 'unresolved',
        reasonCode: 'ITEM_NOT_FOUND',
      });
    });

    it('returns HOTEL_ID_MISSING when acomodacao.hotel_id empty', async () => {
      const lookup = createMemoryLookup({
        acomodacoes: [{ id: 42, hotelId: '   ' }],
      });
      const result = await resolveBookingInventory(
        { bookingType: 'accommodation', itemId: 42 },
        lookup,
      );
      expect(result).toMatchObject({
        status: 'unresolved',
        reasonCode: 'HOTEL_ID_MISSING',
      });
    });

    it('resolves unit without empreendimento (empreendimentoId null, partners empty)', async () => {
      const lookup = createMemoryLookup({
        acomodacoes: [ACO],
      });
      const result = await resolveBookingInventory(
        { bookingType: 'stay', itemId: 42 },
        lookup,
        { derivePartners: true },
      );
      expect(result.status).toBe('resolved');
      if (result.status === 'resolved' && result.inventoryKind === 'accommodation_unit') {
        expect(result.empreendimentoId).toBeNull();
        expect(result.partners).toEqual([]);
      }
    });
  });

  describe('booking_type unknown / unsupported', () => {
    it('UNKNOWN_BOOKING_TYPE when empty', async () => {
      const lookup = createMemoryLookup({ acomodacoes: [ACO] });
      const result = await resolveBookingInventory({ bookingType: '', itemId: 42 }, lookup);
      expect(result).toMatchObject({
        status: 'unresolved',
        reasonCode: 'UNKNOWN_BOOKING_TYPE',
      });
    });

    it('UNSUPPORTED_BOOKING_TYPE for flight/package — no acomodacao inference', async () => {
      const lookup = createMemoryLookup({ acomodacoes: [ACO] });
      for (const bookingType of ['flight', 'package', 'car']) {
        const result = await resolveBookingInventory({ bookingType, itemId: 42 }, lookup);
        expect(result).toMatchObject({
          status: 'unresolved',
          reasonCode: 'UNSUPPORTED_BOOKING_TYPE',
        });
      }
    });
  });

  describe('PEA / Partner derivation', () => {
    const peaActive: PartnerCandidate = {
      partnerId: 'p-active',
      associationId: 'a1',
      associationRole: 'commercial_owner',
      empreendimentoId: 10,
      status: 'active',
    };
    const peaSuspended: PartnerCandidate = {
      partnerId: 'p-susp',
      associationId: 'a2',
      associationRole: 'agency',
      empreendimentoId: 10,
      status: 'suspended',
    };
    const peaEnded: PartnerCandidate = {
      partnerId: 'p-ended',
      associationId: 'a3',
      associationRole: 'channel',
      empreendimentoId: 10,
      status: 'ended',
    };
    const peaOtherEmp: PartnerCandidate = {
      partnerId: 'p-other',
      associationId: 'a4',
      associationRole: 'viewer',
      empreendimentoId: 99,
      status: 'active',
    };

    it('PEA inexistente → partners=[] still resolved', async () => {
      const lookup = createMemoryLookup({
        acomodacoes: [ACO],
        empreendimentos: [EMP],
        peas: [],
      });
      const result = await resolveBookingInventory(
        { bookingType: 'auction', itemId: 42 },
        lookup,
        { derivePartners: true },
      );
      expect(result.status).toBe('resolved');
      if (result.status === 'resolved') {
        expect(result.partners).toEqual([]);
      }
    });

    it('excludes suspended PEA', async () => {
      const lookup = createMemoryLookup({
        acomodacoes: [ACO],
        empreendimentos: [EMP],
        peas: [peaSuspended],
      });
      const result = await resolveBookingInventory(
        { bookingType: 'auction', itemId: 42 },
        lookup,
        { derivePartners: true },
      );
      expect(result.status).toBe('resolved');
      if (result.status === 'resolved') {
        expect(result.partners).toEqual([]);
      }
    });

    it('excludes ended PEA', async () => {
      const lookup = createMemoryLookup({
        acomodacoes: [ACO],
        empreendimentos: [EMP],
        peas: [peaEnded],
      });
      const result = await resolveBookingInventory(
        { bookingType: 'auction', itemId: 42 },
        lookup,
        { derivePartners: true },
      );
      expect(result.status).toBe('resolved');
      if (result.status === 'resolved') {
        expect(result.partners).toEqual([]);
      }
    });

    it('returns multiple active PEA candidates (no primary pick)', async () => {
      const pea2: PartnerCandidate = {
        partnerId: 'p-active-2',
        associationId: 'a5',
        associationRole: 'agency',
        empreendimentoId: 10,
        status: 'active',
      };
      const lookup = createMemoryLookup({
        acomodacoes: [ACO],
        empreendimentos: [EMP],
        peas: [peaActive, peaSuspended, peaEnded, pea2, peaOtherEmp],
      });
      const result = await resolveBookingInventory(
        { bookingType: 'accommodation', itemId: 42 },
        lookup,
        { derivePartners: true },
      );
      expect(result.status).toBe('resolved');
      if (result.status === 'resolved') {
        expect(result.partners.map((p) => p.partnerId).sort()).toEqual([
          'p-active',
          'p-active-2',
        ]);
      }
    });

    it('does not derive partners when derivePartners=false', async () => {
      const lookup = createMemoryLookup({
        acomodacoes: [ACO],
        empreendimentos: [EMP],
        peas: [peaActive],
      });
      const result = await resolveBookingInventory(
        { bookingType: 'auction', itemId: 42 },
        lookup,
      );
      expect(result.status).toBe('resolved');
      if (result.status === 'resolved') {
        expect(result.partners).toEqual([]);
      }
    });
  });

  describe('metadata inconsistency / ambiguity', () => {
    it('METADATA_INCONSISTENT when unit meta.acomodacaoId !== item_id', async () => {
      const lookup = createMemoryLookup({
        acomodacoes: [ACO, ACO_OTHER],
        empreendimentos: [EMP],
      });
      const result = await resolveBookingInventory(
        {
          bookingType: 'accommodation',
          itemId: 42,
          metadata: { acomodacaoId: 99 },
        },
        lookup,
      );
      expect(result).toMatchObject({
        status: 'unresolved',
        reasonCode: 'METADATA_INCONSISTENT',
      });
    });

    it('METADATA_INCONSISTENT when hotel + source=auction', async () => {
      const lookup = createMemoryLookup({ websiteContent: [WC], empreendimentos: [EMP] });
      const result = await resolveBookingInventory(
        { bookingType: 'hotel', itemId: 7, metadata: { source: 'auction' } },
        lookup,
      );
      expect(result).toMatchObject({
        status: 'unresolved',
        reasonCode: 'METADATA_INCONSISTENT',
      });
    });

    it('ambiguous coincidence: same id in WC and acomodacoes under type=hotel stays website_hotel', async () => {
      const lookup = createMemoryLookup({
        websiteContent: [WC],
        acomodacoes: [{ id: 7, hotelId: 'hotel-alpha' }],
        empreendimentos: [EMP],
      });
      const result = await resolveBookingInventory(
        { bookingType: 'hotel', itemId: 7 },
        lookup,
      );
      expect(result.status).toBe('resolved');
      if (result.status === 'resolved') {
        expect(result.inventoryKind).toBe('website_hotel');
      }
    });

    it('does not invent accommodation from metadata alone when type unknown', async () => {
      const lookup = createMemoryLookup({ acomodacoes: [ACO], empreendimentos: [EMP] });
      const result = await resolveBookingInventory(
        { bookingType: 'mystery', itemId: 1, metadata: { acomodacaoId: 42 } },
        lookup,
        { derivePartners: true },
      );
      expect(result).toMatchObject({
        status: 'unresolved',
        reasonCode: 'UNSUPPORTED_BOOKING_TYPE',
      });
    });
  });

  describe('row normalization', () => {
    it('toBookingInventoryInput accepts snake_case', () => {
      expect(
        toBookingInventoryInput({
          booking_type: 'Hotel',
          item_id: 7,
          metadata: { a: 1 },
        }),
      ).toEqual({ bookingType: 'Hotel', itemId: 7, metadata: { a: 1 } });
    });

    it('resolveBookingInventoryFromRow works with snake_case auction', async () => {
      const lookup = createMemoryLookup({
        acomodacoes: [ACO],
        empreendimentos: [EMP],
      });
      const result = await resolveBookingInventoryFromRow(
        { booking_type: 'auction', item_id: 42 },
        lookup,
      );
      expect(result.status).toBe('resolved');
    });
  });

  describe('regression — legacy util remains unchanged and is NOT the Partner path', () => {
    it('legacy util still maps hotel item_id → acomodacao (unsafe); resolver does not', async () => {
      const booking = { booking_type: 'hotel', item_id: 7 };
      // Legacy (guest-portal) — documented incompatible semantics
      expect(resolveAcomodacaoIdFromBookingRow(booking)).toBe(7);

      const lookup = createMemoryLookup({
        websiteContent: [WC],
        acomodacoes: [{ id: 7, hotelId: 'spoof' }],
        empreendimentos: [EMP],
      });
      const resolved = await resolveBookingInventoryFromRow(booking, lookup);
      expect(resolved.status).toBe('resolved');
      if (resolved.status === 'resolved') {
        expect(resolved.inventoryKind).toBe('website_hotel');
        if (resolved.inventoryKind === 'website_hotel') {
          expect(resolved.acomodacaoId).toBeNull();
        }
      }
    });

    it('does not import guest-portal acomodação helper into resolver module', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const resolverPath = path.join(
        __dirname,
        '../../../../server/modules/bookings/services/booking-inventory.resolver.ts',
      );
      const src = fs.readFileSync(resolverPath, 'utf8');
      expect(src).not.toMatch(/from ['"].*guest-portal.*['"]/);
      expect(src).not.toMatch(/require\(['"].*guest-portal.*['"]\)/);
      expect(src).not.toMatch(/resolveAcomodacaoIdFromBooking/);
    });
  });
});
