/**
 * Drizzle-backed lookup for BookingInventoryResolver (C36-BY).
 * Exact hotel_id / website_content_id matches only — no fuzzy aliases.
 */

import { eq, sql } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { acomodacoes } from '../../../../backend/src/db/schema/acomodacoes';
import { empreendimentos } from '../../../../backend/src/db/schema/empreendimentos';
import { partnerEmpreendimentoAssociations } from '../../../../backend/src/db/schema/partners';
import type {
  AcomodacaoRow,
  BookingInventoryLookup,
  EmpreendimentoRow,
  PartnerCandidate,
  WebsiteContentRow,
} from './booking-inventory.types';

/**
 * website_content is legacy SQL (not always in Drizzle schema).
 */
async function queryWebsiteContentById(id: number): Promise<WebsiteContentRow | null> {
  try {
    const result = await db.execute(sql`
      SELECT id, content_id, page_type
        FROM website_content
       WHERE id = ${id}
       LIMIT 1
    `);
    const rows = (result as { rows?: Array<Record<string, unknown>> }).rows ?? [];
    const row = rows[0];
    if (!row) return null;
    return {
      id: Number(row.id),
      contentId: String(row.content_id ?? ''),
      pageType: row.page_type != null ? String(row.page_type) : null,
    };
  } catch {
    return null;
  }
}

export function createDrizzleBookingInventoryLookup(
  overrides: Partial<BookingInventoryLookup> = {},
): BookingInventoryLookup {
  const base: BookingInventoryLookup = {
    async findWebsiteContentById(id) {
      return queryWebsiteContentById(id);
    },

    async findAcomodacaoById(id) {
      const [row] = await db
        .select({ id: acomodacoes.id, hotelId: acomodacoes.hotelId })
        .from(acomodacoes)
        .where(eq(acomodacoes.id, id))
        .limit(1);
      if (!row) return null;
      return { id: row.id, hotelId: row.hotelId } satisfies AcomodacaoRow;
    },

    async findEmpreendimentoByWebsiteContentId(contentId) {
      const trimmed = contentId.trim();
      if (!trimmed) return null;
      const [row] = await db
        .select({ id: empreendimentos.id, hotelId: empreendimentos.hotelId })
        .from(empreendimentos)
        .where(eq(empreendimentos.websiteContentId, trimmed))
        .limit(1);
      if (!row) return null;
      return { id: row.id, hotelId: row.hotelId } satisfies EmpreendimentoRow;
    },

    async findEmpreendimentoByHotelId(hotelId) {
      const trimmed = hotelId.trim();
      if (!trimmed) return null;
      const [row] = await db
        .select({ id: empreendimentos.id, hotelId: empreendimentos.hotelId })
        .from(empreendimentos)
        .where(eq(empreendimentos.hotelId, trimmed))
        .limit(1);
      if (!row) return null;
      return { id: row.id, hotelId: row.hotelId } satisfies EmpreendimentoRow;
    },

    async listPeasByEmpreendimentoId(empreendimentoId) {
      const rows = await db
        .select({
          associationId: partnerEmpreendimentoAssociations.id,
          partnerId: partnerEmpreendimentoAssociations.partnerId,
          associationRole: partnerEmpreendimentoAssociations.associationRole,
          empreendimentoId: partnerEmpreendimentoAssociations.empreendimentoId,
          status: partnerEmpreendimentoAssociations.status,
        })
        .from(partnerEmpreendimentoAssociations)
        .where(eq(partnerEmpreendimentoAssociations.empreendimentoId, empreendimentoId));
      return rows.map(
        (r): PartnerCandidate => ({
          associationId: r.associationId,
          partnerId: r.partnerId,
          associationRole: r.associationRole,
          empreendimentoId: r.empreendimentoId,
          status: r.status,
        }),
      );
    },
  };

  return { ...base, ...overrides };
}
