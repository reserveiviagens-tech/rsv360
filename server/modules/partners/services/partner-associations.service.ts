import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { empreendimentos } from '../../../../backend/src/db/schema/empreendimentos';
import {
  partnerEmpreendimentoAssociations,
  partners,
  type PartnerEmpreendimentoAssociation,
} from '../../../../backend/src/db/schema/partners';
import type {
  AssociationStatus,
  CreateAssociationInput,
  ListAssociationsQuery,
  PartnerMembershipRole,
  UpdateAssociationInput,
} from '../schema';
import { L1_ASSOCIATION_CAPABILITIES } from '../schema';
import {
  PartnerConflictError,
  PartnerForbiddenError,
  PartnerNotFoundError,
  assertPartnerStaffAccess,
  type PartnerActor,
} from './partners.service';

export class PartnerValidationError extends Error {
  constructor(message = 'Requisição inválida') {
    super(message);
    this.name = 'PartnerValidationError';
  }
}

export type AssociationAction = 'read' | 'mutate';

/**
 * Future L1 helper — normative matrix from C36-BC.
 * BD v1 does not call this for route gating (staff-only); exported for tests/structure.
 * NEVER consults the soft-link provenance table for AuthZ.
 */
export function l1AllowsAssociationAction(
  membershipRole: PartnerMembershipRole,
  action: AssociationAction,
): boolean {
  const caps = L1_ASSOCIATION_CAPABILITIES[membershipRole];
  return action === 'mutate' ? caps.mutate : caps.read;
}

/**
 * BD v1 AuthZ: platform staff only (Fatia A compatible).
 * L1 membership matrix is structured above for a later gate — not enforced here.
 * Soft-link provenance table is intentionally unused for AuthZ.
 */
export function assertAssociationAccess(actor: PartnerActor, _action: AssociationAction): void {
  assertPartnerStaffAccess(actor);
}

const ALLOWED_TRANSITIONS: Record<AssociationStatus, AssociationStatus[]> = {
  active: ['suspended', 'ended'],
  suspended: ['active', 'ended'],
  ended: ['active'],
};

function assertTransition(from: AssociationStatus, to: AssociationStatus): void {
  if (from === to) return;
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new PartnerValidationError(`Transição de status inválida: ${from} → ${to}`);
  }
}

function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  return e?.code === '23505' || /unique/i.test(e?.message ?? '');
}

function isFkViolation(error: unknown): boolean {
  const e = error as { code?: string };
  return e?.code === '23503';
}

function toAssociationDto(
  row: PartnerEmpreendimentoAssociation,
  empreendimento?: {
    id: number;
    hotelId: string;
    slug: string;
    nomeOficial: string;
    ativo: boolean;
  } | null,
) {
  return {
    id: row.id,
    partnerId: row.partnerId,
    empreendimentoId: row.empreendimentoId,
    associationRole: row.associationRole,
    status: row.status,
    effectiveFrom: row.effectiveFrom ?? null,
    effectiveTo: row.effectiveTo ?? null,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdByUserId: row.createdByUserId ?? null,
    empreendimento: empreendimento
      ? {
          id: empreendimento.id,
          hotelId: empreendimento.hotelId,
          slug: empreendimento.slug,
          nomeOficial: empreendimento.nomeOficial,
          ativo: empreendimento.ativo,
        }
      : undefined,
  };
}

async function requirePartner(partnerId: string): Promise<void> {
  const [partner] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(eq(partners.id, partnerId))
    .limit(1);
  if (!partner) {
    throw new PartnerNotFoundError();
  }
}

async function requireEmpreendimento(empreendimentoId: number) {
  const [row] = await db
    .select({
      id: empreendimentos.id,
      hotelId: empreendimentos.hotelId,
      slug: empreendimentos.slug,
      nomeOficial: empreendimentos.nomeOficial,
      ativo: empreendimentos.ativo,
    })
    .from(empreendimentos)
    .where(eq(empreendimentos.id, empreendimentoId))
    .limit(1);
  if (!row) {
    throw new PartnerNotFoundError('Empreendimento não encontrado');
  }
  return row;
}

async function getAssociationForPartner(partnerId: string, empreendimentoId: number) {
  const [row] = await db
    .select()
    .from(partnerEmpreendimentoAssociations)
    .where(
      and(
        eq(partnerEmpreendimentoAssociations.partnerId, partnerId),
        eq(partnerEmpreendimentoAssociations.empreendimentoId, empreendimentoId),
      ),
    )
    .limit(1);
  if (!row) {
    throw new PartnerNotFoundError('Associação não encontrada neste Partner');
  }
  return row;
}

export const partnerAssociationsService = {
  async list(actor: PartnerActor, partnerId: string, query: ListAssociationsQuery) {
    assertAssociationAccess(actor, 'read');
    await requirePartner(partnerId);

    const offset = (query.page - 1) * query.pageSize;
    const where = query.status
      ? and(
          eq(partnerEmpreendimentoAssociations.partnerId, partnerId),
          eq(partnerEmpreendimentoAssociations.status, query.status),
        )
      : eq(partnerEmpreendimentoAssociations.partnerId, partnerId);

    const [rows, totalRow] = await Promise.all([
      db
        .select({
          assoc: partnerEmpreendimentoAssociations,
          empId: empreendimentos.id,
          hotelId: empreendimentos.hotelId,
          slug: empreendimentos.slug,
          nomeOficial: empreendimentos.nomeOficial,
          ativo: empreendimentos.ativo,
        })
        .from(partnerEmpreendimentoAssociations)
        .leftJoin(
          empreendimentos,
          eq(partnerEmpreendimentoAssociations.empreendimentoId, empreendimentos.id),
        )
        .where(where)
        .orderBy(desc(partnerEmpreendimentoAssociations.createdAt))
        .limit(query.pageSize)
        .offset(offset),
      db.select({ value: count() }).from(partnerEmpreendimentoAssociations).where(where),
    ]);

    return {
      items: rows.map((r) =>
        toAssociationDto(
          r.assoc,
          r.empId != null
            ? {
                id: r.empId,
                hotelId: r.hotelId!,
                slug: r.slug!,
                nomeOficial: r.nomeOficial!,
                ativo: r.ativo!,
              }
            : null,
        ),
      ),
      page: query.page,
      pageSize: query.pageSize,
      total: Number(totalRow[0]?.value ?? 0),
    };
  },

  async get(actor: PartnerActor, partnerId: string, empreendimentoId: number) {
    assertAssociationAccess(actor, 'read');
    await requirePartner(partnerId);
    const row = await getAssociationForPartner(partnerId, empreendimentoId);
    const emp = await requireEmpreendimento(empreendimentoId).catch(() => null);
    return toAssociationDto(row, emp);
  },

  async create(actor: PartnerActor, partnerId: string, input: CreateAssociationInput) {
    assertAssociationAccess(actor, 'mutate');
    await requirePartner(partnerId);
    await requireEmpreendimento(input.empreendimentoId);

    try {
      const [row] = await db
        .insert(partnerEmpreendimentoAssociations)
        .values({
          partnerId,
          empreendimentoId: input.empreendimentoId,
          associationRole: input.associationRole,
          status: 'active',
          effectiveFrom: input.effectiveFrom ?? null,
          effectiveTo: input.effectiveTo ?? null,
          metadata: input.metadata ?? null,
          createdByUserId: actor.id,
        })
        .returning();
      const emp = await requireEmpreendimento(input.empreendimentoId);
      return toAssociationDto(row, emp);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new PartnerConflictError('Associação já existe para este Partner e Empreendimento');
      }
      if (isFkViolation(error)) {
        throw new PartnerNotFoundError();
      }
      throw error;
    }
  },

  async update(
    actor: PartnerActor,
    partnerId: string,
    empreendimentoId: number,
    input: UpdateAssociationInput,
  ) {
    assertAssociationAccess(actor, 'mutate');
    await requirePartner(partnerId);
    const existing = await getAssociationForPartner(partnerId, empreendimentoId);

    if (input.status !== undefined) {
      assertTransition(existing.status as AssociationStatus, input.status);
    }

    const [row] = await db
      .update(partnerEmpreendimentoAssociations)
      .set({
        ...(input.associationRole !== undefined
          ? { associationRole: input.associationRole }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.effectiveFrom !== undefined ? { effectiveFrom: input.effectiveFrom } : {}),
        ...(input.effectiveTo !== undefined ? { effectiveTo: input.effectiveTo } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(partnerEmpreendimentoAssociations.partnerId, partnerId),
          eq(partnerEmpreendimentoAssociations.empreendimentoId, empreendimentoId),
        ),
      )
      .returning();

    const emp = await requireEmpreendimento(empreendimentoId).catch(() => null);
    return toAssociationDto(row, emp);
  },

  async suspend(actor: PartnerActor, partnerId: string, empreendimentoId: number) {
    return this.update(actor, partnerId, empreendimentoId, { status: 'suspended' });
  },

  async end(actor: PartnerActor, partnerId: string, empreendimentoId: number) {
    return this.update(actor, partnerId, empreendimentoId, { status: 'ended' });
  },

  async reactivate(actor: PartnerActor, partnerId: string, empreendimentoId: number) {
    return this.update(actor, partnerId, empreendimentoId, { status: 'active' });
  },
};
