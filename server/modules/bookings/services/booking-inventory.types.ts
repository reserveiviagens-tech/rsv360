/**
 * C36-BY — Booking → Inventory Resolver contract (C36-BX design).
 * RESOLVER ≠ EARNINGS ≠ LEDGER ≠ PAYOUT
 */

export type BookingInventoryResolveInput = {
  id?: number;
  bookingType: string;
  itemId: number;
  metadata?: unknown;
};

export type PartnerCandidate = {
  partnerId: string;
  associationId: string;
  associationRole: string;
  empreendimentoId: number;
  /** PEA status as loaded; resolver only returns active when derivePartners=true */
  status: 'active' | 'suspended' | 'ended' | string;
};

export type ResolutionReasonCode =
  | 'UNKNOWN_BOOKING_TYPE'
  | 'UNSUPPORTED_BOOKING_TYPE'
  | 'ITEM_NOT_FOUND'
  | 'ITEM_TYPE_MISMATCH'
  | 'METADATA_INCONSISTENT'
  | 'HOTEL_ID_MISSING'
  | 'EMPREENDIMENTO_NOT_FOUND'
  | 'CROSS_CHECK_FAILED'
  | 'PROPOSTA_BRIDGE_FAILED'
  | 'INVALID_ITEM_ID';

export type BookingInventoryResolution =
  | {
      status: 'resolved';
      inventoryKind: 'website_hotel';
      websiteContentId: number;
      contentId: string;
      hotelId: string | null;
      empreendimentoId: number | null;
      acomodacaoId: number | null;
      partners: PartnerCandidate[];
    }
  | {
      status: 'resolved';
      inventoryKind: 'accommodation_unit';
      acomodacaoId: number;
      hotelId: string;
      empreendimentoId: number | null;
      websiteContentId: null;
      partners: PartnerCandidate[];
    }
  | {
      status: 'unresolved';
      inventoryKind: 'none';
      reasonCode: ResolutionReasonCode;
      detail?: string;
    };

export type WebsiteContentRow = {
  id: number;
  contentId: string;
  /** page_type or type when present; used for optional mismatch checks */
  pageType?: string | null;
};

export type AcomodacaoRow = {
  id: number;
  hotelId: string;
};

export type EmpreendimentoRow = {
  id: number;
  hotelId: string;
};

/**
 * Data port — injectable for unit tests.
 * Implementations MUST NOT reinterpret item_id across SoTs.
 */
export type BookingInventoryLookup = {
  findWebsiteContentById(id: number): Promise<WebsiteContentRow | null>;
  findAcomodacaoById(id: number): Promise<AcomodacaoRow | null>;
  findEmpreendimentoByWebsiteContentId(contentId: string): Promise<EmpreendimentoRow | null>;
  findEmpreendimentoByHotelId(hotelId: string): Promise<EmpreendimentoRow | null>;
  /**
   * Return PEA rows for empreendimento. Caller/resolver filters to status=active
   * when derivePartners is true; tests may return suspended/ended to assert filtering.
   */
  listPeasByEmpreendimentoId(empreendimentoId: number): Promise<PartnerCandidate[]>;
};

export type ResolveBookingInventoryOptions = {
  /** When true, attach active PEA partners after inventory resolution. Default false. */
  derivePartners?: boolean;
};

/** Booking types whose item_id is acomodacoes.id */
export const ACCOMMODATION_UNIT_BOOKING_TYPES = new Set([
  'auction',
  'accommodation',
  'acomodacao',
  'acomodacao_rsv',
  'stay',
]);

/** Site-publico CMS hotel — item_id is website_content.id (NOT acomodacoes.id) */
export const WEBSITE_HOTEL_BOOKING_TYPE = 'hotel';
