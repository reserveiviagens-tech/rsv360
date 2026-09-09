import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { tiposAcomodacao } from './tipos-acomodacao';
import { users } from './existing';

export const acomodacoes = pgTable('acomodacoes', {
  id: serial('id').primaryKey(),
  hotelId: text('hotel_id').notNull(),
  proprietarioId: integer('proprietario_id').references(() => users.id),
  tipoId: integer('tipo_id').references(() => tiposAcomodacao.id),
  titulo: varchar('titulo', { length: 255 }).notNull(),
  quartos: integer('quartos').notNull().default(1),
  configSala: text('config_sala').notNull().default('nenhum'),
  configBanheiro: text('config_banheiro').notNull().default('so_wc_social'),
  capacidadeMax: integer('capacidade_max').notNull(),
  capacidadeBase: integer('capacidade_base'),
  precoDiaria: numeric('preco_diaria', { precision: 12, scale: 2 }),
  precoFimSemana: numeric('preco_fim_semana', { precision: 12, scale: 2 }),
  minNoites: integer('min_noites').notNull().default(1),
  maxNoites: integer('max_noites').notNull().default(30),
  minNoitesPorCheckin: jsonb('min_noites_por_checkin'),
  antecedenciaDias: integer('antecedencia_dias').notNull().default(0),
  avisoPrevioMesmoDia: varchar('aviso_previo_mesmo_dia', { length: 5 }),
  descontoSemanalPct: numeric('desconto_semanal_pct', { precision: 5, scale: 2 }).notNull().default('0'),
  descontoMensalPct: numeric('desconto_mensal_pct', { precision: 5, scale: 2 }).notNull().default('0'),
  taxaLimpeza: numeric('taxa_limpeza', { precision: 12, scale: 2 }),
  taxaPet: numeric('taxa_pet', { precision: 12, scale: 2 }),
  taxaHospedeExtra: numeric('taxa_hospede_extra', { precision: 12, scale: 2 }),
  politicaCancelamentoCurta: varchar('politica_cancelamento_curta', { length: 40 })
    .notNull()
    .default('limitada'),
  politicaCancelamentoLonga: varchar('politica_cancelamento_longa', { length: 40 })
    .notNull()
    .default('restrita_longa'),
  opcaoNaoReembolsavel: boolean('opcao_nao_reembolsavel').notNull().default(false),
  precoInteligenteAtivo: boolean('preco_inteligente_ativo').notNull().default(false),
  precoInteligenteMin: numeric('preco_inteligente_min', { precision: 12, scale: 2 }),
  precoInteligenteMax: numeric('preco_inteligente_max', { precision: 12, scale: 2 }),
  descontoUltimaHoraPct: numeric('desconto_ultima_hora_pct', { precision: 5, scale: 2 })
    .notNull()
    .default('0'),
  descontoUltimaHoraDias: integer('desconto_ultima_hora_dias').notNull().default(3),
  descontoAntecipadaPct: numeric('desconto_antecipada_pct', { precision: 5, scale: 2 })
    .notNull()
    .default('0'),
  descontoAntecipadaDias: integer('desconto_antecipada_dias').notNull().default(30),
  descontoNovoAnuncioPct: numeric('desconto_novo_anuncio_pct', { precision: 5, scale: 2 })
    .notNull()
    .default('0'),
  descontoNovoAnuncioLimite: integer('desconto_novo_anuncio_limite').notNull().default(3),
  descontoAvaliacaoPct: numeric('desconto_avaliacao_pct', { precision: 5, scale: 2 })
    .notNull()
    .default('0'),
  descontoAvaliacaoMinNota: numeric('desconto_avaliacao_min_nota', { precision: 3, scale: 1 })
    .notNull()
    .default('4.8'),
  descontoAvaliacaoMinReviews: integer('desconto_avaliacao_min_reviews').notNull().default(3),
  tempoPreparacaoNoites: integer('tempo_preparacao_noites').notNull().default(0),
  tempoPreparacaoHoras: integer('tempo_preparacao_horas').notNull().default(0),
  periodoDisponibilidadeMeses: integer('periodo_disponibilidade_meses').notNull().default(12),
  checkinDiasPermitidos: jsonb('checkin_dias_permitidos'),
  checkoutDiasPermitidos: jsonb('checkout_dias_permitidos'),
  icalToken: varchar('ical_token', { length: 64 }),
  icalImportUrl: text('ical_import_url'),
  icalImportLastSyncAt: timestamp('ical_import_last_sync_at', { withTimezone: true }),
  icalImportLastStatus: varchar('ical_import_last_status', { length: 16 }),
  icalImportLastError: text('ical_import_last_error'),
  utensilios: jsonb('utensilios'),
  eletrodomesticos: jsonb('eletrodomesticos'),
  amenidades: jsonb('amenidades'),
  midia: jsonb('midia'),
  dadosCompletos: boolean('dados_completos').notNull().default(false),
  statusPublicacao: text('status_publicacao').notNull().default('rascunho'),
  metadata: jsonb('metadata'),
  ativo: boolean('ativo').notNull().default(true),
  codigoExterno: varchar('codigo_externo', { length: 128 }),
  codigoPms: varchar('codigo_pms', { length: 64 }),
  criadoEm: timestamp('criado_em', { withTimezone: true }).defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).defaultNow(),
});

export type Acomodacao = typeof acomodacoes.$inferSelect;
export type NovaAcomodacao = typeof acomodacoes.$inferInsert;
