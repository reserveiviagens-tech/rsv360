import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const politicaDescontoParceiro = pgTable('politica_desconto_parceiro', {
  id: serial('id').primaryKey(),
  scope: varchar('scope', { length: 32 }).notNull().default('global'),
  scopeId: varchar('scope_id', { length: 64 }),
  maxDescontoPercentual: numeric('max_desconto_percentual', { precision: 5, scale: 2 })
    .notNull()
    .default('0'),
  maxDescontoAbsoluto: numeric('max_desconto_absoluto', { precision: 12, scale: 2 }),
  rolesPermitidos: jsonb('roles_permitidos').notNull().default(['corretor', 'agente', 'promotor']),
  ativo: boolean('ativo').notNull().default(true),
  updatedBy: integer('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const politicaDescontoAudit = pgTable('politica_desconto_audit', {
  id: serial('id').primaryKey(),
  acomodacaoId: integer('acomodacao_id'),
  actorUserId: integer('actor_user_id'),
  actorRole: varchar('actor_role', { length: 40 }),
  action: varchar('action', { length: 40 }).notNull(),
  percentual: numeric('percentual', { precision: 5, scale: 2 }),
  precoAntes: numeric('preco_antes', { precision: 12, scale: 2 }),
  precoDepois: numeric('preco_depois', { precision: 12, scale: 2 }),
  datas: jsonb('datas'),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type PoliticaDescontoParceiro = typeof politicaDescontoParceiro.$inferSelect;
