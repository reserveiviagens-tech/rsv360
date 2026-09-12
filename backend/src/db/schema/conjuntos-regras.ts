import { integer, jsonb, numeric, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import { acomodacoes } from './acomodacoes';

export const conjuntosRegras = pgTable('conjuntos_regras', {
  id: varchar('id', { length: 64 }).primaryKey(),
  acomodacaoId: integer('acomodacao_id')
    .notNull()
    .references(() => acomodacoes.id, { onDelete: 'cascade' }),
  nome: varchar('nome', { length: 60 }).notNull(),
  cor: varchar('cor', { length: 20 }).notNull().default('slate'),
  precoPorNoite: numeric('preco_por_noite', { precision: 12, scale: 2 }),
  ajustePct: numeric('ajuste_pct', { precision: 5, scale: 2 }),
  minNoites: integer('min_noites'),
  maxNoites: integer('max_noites'),
  checkinDiasBloqueados: jsonb('checkin_dias_bloqueados').$type<number[]>(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
});

export type ConjuntoRegrasRow = typeof conjuntosRegras.$inferSelect;
export type NewConjuntoRegrasRow = typeof conjuntosRegras.$inferInsert;
