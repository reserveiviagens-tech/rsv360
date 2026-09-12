import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { acomodacoes } from './acomodacoes';
import { users } from './existing';

export const coanfitriaoConvites = pgTable('coanfitriao_convites', {
  id: varchar('id', { length: 64 }).primaryKey(),
  acomodacaoId: integer('acomodacao_id')
    .notNull()
    .references(() => acomodacoes.id, { onDelete: 'cascade' }),
  nome: varchar('nome', { length: 120 }).notNull(),
  email: varchar('email', { length: 254 }).notNull(),
  papel: varchar('papel', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pendente'),
  invitedByUserId: integer('invited_by_user_id').references(() => users.id),
  token: varchar('token', { length: 64 }).notNull(),
  invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CoanfitriaoConvite = typeof coanfitriaoConvites.$inferSelect;
export type NewCoanfitriaoConvite = typeof coanfitriaoConvites.$inferInsert;
