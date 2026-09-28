/**
 * C36-BY — BookingInventoryResolver
 *
 * Semantic authority: booking_type FIRST.
 * NEVER infer Accommodation merely because item_id exists in acomodacoes.
 * Isolated from the guest-portal acomodação helper (incompatible hotel semantics).
 */

import type {
  AcomodacaoRow,
  BookingInventoryLookup,
  BookingInventoryResolution,
  BookingInventoryResolveInput,
  EmpreendimentoRow,
  PartnerCandidate,
  ResolveBookingInventoryOptions,
  ResolutionReasonCode,
} from './booking-inventory.types';
import {
  ACCOMMODATION_UNIT_BOOKING_TYPES,
  WEBSITE_HOTEL_BOOKING_TYPE,
} from './booking-inventory.types';

function unresolved(
  reasonCode: ResolutionReasonCode,
  detail?: string,
): BookingInventoryResolution {
  return {
    status: 'unresolved',
    inventoryKind: 'none',
    reasonCode,
    ...(detail ? { detail } : {}),
  };
}

function asMetadataRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function positiveInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

function readOptionalAcomodacaoId(metadata: Record<string, unknown>): number | null {
  const raw = metadata.acomodacaoId ?? metadata.selectedAcomodacaoId;
  if (raw === undefined || raw === null || raw === '') return null;
  return positiveInt(raw);
}

/**
 * Normalize a polymorphic booking row (camelCase or snake_case) into the resolver input.
 * Does not mutate the booking.
 */
export function toBookingInventoryInput(
  booking: Record<string, unknown>,
): BookingInventoryResolveInput {
  const bookingType = String(booking.bookingType ?? booking.booking_type ?? '');
  const itemId = Number(booking.itemId ?? booking.item_id ?? 0);
  const idRaw = booking.id;
  const id = idRaw === undefined || idRaw === null ? undefined : Number(idRaw);
  return {
    ...(id !== undefined && Number.isFinite(id) ? { id } : {}),
    bookingType,
    itemId: Number.isFinite(itemId) ? itemId : 0,
    metadata: booking.metadata,
  };
}

async function activePartners(
  lookup: BookingInventoryLookup,
  empreendimentoId: number | null,
  derive: boolean,
): Promise<PartnerCandidate[]> {
  if (!derive || empreendimentoId == null) return [];
  const rows = await lookup.listPeasByEmpreendimentoId(empreendimentoId);
  return rows.filter((p) => p.status === 'active');
}

async function resolveWebsiteHotel(
  input: BookingInventoryResolveInput,
  lookup: BookingInventoryLookup,
  derivePartners: boolean,
  metadata: Record<string, unknown>,
): Promise<BookingInventoryResolution> {
  const itemId = positiveInt(input.itemId);
  if (itemId == null) return unresolved('INVALID_ITEM_ID', 'itemId must be a positive integer');

  const source = metadata.source;
  if (source !== undefined && source !== null && String(source).toLowerCase() === 'auction') {
    return unresolved('METADATA_INCONSISTENT', 'source=auction incompatible with booking_type=hotel');
  }

  const wc = await lookup.findWebsiteContentById(itemId);
  if (!wc) return unresolved('ITEM_NOT_FOUND', 'website_content not found for item_id');

  // Optional soft check — do not pivot to acomodacoes even if pageType missing/odd
  const page = (wc.pageType ?? '').toLowerCase();
  if (page && page !== 'hotel' && page !== 'hotels') {
    return unresolved('ITEM_TYPE_MISMATCH', `website_content page_type=${page}`);
  }

  const emp: EmpreendimentoRow | null =
    (await lookup.findEmpreendimentoByWebsiteContentId(wc.contentId)) ??
    (await lookup.findEmpreendimentoByHotelId(wc.contentId));

  let acomodacaoId: number | null = null;
  const metaUnitId = readOptionalAcomodacaoId(metadata);
  if (metaUnitId != null) {
    const unit = await lookup.findAcomodacaoById(metaUnitId);
    if (!unit) return unresolved('ITEM_NOT_FOUND', 'metadata.acomodacaoId not found');
    const unitHotel = unit.hotelId.trim();
    if (!unitHotel) return unresolved('HOTEL_ID_MISSING', 'metadata acomodacao without hotel_id');
    if (!emp) {
      return unresolved(
        'CROSS_CHECK_FAILED',
        'cannot cross-check unit without empreendimento for website hotel',
      );
    }
    if (unitHotel !== emp.hotelId.trim()) {
      return unresolved('CROSS_CHECK_FAILED', 'metadata acomodacao hotel_id !== empreendimento.hotel_id');
    }
    acomodacaoId = unit.id;
  }

  const partners = await activePartners(lookup, emp?.id ?? null, derivePartners);

  return {
    status: 'resolved',
    inventoryKind: 'website_hotel',
    websiteContentId: wc.id,
    contentId: wc.contentId,
    hotelId: emp?.hotelId ?? null,
    empreendimentoId: emp?.id ?? null,
    acomodacaoId,
    partners,
  };
}

async function resolveAccommodationUnit(
  input: BookingInventoryResolveInput,
  lookup: BookingInventoryLookup,
  derivePartners: boolean,
  metadata: Record<string, unknown>,
  bookingType: string,
): Promise<BookingInventoryResolution> {
  const itemId = positiveInt(input.itemId);
  if (itemId == null) return unresolved('INVALID_ITEM_ID', 'itemId must be a positive integer');

  const source = metadata.source;
  if (
    bookingType === 'auction' &&
    source !== undefined &&
    source !== null &&
    String(source).toLowerCase() !== 'auction'
  ) {
    return unresolved('METADATA_INCONSISTENT', 'metadata.source conflicts with booking_type=auction');
  }

  const metaUnitId = readOptionalAcomodacaoId(metadata);
  if (metaUnitId != null && metaUnitId !== itemId) {
    return unresolved(
      'METADATA_INCONSISTENT',
      'metadata.acomodacaoId !== item_id for unit booking_type',
    );
  }

  // CRITICAL: only look up acomodacoes because booking_type is a UNIT type — never for hotel.
  const aco: AcomodacaoRow | null = await lookup.findAcomodacaoById(itemId);
  if (!aco) return unresolved('ITEM_NOT_FOUND', 'acomodacao not found for item_id');

  const hotelId = aco.hotelId.trim();
  if (!hotelId) return unresolved('HOTEL_ID_MISSING', 'acomodacao.hotel_id empty');

  const emp = await lookup.findEmpreendimentoByHotelId(hotelId);
  const partners = await activePartners(lookup, emp?.id ?? null, derivePartners);

  return {
    status: 'resolved',
    inventoryKind: 'accommodation_unit',
    acomodacaoId: aco.id,
    hotelId,
    empreendimentoId: emp?.id ?? null,
    websiteContentId: null,
    partners,
  };
}

/**
 * Deterministic booking → inventory (+ optional PEA/Partner) resolution.
 * Never mutates the booking. Never writes earnings/ledger/payout.
 */
export async function resolveBookingInventory(
  input: BookingInventoryResolveInput,
  lookup: BookingInventoryLookup,
  options: ResolveBookingInventoryOptions = {},
): Promise<BookingInventoryResolution> {
  const derivePartners = options.derivePartners === true;
  const bookingType = String(input.bookingType ?? '')
    .trim()
    .toLowerCase();
  const metadata = asMetadataRecord(input.metadata);

  if (!bookingType) {
    return unresolved('UNKNOWN_BOOKING_TYPE', 'booking_type empty');
  }

  // Ambiguous / unsafe: metadata alone must never force accommodation without typed context.
  // (Handled by falling through — unknown types do not read acomodacaoId as authority.)

  if (bookingType === WEBSITE_HOTEL_BOOKING_TYPE) {
    return resolveWebsiteHotel(input, lookup, derivePartners, metadata);
  }

  if (ACCOMMODATION_UNIT_BOOKING_TYPES.has(bookingType)) {
    return resolveAccommodationUnit(input, lookup, derivePartners, metadata, bookingType);
  }

  return unresolved('UNSUPPORTED_BOOKING_TYPE', `booking_type=${bookingType}`);
}

/**
 * Convenience: accept raw booking row (snake_case or camelCase).
 */
export async function resolveBookingInventoryFromRow(
  booking: Record<string, unknown>,
  lookup: BookingInventoryLookup,
  options?: ResolveBookingInventoryOptions,
): Promise<BookingInventoryResolution> {
  return resolveBookingInventory(toBookingInventoryInput(booking), lookup, options);
}
