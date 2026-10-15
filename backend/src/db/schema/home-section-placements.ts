import {
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

/** Seções da home S1 (www.reserveiviagens.com.br). */
export const HOME_SECTIONS = ['hero', 'escolhas', 'destinos', 'ofertas', 'tempo'] as const;
export type HomeSection = (typeof HOME_SECTIONS)[number];

export const HOME_ENTITY_TYPES = [
  'promotion',
  'enterprise',
  'park',
  'attraction',
  'combo',
] as const;
export type HomeEntityType = (typeof HOME_ENTITY_TYPES)[number];

export const homeSectionPlacements = pgTable(
  'home_section_placements',
  {
    id: serial('id').primaryKey(),
    section: varchar('section', { length: 32 }).notNull(),
    entityType: varchar('entity_type', { length: 32 }).notNull(),
    entityId: varchar('entity_id', { length: 128 }).notNull(),
    titleOverride: varchar('title_override', { length: 255 }),
    subtitleOverride: varchar('subtitle_override', { length: 512 }),
    badgeText: varchar('badge_text', { length: 64 }),
    imageUrl: varchar('image_url', { length: 1024 }),
    ctaHref: varchar('cta_href', { length: 512 }),
    orderIndex: integer('order_index').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => ({
    sectionEntityUnique: uniqueIndex('home_section_placements_section_entity_unique').on(
      t.section,
      t.entityType,
      t.entityId,
    ),
    sectionActiveIdx: index('home_section_placements_section_active_idx').on(
      t.section,
      t.isActive,
      t.orderIndex,
    ),
  }),
);

export type HomeSectionPlacement = typeof homeSectionPlacements.$inferSelect;
export type NewHomeSectionPlacement = typeof homeSectionPlacements.$inferInsert;
