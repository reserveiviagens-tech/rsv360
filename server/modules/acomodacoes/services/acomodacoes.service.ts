import { and, asc, desc, eq, gte, inArray, or, sql } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { acomodacoes } from '../../../../backend/src/db/schema/acomodacoes';
import { disponibilidadeAcomodacao } from '../../../../backend/src/db/schema/disponibilidade-acomodacao';
import { wizardAddons } from '../../../../backend/src/db/schema/wizard-addons';
import { tiposAcomodacao } from '../../../../backend/src/db/schema/tipos-acomodacao';
import type { AcomodacaoDisponivel } from '@rsv360/shared';
import { isPremiumAncora, parseUpgradeVarandaMeta } from '@rsv360/shared';
import { tarifaService } from './tarifa.service';
import {
  filtrarIdsAcomodacaoCalendarioLivre,
  listarDiariasPeriodoWizard,
} from './listar-disponiveis-calendario.util';
import {
  isValidListingSlug,
  normalizeListingSlug,
  resolveModoReserva,
} from './listing-slug.util';
import { normalizeMidia } from './anfitriao-midia.util';

export interface ListarAcomodacoesInput {
  hotelId: string;
  hospedes: number;
  page?: number;
  pageSize?: number;
  /** Data para resolução tarifária (YYYY-MM-DD); default hoje UTC */
  dataReferencia?: string;
  categoriaSlug?: string;
  checkIn?: string;
  checkOut?: string;
}

function rowToDisponivel(row: typeof acomodacoes.$inferSelect): AcomodacaoDisponivel {
  const upgrade = parseUpgradeVarandaMeta(row.metadata);
  return {
    id: row.id,
    codigoExterno: row.codigoExterno ?? undefined,
    titulo: row.titulo,
    quartos: row.quartos,
    configSala: row.configSala as AcomodacaoDisponivel['configSala'],
    configBanheiro: row.configBanheiro as AcomodacaoDisponivel['configBanheiro'],
    capacidadeMax: row.capacidadeMax,
    precoDiaria: Number(row.precoDiaria ?? 0),
    hotelId: row.hotelId,
    disponivel: row.capacidadeMax >= 0,
    upgradeVarandaDisponivel: upgrade.disponivel,
    upgradeVarandaValor: upgrade.valor,
    premiumAncora: isPremiumAncora(row.metadata),
  };
}

async function applyTarifaToDisponivel(
  base: AcomodacaoDisponivel,
  rowId: number,
  dataRef: string,
  categoria: string,
): Promise<AcomodacaoDisponivel> {
  try {
    const tarifa = await tarifaService.resolverTarifa({
      acomodacaoId: rowId,
      data: dataRef,
      categoriaSlug: categoria,
    });
    if (tarifa.motorAtivo && tarifa.precoFinal !== tarifa.precoBase) {
      return { ...base, precoDiaria: tarifa.precoFinal };
    }
  } catch {
    // mantém preco_diaria base
  }
  return base;
}

async function rowsToDisponiveis(
  rows: (typeof acomodacoes.$inferSelect)[],
  dataRef: string,
  categoria: string,
): Promise<AcomodacaoDisponivel[]> {
  const items: AcomodacaoDisponivel[] = [];
  for (const row of rows) {
    const base = rowToDisponivel(row);
    items.push(await applyTarifaToDisponivel(base, row.id, dataRef, categoria));
  }
  return items;
}

/** Pins Etapa A fora da página corrente — merge sem duplicar id na montagem de cards. */
export function mergeDisponiveisParaCards(
  pagina: AcomodacaoDisponivel[],
  pins: AcomodacaoDisponivel[],
): AcomodacaoDisponivel[] {
  const byId = new Map<number, AcomodacaoDisponivel>();
  for (const item of pins) byId.set(item.id, item);
  for (const item of pagina) byId.set(item.id, item);
  return [...byId.values()];
}

async function resolverIdsComFiltroCalendario(
  hotelId: string,
  checkIn?: string,
  checkOut?: string,
): Promise<number[] | null> {
  if (!checkIn || !checkOut) return null;

  const diarias = listarDiariasPeriodoWizard(checkIn, checkOut);
  if (diarias.length === 0) return [];

  const baseConditions = and(
    eq(acomodacoes.hotelId, hotelId),
    eq(acomodacoes.ativo, true),
    eq(acomodacoes.statusPublicacao, 'publicado'),
  );

  const candidates = await db
    .select({ id: acomodacoes.id })
    .from(acomodacoes)
    .where(baseConditions);

  const candidateIds = candidates.map((c: { id: number }) => c.id);
  if (candidateIds.length === 0) return [];

  const rows = await db
    .select({
      acomodacaoId: disponibilidadeAcomodacao.acomodacaoId,
      data: disponibilidadeAcomodacao.data,
      disponivel: disponibilidadeAcomodacao.disponivel,
      observacao: disponibilidadeAcomodacao.observacao,
    })
    .from(disponibilidadeAcomodacao)
    .where(
      and(
        inArray(disponibilidadeAcomodacao.acomodacaoId, candidateIds),
        inArray(disponibilidadeAcomodacao.data, diarias),
        or(
          eq(disponibilidadeAcomodacao.disponivel, false),
          eq(disponibilidadeAcomodacao.observacao, 'reservado'),
          eq(disponibilidadeAcomodacao.observacao, 'bloqueado'),
        ),
      ),
    );

  return filtrarIdsAcomodacaoCalendarioLivre(candidateIds, diarias, rows);
}

export const acomodacoesService = {
  async listarDisponiveis(input: ListarAcomodacoesInput) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
    const offset = (page - 1) * pageSize;

    const eligibleIds = await resolverIdsComFiltroCalendario(
      input.hotelId,
      input.checkIn,
      input.checkOut,
    );

    if (eligibleIds !== null && eligibleIds.length === 0) {
      return { items: [], total: 0, page, pageSize };
    }

    const conditions = and(
      eq(acomodacoes.hotelId, input.hotelId),
      eq(acomodacoes.ativo, true),
      eq(acomodacoes.statusPublicacao, 'publicado'),
      eligibleIds !== null ? inArray(acomodacoes.id, eligibleIds) : undefined,
    );

    const [rows, countRow] = await Promise.all([
      db
        .select()
        .from(acomodacoes)
        .where(conditions)
        .orderBy(desc(acomodacoes.capacidadeMax), asc(acomodacoes.precoDiaria))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(acomodacoes)
        .where(conditions),
    ]);

    const total = countRow[0]?.count ?? 0;
    const dataRef =
      input.dataReferencia ?? new Date().toISOString().slice(0, 10);
    const categoria = input.categoriaSlug ?? 'padrao';
    const items = await rowsToDisponiveis(rows, dataRef, categoria);

    return { items, total, page, pageSize };
  },

  /**
   * Unidades pinadas Etapa A (query separada, sem paginação) para montagem de cards.
   * Respeita publicado/ativo, hotel e capacidade mínima para hóspedes.
   */
  async listarPinsPublicadosPorCodigo(input: {
    hotelId: string;
    codigosExternos: readonly string[];
    hospedes: number;
    dataReferencia?: string;
    categoriaSlug?: string;
    checkIn?: string;
    checkOut?: string;
  }): Promise<AcomodacaoDisponivel[]> {
    const codigos = [...new Set(input.codigosExternos.filter(Boolean))];
    if (codigos.length === 0) return [];

    const hospedes = Math.max(1, Number(input.hospedes) || 1);
    const dataRef = input.dataReferencia ?? new Date().toISOString().slice(0, 10);
    const categoria = input.categoriaSlug ?? 'padrao';

    const eligibleIds = await resolverIdsComFiltroCalendario(
      input.hotelId,
      input.checkIn,
      input.checkOut,
    );

    if (eligibleIds !== null && eligibleIds.length === 0) return [];

    const rows = await db
      .select()
      .from(acomodacoes)
      .where(
        and(
          eq(acomodacoes.hotelId, input.hotelId),
          eq(acomodacoes.ativo, true),
          eq(acomodacoes.statusPublicacao, 'publicado'),
          inArray(acomodacoes.codigoExterno, codigos),
          gte(acomodacoes.capacidadeMax, hospedes),
          eligibleIds !== null ? inArray(acomodacoes.id, eligibleIds) : undefined,
        ),
      );

    return rowsToDisponiveis(rows, dataRef, categoria);
  },

  async findById(id: number) {
    const [row] = await db.select().from(acomodacoes).where(eq(acomodacoes.id, id)).limit(1);
    return row ?? null;
  },

  async slugPersonalizadoEmUso(slug: string, exceptId?: number): Promise<boolean> {
    const normalized = normalizeListingSlug(slug);
    if (!normalized || !isValidListingSlug(normalized)) return false;
    const rows = await db
      .select({ id: acomodacoes.id })
      .from(acomodacoes)
      .where(
        and(
          sql`lower(coalesce(${acomodacoes.metadata}->>'slugPersonalizado','')) = ${normalized}`,
          exceptId != null ? sql`${acomodacoes.id} <> ${exceptId}` : undefined,
        ),
      )
      .limit(1);
    return rows.length > 0;
  },

  /**
   * Public listing card by personalized slug (published + active only).
   * No PII / wifi / internal host fields.
   */
  async obterPublicoPorSlug(slugRaw: string) {
    const slug = normalizeListingSlug(slugRaw);
    if (!slug || !isValidListingSlug(slug)) return null;

    const [row] = await db
      .select()
      .from(acomodacoes)
      .where(
        and(
          eq(acomodacoes.ativo, true),
          eq(acomodacoes.statusPublicacao, 'publicado'),
          sql`lower(coalesce(${acomodacoes.metadata}->>'slugPersonalizado','')) = ${slug}`,
        ),
      )
      .limit(1);

    if (!row) return null;

    const meta =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    const midia = normalizeMidia(row.midia);
    const desc =
      meta.descricaoDetalhada &&
      typeof meta.descricaoDetalhada === 'object' &&
      !Array.isArray(meta.descricaoDetalhada)
        ? (meta.descricaoDetalhada as Record<string, unknown>)
        : {};
    const loc =
      meta.localizacao && typeof meta.localizacao === 'object' && !Array.isArray(meta.localizacao)
        ? (meta.localizacao as Record<string, unknown>)
        : {};
    const ver =
      meta.verificacaoLocal &&
      typeof meta.verificacaoLocal === 'object' &&
      !Array.isArray(meta.verificacaoLocal)
        ? (meta.verificacaoLocal as Record<string, unknown>)
        : {};

    return {
      id: row.id,
      slug,
      titulo: row.titulo,
      hotelId: row.hotelId,
      precoDiaria: row.precoDiaria != null ? Number(row.precoDiaria) : null,
      capacidadeMax: row.capacidadeMax,
      quartos: row.quartos,
      amenidades: row.amenidades,
      midia: {
        capa: midia.capa,
        fotos: midia.fotos.slice(0, 24),
      },
      descricao: typeof desc.anuncio === 'string' ? desc.anuncio : null,
      localizacao: {
        bairro: typeof loc.bairro === 'string' ? loc.bairro : null,
        cidade: typeof loc.cidade === 'string' ? loc.cidade : null,
        uf: typeof loc.uf === 'string' ? loc.uf : null,
        mostrarExata: Boolean(loc.mostrarExata),
        endereco: loc.mostrarExata && typeof loc.endereco === 'string' ? loc.endereco : null,
      },
      modoReserva: resolveModoReserva(meta.modoReserva),
      localVerificado: ver.status === 'aprovado',
      mensagemPreReserva:
        typeof meta.mensagemPreReserva === 'string' ? meta.mensagemPreReserva.slice(0, 400) : null,
    };
  },

  async listarAddons(escopo = 'hotel') {
    return db
      .select()
      .from(wizardAddons)
      .where(and(eq(wizardAddons.ativo, true), eq(wizardAddons.escopo, escopo)))
      .orderBy(asc(wizardAddons.ordem));
  },

  async listarTipos() {
    return db
      .select()
      .from(tiposAcomodacao)
      .where(eq(tiposAcomodacao.ativo, true))
      .orderBy(asc(tiposAcomodacao.ordem));
  },

  async criarTipo(data: { slug: string; nome: string; icone?: string; ordem?: number }) {
    const [row] = await db.insert(tiposAcomodacao).values(data).returning();
    return row;
  },

  async atualizarTipo(id: number, data: Partial<{ nome: string; icone: string; ativo: boolean; ordem: number }>) {
    const [row] = await db.update(tiposAcomodacao).set(data).where(eq(tiposAcomodacao.id, id)).returning();
    return row ?? null;
  },

  async criarAddon(data: {
    nome: string;
    descricao?: string;
    precoTipo: string;
    valor: string;
    escopo?: string;
    requerConfigBanheiro?: string;
    ordem?: number;
  }) {
    const [row] = await db.insert(wizardAddons).values(data).returning();
    return row;
  },

  async atualizarAddon(
    id: number,
    data: Partial<{
      nome: string;
      descricao: string;
      precoTipo: string;
      valor: string;
      ativo: boolean;
      ordem: number;
    }>,
  ) {
    const [row] = await db.update(wizardAddons).set(data).where(eq(wizardAddons.id, id)).returning();
    return row ?? null;
  },

  async excluirAddon(id: number) {
    const [row] = await db
      .update(wizardAddons)
      .set({ ativo: false })
      .where(eq(wizardAddons.id, id))
      .returning();
    return row ?? null;
  },
};
