import { eq } from 'drizzle-orm';
import { propostas } from '../../../../backend/src/db/schema/propostas';
import { db } from '../../../lib/db';
import { parseEstadiaFromMetadata } from '../../acomodacoes/services/anfitriao-reservas.util';

const ACCOMMODATION_BOOKING_TYPES = new Set([
  'hotel',
  'accommodation',
  'acomodacao',
  'acomodacao_rsv',
  'stay',
]);

function asMetadataRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

export function resolveAcomodacaoIdFromBookingRow(booking: Record<string, unknown>): number | null {
  const metadata = asMetadataRecord(booking.metadata);

  const fromMeta = Number(metadata.acomodacaoId ?? metadata.selectedAcomodacaoId ?? 0);
  if (Number.isFinite(fromMeta) && fromMeta > 0) return fromMeta;

  const bookingType = String(booking.booking_type ?? booking.bookingType ?? '').toLowerCase();
  const itemId = Number(booking.item_id ?? booking.itemId ?? 0);
  if (ACCOMMODATION_BOOKING_TYPES.has(bookingType) && Number.isFinite(itemId) && itemId > 0) {
    return itemId;
  }

  return null;
}

export async function resolveAcomodacaoIdFromBooking(
  booking: Record<string, unknown>,
): Promise<number | null> {
  const direct = resolveAcomodacaoIdFromBookingRow(booking);
  if (direct) return direct;

  const metadata = asMetadataRecord(booking.metadata);
  const propostaId = Number(metadata.propostaId ?? metadata.proposta_id ?? 0);
  if (!Number.isFinite(propostaId) || propostaId <= 0) return null;

  const [row] = await db
    .select({ metadata: propostas.metadata })
    .from(propostas)
    .where(eq(propostas.id, propostaId))
    .limit(1);

  if (!row) return null;
  const estadia = parseEstadiaFromMetadata(row.metadata);
  return estadia?.acomodacaoId ?? null;
}

module.exports = {
  resolveAcomodacaoIdFromBooking,
  resolveAcomodacaoIdFromBookingRow,
};
