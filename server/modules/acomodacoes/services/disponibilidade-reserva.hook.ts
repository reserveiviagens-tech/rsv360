/**
 * Fase 2 — anti-overbooking por data (disponibilidade_acomodacao).
 * Tabela vazia = todas as diárias livres (zero regressão).
 * Também aplica regras de estadia da unidade (min/max, antecedência, cutoff, dias).
 */
import { and, eq, sql } from 'drizzle-orm';
import { countWizardNights } from '@rsv360/shared';
import { db } from '../../../lib/db';
import { acomodacoes } from '../../../../backend/src/db/schema/acomodacoes';
import { disponibilidadeAcomodacao } from '../../../../backend/src/db/schema/disponibilidade-acomodacao';
import {
  normalizeMinNoitesPorCheckin,
  parseWeekdayList,
  validarRegrasEstadiaAcomodacao,
} from './host-pricing.helpers';

type ReservaTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type RunReservaTransaction = <T>(
  fn: (tx: ReservaTransaction) => Promise<T>,
) => Promise<T>;

export class DisponibilidadeReservaConflictError extends Error {
  readonly statusCode = 409;

  constructor(
    public readonly acomodacaoId: number,
    public readonly datasIndisponiveis: string[],
  ) {
    super('Unidade indisponível nas datas solicitadas');
    this.name = 'DisponibilidadeReservaConflictError';
  }
}

export class RegrasEstadiaAcomodacaoError extends Error {
  readonly statusCode = 400;
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'RegrasEstadiaAcomodacaoError';
    this.code = code;
  }
}

export function listDiariasEstadia(checkIn: string, checkOut: string): string[] {
  const nights = countWizardNights(checkIn, checkOut);
  if (nights <= 0) return [];

  const dates: string[] = [];
  for (let i = 0; i < nights; i++) {
    const d = new Date(`${checkIn}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export async function isDataBloqueada(acomodacaoId: number, data: string): Promise<boolean> {
  const [row] = await db
    .select()
    .from(disponibilidadeAcomodacao)
    .where(
      and(
        eq(disponibilidadeAcomodacao.acomodacaoId, acomodacaoId),
        eq(disponibilidadeAcomodacao.data, data),
      ),
    )
    .limit(1);

  if (!row) return false;
  return row.disponivel === false;
}

function metadataFlag(meta: unknown, key: string, defaultValue: boolean): boolean {
  if (meta == null || typeof meta !== 'object' || Array.isArray(meta)) return defaultValue;
  const v = (meta as Record<string, unknown>)[key];
  if (typeof v === 'boolean') return v;
  return defaultValue;
}

export async function assertRegrasEstadiaAcomodacao(
  acomodacaoId: number,
  checkIn: string,
  checkOut: string,
  now: Date = new Date(),
): Promise<void> {
  const [unit] = await db
    .select({
      minNoites: acomodacoes.minNoites,
      maxNoites: acomodacoes.maxNoites,
      minNoitesPorCheckin: acomodacoes.minNoitesPorCheckin,
      antecedenciaDias: acomodacoes.antecedenciaDias,
      avisoPrevioMesmoDia: acomodacoes.avisoPrevioMesmoDia,
      periodoDisponibilidadeMeses: acomodacoes.periodoDisponibilidadeMeses,
      checkinDiasPermitidos: acomodacoes.checkinDiasPermitidos,
      checkoutDiasPermitidos: acomodacoes.checkoutDiasPermitidos,
      metadata: acomodacoes.metadata,
    })
    .from(acomodacoes)
    .where(eq(acomodacoes.id, acomodacaoId))
    .limit(1);

  if (!unit) {
    throw new RegrasEstadiaAcomodacaoError('not_found', 'Unidade não encontrada.');
  }

  const minNoites = Number(unit.minNoites ?? 1) || 1;
  const result = validarRegrasEstadiaAcomodacao(
    checkIn,
    checkOut,
    {
      minNoites,
      maxNoites: Number(unit.maxNoites ?? 30) || 30,
      minNoitesPorCheckin: normalizeMinNoitesPorCheckin(unit.minNoitesPorCheckin, minNoites),
      antecedenciaDias: Number(unit.antecedenciaDias ?? 0) || 0,
      avisoPrevioMesmoDia: unit.avisoPrevioMesmoDia,
      permitirPedidosMesmoDia: metadataFlag(unit.metadata, 'permitirPedidosMesmoDia', true),
      periodoDisponibilidadeMeses: Number(unit.periodoDisponibilidadeMeses ?? 12) || 12,
      checkinDiasPermitidos: parseWeekdayList(unit.checkinDiasPermitidos),
      checkoutDiasPermitidos: parseWeekdayList(unit.checkoutDiasPermitidos),
    },
    now,
  );

  if (result.ok === false) {
    throw new RegrasEstadiaAcomodacaoError(result.code, result.message);
  }
}

export async function verificarDisponibilidadeReserva(
  acomodacaoId: number,
  checkIn: string,
  checkOut: string,
): Promise<{ ok: true } | { ok: false; datasIndisponiveis: string[] }> {
  const datasIndisponiveis: string[] = [];
  for (const data of listDiariasEstadia(checkIn, checkOut)) {
    if (await isDataBloqueada(acomodacaoId, data)) {
      datasIndisponiveis.push(data);
    }
  }
  if (datasIndisponiveis.length > 0) {
    return { ok: false, datasIndisponiveis };
  }
  return { ok: true };
}

export async function assertDisponibilidadeReserva(
  acomodacaoId: number,
  checkIn: string,
  checkOut: string,
): Promise<void> {
  await assertRegrasEstadiaAcomodacao(acomodacaoId, checkIn, checkOut);
  const result = await verificarDisponibilidadeReserva(acomodacaoId, checkIn, checkOut);
  if (result.ok === false) {
    throw new DisponibilidadeReservaConflictError(acomodacaoId, result.datasIndisponiveis);
  }
}

export async function marcarDiariasReservadas(
  acomodacaoId: number,
  checkIn: string,
  checkOut: string,
): Promise<void> {
  for (const data of listDiariasEstadia(checkIn, checkOut)) {
    const [existente] = await db
      .select()
      .from(disponibilidadeAcomodacao)
      .where(
        and(
          eq(disponibilidadeAcomodacao.acomodacaoId, acomodacaoId),
          eq(disponibilidadeAcomodacao.data, data),
        ),
      )
      .limit(1);

    if (existente) {
      await db
        .update(disponibilidadeAcomodacao)
        .set({
          disponivel: false,
          observacao: 'reservado',
          atualizadoEm: new Date(),
        })
        .where(eq(disponibilidadeAcomodacao.id, existente.id));
    } else {
      await db.insert(disponibilidadeAcomodacao).values({
        acomodacaoId,
        data,
        disponivel: false,
        observacao: 'reservado',
      });
    }
  }
}

/**
 * PR-11d — hard-hold at proposal acceptance.
 *
 * Missing calendar rows cannot be protected with FOR UPDATE. Transaction-scoped
 * advisory locks serialize the same accommodation+nights, then an atomic upsert
 * claims each night. Any conflict throws and rolls the whole transaction back,
 * including the caller's proposal-status CAS.
 */
export async function comHoldReservaAtomico<T>(
  acomodacaoId: number,
  checkIn: string,
  checkOut: string,
  onClaimed: (tx: ReservaTransaction) => Promise<T>,
  runInTransaction: RunReservaTransaction = (fn) => db.transaction(fn),
): Promise<T> {
  await assertRegrasEstadiaAcomodacao(acomodacaoId, checkIn, checkOut);

  const datas = [...listDiariasEstadia(checkIn, checkOut)].sort();

  return runInTransaction(async (tx) => {
    for (const data of datas) {
      const lockKey = `rsv360:proposta-hold:v1:${acomodacaoId}:${data}`;
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
      );
    }

    for (const data of datas) {
      const claimed = await tx.execute(sql`
        INSERT INTO disponibilidade_acomodacao
          (acomodacao_id, data, disponivel, observacao, atualizado_em)
        VALUES
          (${acomodacaoId}, ${data}, false, 'reservado', CURRENT_TIMESTAMP)
        ON CONFLICT (acomodacao_id, data) DO UPDATE
        SET disponivel = false,
            observacao = 'reservado',
            atualizado_em = CURRENT_TIMESTAMP
        WHERE disponibilidade_acomodacao.disponivel = true
        RETURNING data
      `);

      if (claimed.rows.length === 0) {
        throw new DisponibilidadeReservaConflictError(acomodacaoId, [data]);
      }
    }

    return onClaimed(tx);
  });
}

module.exports = {
  DisponibilidadeReservaConflictError,
  RegrasEstadiaAcomodacaoError,
  listDiariasEstadia,
  isDataBloqueada,
  assertRegrasEstadiaAcomodacao,
  verificarDisponibilidadeReserva,
  assertDisponibilidadeReserva,
  marcarDiariasReservadas,
  comHoldReservaAtomico,
};
