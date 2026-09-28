/**
 * C36-CL — Drizzle-backed ports for PartnerEarningWriterService.
 * LEDGER / PAYOUT not included.
 */

import { and, asc, eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import {
  partnerCommercialTerms,
  partnerEarnings,
  partnerEmpreendimentoAssociations,
} from '../../../../backend/src/db/schema/partners';
import {
  createDrizzleBookingInventoryLookup,
} from '../../bookings/services/booking-inventory.lookup';
import { resolveBookingInventory } from '../../bookings/services/booking-inventory.resolver';
import { isCommercialTermsEffectiveAt } from './partner-commercial-terms.util';
import type {
  PartnerEarningRow,
  PartnerEarningWriterPorts,
  PeaCommercialCandidate,
} from './partner-earning-writer.types';

function mapEarningRow(row: {
  id: string;
  partnerId: string;
  sourceType: string;
  sourceId: string;
  amountCents: number | string;
  currency: string;
  status: string;
  metadata: unknown;
}): PartnerEarningRow {
  return {
    id: row.id,
    partnerId: row.partnerId,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    amountCents: Number(row.amountCents),
    currency: row.currency,
    status: row.status,
    metadata: (row.metadata as PartnerEarningRow['metadata']) ?? null,
  };
}

export function createDrizzlePartnerEarningWriterPorts(
  overrides: Partial<PartnerEarningWriterPorts> = {},
): PartnerEarningWriterPorts {
  const inventoryLookup = createDrizzleBookingInventoryLookup();

  const base: PartnerEarningWriterPorts = {
    async findExistingBySource(sourceType, sourceId) {
      const [row] = await db
        .select()
        .from(partnerEarnings)
        .where(
          and(
            eq(partnerEarnings.sourceType, sourceType),
            eq(partnerEarnings.sourceId, sourceId),
          ),
        )
        .limit(1);
      return row ? mapEarningRow(row) : null;
    },

    async resolveInventory(input) {
      const resolution = await resolveBookingInventory(
        {
          id: input.id,
          bookingType: input.bookingType,
          itemId: input.itemId,
          metadata: input.metadata,
        },
        inventoryLookup,
        { derivePartners: false },
      );
      if (resolution.status === 'unresolved') {
        return {
          status: 'unresolved',
          inventoryKind: 'none',
          reasonCode: resolution.reasonCode,
        };
      }
      return {
        status: 'resolved',
        inventoryKind: resolution.inventoryKind,
        empreendimentoId: resolution.empreendimentoId,
        hotelId: resolution.hotelId,
        acomodacaoId: resolution.acomodacaoId,
      };
    },

    async listPeasByEmpreendimentoId(empreendimentoId) {
      const rows = await db
        .select({
          peaId: partnerEmpreendimentoAssociations.id,
          partnerId: partnerEmpreendimentoAssociations.partnerId,
          associationRole: partnerEmpreendimentoAssociations.associationRole,
          status: partnerEmpreendimentoAssociations.status,
          effectiveFrom: partnerEmpreendimentoAssociations.effectiveFrom,
          effectiveTo: partnerEmpreendimentoAssociations.effectiveTo,
        })
        .from(partnerEmpreendimentoAssociations)
        .where(
          eq(partnerEmpreendimentoAssociations.empreendimentoId, empreendimentoId),
        );
      return rows.map(
        (r): PeaCommercialCandidate => ({
          peaId: r.peaId,
          partnerId: r.partnerId,
          associationRole: r.associationRole,
          status: r.status,
          effectiveFrom: r.effectiveFrom,
          effectiveTo: r.effectiveTo,
        }),
      );
    },

    async findEffectiveTermsAt(peaId, tPay) {
      const actives = await db
        .select()
        .from(partnerCommercialTerms)
        .where(
          and(
            eq(partnerCommercialTerms.peaId, peaId),
            eq(partnerCommercialTerms.status, 'active'),
          ),
        )
        .orderBy(asc(partnerCommercialTerms.version));

      const effective = actives.filter((t) =>
        isCommercialTermsEffectiveAt(
          {
            status: t.status,
            effectiveFrom: t.effectiveFrom,
            effectiveTo: t.effectiveTo,
          },
          tPay,
        ),
      );

      if (effective.length === 0) return { kind: 'none' };
      if (effective.length > 1) {
        return { kind: 'ambiguous', count: effective.length };
      }
      const t = effective[0];
      return {
        kind: 'ok',
        terms: {
          termsId: t.id,
          termsVersion: t.version,
          rateBps: t.rateBps,
          rateKind: t.rateKind,
          basis: t.basis,
        },
      };
    },

    async insertEarning(params) {
      const [row] = await db
        .insert(partnerEarnings)
        .values({
          partnerId: params.partnerId,
          sourceType: params.sourceType,
          sourceId: params.sourceId,
          amountCents: params.amountCents,
          currency: params.currency,
          status: params.status,
          metadata: params.metadata,
        })
        .returning();
      return mapEarningRow(row);
    },
  };

  return { ...base, ...overrides };
}
