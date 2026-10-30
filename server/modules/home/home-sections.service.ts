import { and, asc, count, eq, sql } from 'drizzle-orm';
import { db } from '../../lib/db';
import {
  HOME_ENTITY_TYPES,
  HOME_SECTIONS,
  homeSectionPlacements,
  type HomeEntityType,
  type HomeSection,
  type HomeSectionPlacement,
} from '../../../backend/src/db/schema/home-section-placements';

export const MAX_ITEMS_PER_SECTION = 12;

const ALLOWED_CTA_HOSTS = new Set([
  'reserveiviagens.com.br',
  'www.reserveiviagens.com.br',
  'staging.reserveiviagens.com.br',
  'localhost',
  '127.0.0.1',
]);

export type PlacementInput = {
  entityType: HomeEntityType;
  entityId: string;
  titleOverride?: string | null;
  subtitleOverride?: string | null;
  badgeText?: string | null;
  imageUrl?: string | null;
  ctaHref?: string | null;
  orderIndex?: number;
  isActive?: boolean;
};

export type PlacementPatchInput = {
  titleOverride?: string | null;
  subtitleOverride?: string | null;
  badgeText?: string | null;
  imageUrl?: string | null;
  ctaHref?: string | null;
  orderIndex?: number;
  isActive?: boolean;
  entityType?: HomeEntityType;
  entityId?: string;
};

export class HomeConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HomeConflictError';
  }
}

export class HomeNotFoundError extends Error {
  constructor(message = 'Item não encontrado') {
    super(message);
    this.name = 'HomeNotFoundError';
  }
}

function isHomeSection(value: string): value is HomeSection {
  return (HOME_SECTIONS as readonly string[]).includes(value);
}

function isEntityType(value: string): value is HomeEntityType {
  return (HOME_ENTITY_TYPES as readonly string[]).includes(value);
}

export function assertHomeSection(section: string): HomeSection {
  if (!isHomeSection(section)) {
    throw new Error(`section inválida: use ${HOME_SECTIONS.join('|')}`);
  }
  return section;
}

function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  return e?.code === '23505' || /unique/i.test(e?.message ?? '');
}

/** Path relativo seguro ou https do domínio próprio. */
export function assertSafeCtaHref(ctaHref: string, label = 'ctaHref'): string {
  const value = ctaHref.trim().slice(0, 512);
  if (!value) {
    throw new Error(`${label} inválido`);
  }
  const lower = value.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    value.startsWith('//')
  ) {
    throw new Error(`${label} inseguro`);
  }
  if (value.startsWith('/')) {
    if (!/^\/[a-zA-Z0-9\-_/?=&%#.]*$/.test(value)) {
      throw new Error(`${label} path inválido`);
    }
    return value;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} deve ser path relativo ou URL https do domínio`);
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ALLOWED_CTA_HOSTS.has(url.hostname))) {
    throw new Error(`${label} deve usar https do domínio próprio`);
  }
  if (!ALLOWED_CTA_HOSTS.has(url.hostname)) {
    throw new Error(`${label} domínio não permitido`);
  }
  return value;
}

export function assertSafeImageUrl(imageUrl: string, label = 'imageUrl'): string {
  const value = imageUrl.trim().slice(0, 1024);
  if (!value) {
    throw new Error(`${label} inválido`);
  }
  const lower = value.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    value.startsWith('//')
  ) {
    throw new Error(`${label} inseguro`);
  }
  if (value.startsWith('/')) {
    return value;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} deve ser path relativo ou URL https`);
  }
  if (url.protocol !== 'https:') {
    throw new Error(`${label} deve usar https`);
  }
  return value;
}

function optionalTrimmed(
  raw: unknown,
  max: number,
  label: string,
): string | null {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (value.length > max) {
    throw new Error(`${label} excede ${max} caracteres`);
  }
  return value;
}

function normalizePlacement(raw: unknown, index: number): PlacementInput {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`item[${index}] inválido`);
  }
  const item = raw as Record<string, unknown>;
  const entityType = String(item.entityType ?? item.entity_type ?? '');
  const entityId = String(item.entityId ?? item.entity_id ?? '').trim();
  if (!isEntityType(entityType)) {
    throw new Error(`item[${index}].entityType inválido`);
  }
  if (!entityId || entityId.length > 128) {
    throw new Error(`item[${index}].entityId inválido`);
  }

  const titleOverride = optionalTrimmed(
    item.titleOverride ?? item.title_override,
    255,
    `item[${index}].titleOverride`,
  );
  const subtitleOverride = optionalTrimmed(
    item.subtitleOverride ?? item.subtitle_override,
    512,
    `item[${index}].subtitleOverride`,
  );
  const badgeText = optionalTrimmed(
    item.badgeText ?? item.badge_text,
    64,
    `item[${index}].badgeText`,
  );

  const imageUrlRaw = item.imageUrl ?? item.image_url;
  let imageUrl: string | null = null;
  if (imageUrlRaw != null && String(imageUrlRaw).trim()) {
    imageUrl = assertSafeImageUrl(String(imageUrlRaw), `item[${index}].imageUrl`);
  }

  const ctaHrefRaw = item.ctaHref ?? item.cta_href;
  let ctaHref: string | null = null;
  if (ctaHrefRaw != null && String(ctaHrefRaw).trim()) {
    ctaHref = assertSafeCtaHref(String(ctaHrefRaw), `item[${index}].ctaHref`);
  }

  const orderIndex =
    item.orderIndex != null || item.order_index != null
      ? Number(item.orderIndex ?? item.order_index)
      : index;
  if (!Number.isFinite(orderIndex) || orderIndex < 0 || orderIndex > 10_000) {
    throw new Error(`item[${index}].orderIndex inválido`);
  }
  const isActive =
    item.isActive != null || item.is_active != null
      ? Boolean(item.isActive ?? item.is_active)
      : true;

  return {
    entityType,
    entityId,
    titleOverride,
    subtitleOverride,
    badgeText,
    imageUrl,
    ctaHref,
    orderIndex,
    isActive,
  };
}

export function parsePlacementsPayload(body: unknown): PlacementInput[] {
  if (!body || typeof body !== 'object') {
    throw new Error('payload inválido');
  }
  const items = (body as { items?: unknown }).items;
  if (!Array.isArray(items)) {
    throw new Error('items deve ser um array');
  }
  if (items.length > MAX_ITEMS_PER_SECTION) {
    throw new Error(`máximo de ${MAX_ITEMS_PER_SECTION} itens por seção`);
  }
  const seen = new Set<string>();
  const parsed = items.map((item, index) => normalizePlacement(item, index));
  for (const p of parsed) {
    const key = `${p.entityType}:${p.entityId}`;
    if (seen.has(key)) {
      throw new Error(`item duplicado: ${key}`);
    }
    seen.add(key);
  }
  return parsed;
}

export function parseCreateItemPayload(body: unknown): PlacementInput {
  if (!body || typeof body !== 'object') {
    throw new Error('payload inválido');
  }
  const input = normalizePlacement(body, 0);
  const raw = body as Record<string, unknown>;
  // Sem orderIndex explícito → createItem calcula MAX+1 (não forçar 0 do índice).
  if (!('orderIndex' in raw) && !('order_index' in raw)) {
    delete (input as { orderIndex?: number }).orderIndex;
  }
  return input;
}

export function parsePatchItemPayload(body: unknown): PlacementPatchInput {
  if (!body || typeof body !== 'object') {
    throw new Error('payload inválido');
  }
  const item = body as Record<string, unknown>;
  const patch: PlacementPatchInput = {};

  if ('entityType' in item || 'entity_type' in item) {
    const entityType = String(item.entityType ?? item.entity_type ?? '');
    if (!isEntityType(entityType)) {
      throw new Error('entityType inválido');
    }
    patch.entityType = entityType;
  }
  if ('entityId' in item || 'entity_id' in item) {
    const entityId = String(item.entityId ?? item.entity_id ?? '').trim();
    if (!entityId || entityId.length > 128) {
      throw new Error('entityId inválido');
    }
    patch.entityId = entityId;
  }
  if ('titleOverride' in item || 'title_override' in item) {
    patch.titleOverride = optionalTrimmed(
      item.titleOverride ?? item.title_override,
      255,
      'titleOverride',
    );
  }
  if ('subtitleOverride' in item || 'subtitle_override' in item) {
    patch.subtitleOverride = optionalTrimmed(
      item.subtitleOverride ?? item.subtitle_override,
      512,
      'subtitleOverride',
    );
  }
  if ('badgeText' in item || 'badge_text' in item) {
    patch.badgeText = optionalTrimmed(item.badgeText ?? item.badge_text, 64, 'badgeText');
  }
  if ('imageUrl' in item || 'image_url' in item) {
    const raw = item.imageUrl ?? item.image_url;
    patch.imageUrl =
      raw != null && String(raw).trim() ? assertSafeImageUrl(String(raw), 'imageUrl') : null;
  }
  if ('ctaHref' in item || 'cta_href' in item) {
    const raw = item.ctaHref ?? item.cta_href;
    patch.ctaHref =
      raw != null && String(raw).trim() ? assertSafeCtaHref(String(raw), 'ctaHref') : null;
  }
  if ('orderIndex' in item || 'order_index' in item) {
    const orderIndex = Number(item.orderIndex ?? item.order_index);
    if (!Number.isFinite(orderIndex) || orderIndex < 0 || orderIndex > 10_000) {
      throw new Error('orderIndex inválido');
    }
    patch.orderIndex = orderIndex;
  }
  if ('isActive' in item || 'is_active' in item) {
    patch.isActive = Boolean(item.isActive ?? item.is_active);
  }

  if (Object.keys(patch).length === 0) {
    throw new Error('payload inválido: nenhum campo para atualizar');
  }
  return patch;
}

function toPublic(row: HomeSectionPlacement) {
  return {
    id: row.id,
    section: row.section,
    entityType: row.entityType,
    entityId: row.entityId,
    titleOverride: row.titleOverride,
    subtitleOverride: row.subtitleOverride,
    badgeText: row.badgeText,
    imageUrl: row.imageUrl,
    ctaHref: row.ctaHref,
    orderIndex: row.orderIndex,
    isActive: row.isActive,
  };
}

function toAdmin(row: HomeSectionPlacement) {
  return {
    ...toPublic(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class HomeSectionsService {
  static async listPublic(section: string) {
    const s = assertHomeSection(section);
    const rows = await db
      .select()
      .from(homeSectionPlacements)
      .where(and(eq(homeSectionPlacements.section, s), eq(homeSectionPlacements.isActive, true)))
      .orderBy(asc(homeSectionPlacements.orderIndex), asc(homeSectionPlacements.id));
    return rows.map(toPublic);
  }

  static async listAdmin(section: string) {
    const s = assertHomeSection(section);
    const rows = await db
      .select()
      .from(homeSectionPlacements)
      .where(eq(homeSectionPlacements.section, s))
      .orderBy(asc(homeSectionPlacements.orderIndex), asc(homeSectionPlacements.id));
    return rows.map(toAdmin);
  }

  /** Substitui o conjunto de placements da seção (upsert atômico por seção). */
  static async replaceSection(section: string, items: PlacementInput[]) {
    const s = assertHomeSection(section);
    const now = new Date();

    return db.transaction(async (tx) => {
      await tx.delete(homeSectionPlacements).where(eq(homeSectionPlacements.section, s));
      if (items.length === 0) {
        return [];
      }
      const inserted = await tx
        .insert(homeSectionPlacements)
        .values(
          items.map((item, index) => ({
            section: s,
            entityType: item.entityType,
            entityId: item.entityId,
            titleOverride: item.titleOverride ?? null,
            subtitleOverride: item.subtitleOverride ?? null,
            badgeText: item.badgeText ?? null,
            imageUrl: item.imageUrl ?? null,
            ctaHref: item.ctaHref ?? null,
            orderIndex: item.orderIndex ?? index,
            isActive: item.isActive ?? true,
            createdAt: now,
            updatedAt: now,
          })),
        )
        .returning();
      return inserted.map(toAdmin);
    });
  }

  static async createItem(section: string, input: PlacementInput) {
    const s = assertHomeSection(section);
    const now = new Date();

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(homeSectionPlacements)
      .where(eq(homeSectionPlacements.section, s));
    if (Number(total) >= MAX_ITEMS_PER_SECTION) {
      throw new Error(`máximo de ${MAX_ITEMS_PER_SECTION} itens por seção`);
    }

    const [maxRow] = await db
      .select({ maxOrder: sql<number>`coalesce(max(${homeSectionPlacements.orderIndex}), -1)` })
      .from(homeSectionPlacements)
      .where(eq(homeSectionPlacements.section, s));
    const nextOrder =
      typeof input.orderIndex === 'number' && Number.isFinite(input.orderIndex)
        ? input.orderIndex
        : Number(maxRow?.maxOrder ?? -1) + 1;

    try {
      const [row] = await db
        .insert(homeSectionPlacements)
        .values({
          section: s,
          entityType: input.entityType,
          entityId: input.entityId,
          titleOverride: input.titleOverride ?? null,
          subtitleOverride: input.subtitleOverride ?? null,
          badgeText: input.badgeText ?? null,
          imageUrl: input.imageUrl ?? null,
          ctaHref: input.ctaHref ?? null,
          orderIndex: nextOrder,
          isActive: input.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return toAdmin(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new HomeConflictError(
          `Já existe item ${input.entityType}:${input.entityId} nesta seção`,
        );
      }
      throw error;
    }
  }

  static async patchItem(id: number, patch: PlacementPatchInput) {
    if (!Number.isFinite(id) || id <= 0) {
      throw new HomeNotFoundError();
    }
    const now = new Date();
    const updates: Partial<typeof homeSectionPlacements.$inferInsert> = {
      updatedAt: now,
    };
    if (patch.entityType !== undefined) updates.entityType = patch.entityType;
    if (patch.entityId !== undefined) updates.entityId = patch.entityId;
    if (patch.titleOverride !== undefined) updates.titleOverride = patch.titleOverride;
    if (patch.subtitleOverride !== undefined) updates.subtitleOverride = patch.subtitleOverride;
    if (patch.badgeText !== undefined) updates.badgeText = patch.badgeText;
    if (patch.imageUrl !== undefined) updates.imageUrl = patch.imageUrl;
    if (patch.ctaHref !== undefined) updates.ctaHref = patch.ctaHref;
    if (patch.orderIndex !== undefined) updates.orderIndex = patch.orderIndex;
    if (patch.isActive !== undefined) updates.isActive = patch.isActive;

    try {
      const rows = await db
        .update(homeSectionPlacements)
        .set(updates)
        .where(eq(homeSectionPlacements.id, id))
        .returning();
      if (rows.length === 0) {
        throw new HomeNotFoundError();
      }
      return toAdmin(rows[0]);
    } catch (error) {
      if (error instanceof HomeNotFoundError) throw error;
      if (isUniqueViolation(error)) {
        throw new HomeConflictError('Conflito de unique (section, entity_type, entity_id)');
      }
      throw error;
    }
  }

  static async deleteItem(id: number) {
    if (!Number.isFinite(id) || id <= 0) {
      throw new HomeNotFoundError();
    }
    const rows = await db
      .delete(homeSectionPlacements)
      .where(eq(homeSectionPlacements.id, id))
      .returning({ id: homeSectionPlacements.id });
    if (rows.length === 0) {
      throw new HomeNotFoundError();
    }
  }
}
