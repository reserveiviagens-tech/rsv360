/**
 * C36-CK — Partner commercial terms service (foundation ops).
 * Does NOT create earnings / ledger / payout rows.
 * AuthZ: platform staff only (same Fatia A / BD v1 pattern). Soft-link provenance unused for AuthZ.
 */

import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../../lib/db';
import {
  partnerCommercialTerms,
  partnerEmpreendimentoAssociations,
  type PartnerCommercialTerm,
} from '../../../../backend/src/db/schema/partners';
import type { CreateCommercialTermsInput } from '../schema';
import {
  PartnerConflictError,
  PartnerForbiddenError,
  PartnerNotFoundError,
  assertPartnerStaffAccess,
  type PartnerActor,
} from './partners.service';
import { PartnerValidationError } from './partner-associations.service';
import {
  isCommercialTermsEffectiveAt,
  resolveExclusiveCommercialOwner,
} from './partner-commercial-terms.util';

export { PartnerValidationError };

function assertStaff(actor: PartnerActor): void {
  assertPartnerStaffAccess(actor);
}

function isUniqueActiveViolation(error: unknown): boolean {
  const e = error as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  const code = e?.code ?? e?.cause?.code;
  const constraint = e?.constraint ?? e?.cause?.constraint ?? '';
  return code === '23505' && constraint.includes('one_active_per_pea');
}

export class PartnerCommercialTermsService {
  async getPeaOrThrow(peaId: string) {
    const [row] = await db
      .select()
      .from(partnerEmpreendimentoAssociations)
      .where(eq(partnerEmpreendimentoAssociations.id, peaId))
      .limit(1);
    if (!row) throw new PartnerNotFoundError('PEA não encontrado');
    return row;
  }

  async listByPea(actor: PartnerActor, peaId: string): Promise<PartnerCommercialTerm[]> {
    assertStaff(actor);
    await this.getPeaOrThrow(peaId);
    return db
      .select()
      .from(partnerCommercialTerms)
      .where(eq(partnerCommercialTerms.peaId, peaId))
      .orderBy(desc(partnerCommercialTerms.version));
  }

  async createDraft(
    actor: PartnerActor,
    peaId: string,
    input: CreateCommercialTermsInput,
  ): Promise<PartnerCommercialTerm> {
    assertStaff(actor);
    const pea = await this.getPeaOrThrow(peaId);
    if (pea.status === 'ended') {
      throw new PartnerValidationError('PEA ended não aceita novos termos');
    }
    if (input.effectiveFrom && input.effectiveTo && input.effectiveTo <= input.effectiveFrom) {
      throw new PartnerValidationError('effectiveTo must be > effectiveFrom');
    }

    const [{ maxVersion }] = await db
      .select({
        maxVersion: sql<number>`coalesce(max(${partnerCommercialTerms.version}), 0)`,
      })
      .from(partnerCommercialTerms)
      .where(eq(partnerCommercialTerms.peaId, peaId));

    const [row] = await db
      .insert(partnerCommercialTerms)
      .values({
        peaId,
        rateKind: 'percent_bps',
        rateBps: input.rateBps,
        basis: 'booking_total',
        status: 'draft',
        version: Number(maxVersion) + 1,
        effectiveFrom: input.effectiveFrom ?? null,
        effectiveTo: input.effectiveTo ?? null,
        createdByUserId: actor.id,
      })
      .returning();
    return row;
  }

  /**
   * Activate a draft term. Supersedes previous active on same PEA in one TX.
   * Unique partial index enforces at most one active.
   */
  async activate(actor: PartnerActor, termsId: string): Promise<PartnerCommercialTerm> {
    assertStaff(actor);
    try {
      return await db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(partnerCommercialTerms)
          .where(eq(partnerCommercialTerms.id, termsId))
          .limit(1);
        if (!current) throw new PartnerNotFoundError('Termo comercial não encontrado');
        if (current.status === 'active') return current;
        if (current.status !== 'draft') {
          throw new PartnerValidationError(`Não é possível ativar status=${current.status}`);
        }

        const previousActive = await tx
          .select()
          .from(partnerCommercialTerms)
          .where(
            and(
              eq(partnerCommercialTerms.peaId, current.peaId),
              eq(partnerCommercialTerms.status, 'active'),
            ),
          );

        for (const prev of previousActive) {
          await tx
            .update(partnerCommercialTerms)
            .set({
              status: 'superseded',
              supersededBy: current.id,
              updatedAt: new Date(),
            })
            .where(eq(partnerCommercialTerms.id, prev.id));
        }

        const [activated] = await tx
          .update(partnerCommercialTerms)
          .set({ status: 'active', updatedAt: new Date() })
          .where(eq(partnerCommercialTerms.id, termsId))
          .returning();
        return activated;
      });
    } catch (error) {
      if (error instanceof PartnerNotFoundError || error instanceof PartnerValidationError) {
        throw error;
      }
      if (isUniqueActiveViolation(error)) {
        throw new PartnerConflictError('Já existe um termo active para este PEA');
      }
      throw error;
    }
  }

  /**
   * Resolve effective commercial terms for a PEA at T_pay.
   * Does not create earnings. Fail-closed if PEA not active commercial_owner.
   */
  async resolveEffectiveAt(
    actor: PartnerActor,
    peaId: string,
    tPay: Date,
  ): Promise<
    | { kind: 'none'; reason: string }
    | { kind: 'ok'; terms: PartnerCommercialTerm; rateBps: number }
  > {
    assertStaff(actor);
    const pea = await this.getPeaOrThrow(peaId);
    if (pea.status !== 'active') {
      return { kind: 'none', reason: 'PEA_NOT_ACTIVE' };
    }
    if (pea.associationRole !== 'commercial_owner') {
      return { kind: 'none', reason: 'PEA_NOT_COMMERCIAL_OWNER' };
    }

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

    if (effective.length === 0) return { kind: 'none', reason: 'NO_EFFECTIVE_TERMS' };
    if (effective.length > 1) {
      throw new PartnerConflictError('Mais de um termo active efetivo no T_pay (fail-closed)');
    }
    return { kind: 'ok', terms: effective[0], rateBps: effective[0].rateBps };
  }

  /** Attribution helper for exclusive commercial_owner PEAs (no first-row). */
  resolveOwners(
    candidates: Array<{ peaId: string; partnerId: string }>,
  ) {
    return resolveExclusiveCommercialOwner(candidates);
  }
}

export const partnerCommercialTermsService = new PartnerCommercialTermsService();

// Re-export for route mapError typing convenience
export { PartnerForbiddenError, PartnerNotFoundError, PartnerConflictError };
