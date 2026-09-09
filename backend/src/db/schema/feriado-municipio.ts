import { char, integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

/** Recurring municipal holidays (MM-DD) from offline FeriadosAPI dump. */
export const feriadoMunicipio = pgTable('feriado_municipio', {
  id: serial('id').primaryKey(),
  ibgeCodigo: varchar('ibge_codigo', { length: 7 }).notNull(),
  uf: char('uf', { length: 2 }).notNull(),
  municipio: text('municipio').notNull(),
  municipioNorm: text('municipio_norm').notNull(),
  md: char('md', { length: 5 }).notNull(),
  nome: text('nome').notNull(),
  tipo: varchar('tipo', { length: 16 }).notNull().default('municipal'),
  fonte: varchar('fonte', { length: 32 }).notNull().default('feriadosapi'),
  anoReferencia: integer('ano_referencia'),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).defaultNow(),
});

export const feriadoImportCheckpoint = pgTable('feriado_import_checkpoint', {
  id: serial('id').primaryKey(),
  fonte: varchar('fonte', { length: 32 }).notNull().default('feriadosapi'),
  ibgeCodigo: varchar('ibge_codigo', { length: 7 }).notNull(),
  ano: integer('ano').notNull(),
  status: varchar('status', { length: 16 }).notNull().default('ok'),
  detalhes: text('detalhes'),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).defaultNow(),
});
