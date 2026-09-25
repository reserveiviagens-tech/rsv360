import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import {
  partnerMemberships,
  partners,
  type Partner,
} from '../../../../backend/src/db/schema/partners';
import type {
  CreateMembershipInput,
  CreatePartnerInput,
  ListPartnersQuery,
  UpdatePartnerInput,
} from '../schema';

export class PartnerNotFoundError extends Error {
  constructor(message = 'Partner não encontrado') {
    super(message);
    this.name = 'PartnerNotFoundError';
  }
}

export class PartnerConflictError extends Error {
  constructor(message = 'Conflito de recurso Partner') {
    super(message);
    this.name = 'PartnerConflictError';
  }
}

export class PartnerForbiddenError extends Error {
  constructor(message = 'Acesso negado ao Partner') {
    super(message);
    this.name = 'PartnerForbiddenError';
  }
}

/** Actor derived only from verified JWT (never from client body). */
export type PartnerActor = {
  id: number;
  role: string;
};

const STAFF_ROLES = new Set(['admin', 'manager']);

function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  return e?.code === '23505' || /unique/i.test(e?.message ?? '');
}

/**
 * Defense-in-depth: Fatia A staff gate. Resource ownership for non-staff
 * is denied even if a caller bypasses route middleware in tests.
 */
export function assertPartnerStaffAccess(actor: PartnerActor): void {
  if (!STAFF_ROLES.has(actor.role)) {
    throw new PartnerForbiddenError();
  }
}

function toPartnerDto(row: Partner) {
  return {
    id: row.id,
    code: row.code,
    displayName: row.displayName,
    status: row.status,
    primaryUserId: row.primaryUserId,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const partnersService = {
  async create(actor: PartnerActor, input: CreatePartnerInput) {
    assertPartnerStaffAccess(actor);
    try {
      const [row] = await db
        .insert(partners)
        .values({
          code: input.code,
          displayName: input.displayName,
          status: input.status,
          primaryUserId: input.primaryUserId ?? null,
          metadata: input.metadata ?? null,
        })
        .returning();
      return toPartnerDto(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new PartnerConflictError('Código de Partner já existe');
      }
      throw error;
    }
  },

  async list(actor: PartnerActor, query: ListPartnersQuery) {
    assertPartnerStaffAccess(actor);
    const offset = (query.page - 1) * query.pageSize;
    const where = query.status ? eq(partners.status, query.status) : undefined;

    const [rows, totalRow] = await Promise.all([
      db
        .select()
        .from(partners)
        .where(where)
        .orderBy(desc(partners.createdAt))
        .limit(query.pageSize)
        .offset(offset),
      db.select({ value: count() }).from(partners).where(where),
    ]);

    return {
      items: rows.map(toPartnerDto),
      page: query.page,
      pageSize: query.pageSize,
      total: Number(totalRow[0]?.value ?? 0),
    };
  },

  async getById(actor: PartnerActor, partnerId: string) {
    assertPartnerStaffAccess(actor);
    const [row] = await db.select().from(partners).where(eq(partners.id, partnerId)).limit(1);
    if (!row) {
      throw new PartnerNotFoundError();
    }
    return toPartnerDto(row);
  },

  async update(actor: PartnerActor, partnerId: string, input: UpdatePartnerInput) {
    assertPartnerStaffAccess(actor);
    const [existing] = await db.select().from(partners).where(eq(partners.id, partnerId)).limit(1);
    if (!existing) {
      throw new PartnerNotFoundError();
    }

    const [row] = await db
      .update(partners)
      .set({
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.primaryUserId !== undefined ? { primaryUserId: input.primaryUserId } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        updatedAt: new Date(),
      })
      .where(eq(partners.id, partnerId))
      .returning();

    return toPartnerDto(row);
  },

  async listMemberships(actor: PartnerActor, partnerId: string) {
    assertPartnerStaffAccess(actor);
    const [partner] = await db.select({ id: partners.id }).from(partners).where(eq(partners.id, partnerId)).limit(1);
    if (!partner) {
      throw new PartnerNotFoundError();
    }

    const rows = await db
      .select({
        id: partnerMemberships.id,
        partnerId: partnerMemberships.partnerId,
        userId: partnerMemberships.userId,
        role: partnerMemberships.role,
        createdAt: partnerMemberships.createdAt,
      })
      .from(partnerMemberships)
      .where(eq(partnerMemberships.partnerId, partnerId))
      .orderBy(desc(partnerMemberships.createdAt));

    return { items: rows };
  },

  async createMembership(actor: PartnerActor, partnerId: string, input: CreateMembershipInput) {
    assertPartnerStaffAccess(actor);
    const [partner] = await db.select({ id: partners.id }).from(partners).where(eq(partners.id, partnerId)).limit(1);
    if (!partner) {
      throw new PartnerNotFoundError();
    }

    try {
      const [row] = await db
        .insert(partnerMemberships)
        .values({
          partnerId,
          userId: input.userId,
          role: input.role,
        })
        .returning({
          id: partnerMemberships.id,
          partnerId: partnerMemberships.partnerId,
          userId: partnerMemberships.userId,
          role: partnerMemberships.role,
          createdAt: partnerMemberships.createdAt,
        });
      return row;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new PartnerConflictError('Membership já existe para este usuário neste Partner');
      }
      throw error;
    }
  },

  /**
   * IDOR helper: verifies the membership belongs to the given partner.
   * Never trusts client-supplied membership↔partner association alone.
   */
  async getMembershipForPartner(actor: PartnerActor, partnerId: string, membershipId: string) {
    assertPartnerStaffAccess(actor);
    const [row] = await db
      .select({
        id: partnerMemberships.id,
        partnerId: partnerMemberships.partnerId,
        userId: partnerMemberships.userId,
        role: partnerMemberships.role,
        createdAt: partnerMemberships.createdAt,
      })
      .from(partnerMemberships)
      .where(
        and(eq(partnerMemberships.id, membershipId), eq(partnerMemberships.partnerId, partnerId)),
      )
      .limit(1);

    if (!row) {
      throw new PartnerNotFoundError('Membership não encontrada neste Partner');
    }
    return row;
  },
};
