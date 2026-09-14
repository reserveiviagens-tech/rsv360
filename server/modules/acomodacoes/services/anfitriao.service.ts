import { randomUUID } from 'crypto';
import { and, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { acomodacoes } from '../../../../backend/src/db/schema/acomodacoes';
import { coanfitriaoConvites } from '../../../../backend/src/db/schema/coanfitriao-convites';
import { conjuntosRegras } from '../../../../backend/src/db/schema/conjuntos-regras';
import { carteiraCorretor } from '../../../../backend/src/db/schema/carteira-corretor';
import {
  disponibilidadeAcomodacao,
  type DisponibilidadeAcomodacao,
} from '../../../../backend/src/db/schema/disponibilidade-acomodacao';
import { propostas, propostaChat } from '../../../../backend/src/db/schema/propostas';
import {
  buildReservedDateSet,
  deriveCalendarioEstado,
  enumerateDatesInclusive,
  estadiaSobrepoePeriodo,
  isDiaReservadoProtegido,
  maskEmail,
  maskPhone,
  OBSERVACAO_BLOQUEADO,
  OBSERVACAO_RESERVADO,
  parseEstadiaFromMetadata,
  type CalendarioDiaItem,
  type ReservaAnfitriaoItem,
} from './anfitriao-reservas.util';
import {
  midiaAddFoto,
  midiaMoveFoto,
  midiaSetCategoria,
  midiaSetCaption,
  midiaRemoveFoto,
  midiaWithCapa,
  midiaWithTrilhoThumb,
} from './anfitriao-midia.util';
import { classificarReservasHoje } from './anfitriao-hoje.util';
import {
  isValidListingSlug,
  normalizeListingSlug,
} from './listing-slug.util';
import {
  sanitizeTituloPublico,
  validateListingTitles,
} from './listing-titulo.util';
import { validateTipoPropriedade } from './listing-tipo-propriedade.util';
import { validateTiposCama } from './listing-tipos-cama.util';
import { CAPACIDADE_MAX, validateListingCapacidade } from './listing-hospedes.util';
import { validateListingDescricaoDetalhada } from './listing-descricao.util';
import { validateListingAmenidades } from './listing-comodidades.util';
import { validateListingAcessibilidade } from './listing-acessibilidade.util';
import { validateListingLocalizacao } from './listing-localizacao.util';
import { validateListingSobreAnfitriao } from './listing-sobre-anfitriao.util';
import {
  COANFITRIOES_MAX,
  COANFITRIOES_NOME_MAX,
  COANFITRIOES_PAPEIS,
  coanfitriaoMatchesEmail,
  computeInviteExpiresAt,
  findCoanfitriaoAtivoByEmail,
  isInviteExpired,
  mapConviteRowToListingCoanfitriao,
  normalizeCoanfitriaoEmail,
  normalizeCoanfitriaoTelefone,
  papelPermiteCalendario,
  papelPermiteMensagens,
  enrichMetadataWithCoanfitrioes,
  readCoanfitrioesFromMetadata,
  stripCoanfitrioesFromMetadataRecord,
  validateListingCoanfitrioes,
  type CoanfitriaoPapel,
  type ListingCoanfitriao,
} from './listing-coanfitrioes.util';
import {
  enviarConviteCoanfitriaoEmail,
  papelToLabel,
} from './coanfitriao-invite-email.service';
import { enviarConviteCoanfitriaoSms } from './coanfitriao-invite-sms.service';
import { validateListingConfigReserva } from './listing-config-reserva.util';
import { validateListingCancelamento } from './listing-cancelamento.util';
import { validateListingRegrasCasa } from './listing-regras-casa.util';
import { validateListingGuiaChegada } from './listing-guia-chegada.util';
import { validateListingSeguranca } from './listing-seguranca.util';
import { validateListingStatusAnuncio } from './listing-status-anuncio.util';
import { validateListingExigirFotoPerfil } from './listing-requisitos.util';
import { validateListingHospedagemSolidaria } from './listing-solidaria.util';
import { validateListingIdiomas } from './listing-idiomas.util';
import { validateListingGuiasLocais } from './listing-guias-locais.util';
import { validateListingImpostos } from './listing-impostos.util';
import { validateListingLeis } from './listing-leis.util';
import { validateListingCompSet } from './listing-comp-set.util';
import {
  enrichMetadataWithConjuntosRegras,
  mapConjuntoRegrasRowToConjuntoRegras,
  readConjuntosRegrasFromMetadata,
  stripConjuntosRegrasFromMetadataPatch,
  validateListingConjuntosRegras,
  type ConjuntoRegras,
} from './listing-conjuntos-regras.util';
import { buildImpostosExportCsv } from './listing-impostos-export.util';
import {
  generatePreviewToken,
  previewExpiresAtFromNow,
  resolvePreviewPublicUrl,
} from './listing-preview-token.util';
import { validateMotivoArquivar, validateMotivoDesarquivar } from './listing-arquivar.util';
import {
  ativoFilterWhere,
  resolveAtivoFilter,
  type AtivoFilter,
} from './listing-ativo-filter.util';
import {
  annotateAcessoComo,
  buildCoanfitriaoAtivoEmailScope,
  combineOwnerAndCoanfitriaoScope,
} from './anfitriao-listar-escopo.util';
import { auditoriaEstados } from '../../../../backend/src/db/schema/auditoria';
import { acomodacoesService } from './acomodacoes.service';
import {
  applyStaffVerificacaoLocalDecision,
  asVerificacaoLocalRecord,
  sanitizeVerificacaoLocalHostPatch,
} from './verificacao-local.util';

const STAFF_ROLES = new Set(['admin', 'manager']);
const PARCEIRO_ROLES = new Set(['anfitriao', 'corretor', 'agente', 'promotor']);
const BROKER_ROLES = new Set(['corretor', 'agente', 'promotor']);

export interface AuthContext {
  userId: number;
  role: string;
  email?: string;
}

function isPgUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return e?.code === '23505' || /unique/i.test(e?.message ?? '');
}

type InviteDispatchStatus = 'sent' | 'skipped' | 'failed';

function resolveInviteDispatchStatus(result: {
  ok: boolean;
  skipped?: boolean;
}): InviteDispatchStatus {
  if (result.skipped) return 'skipped';
  return result.ok ? 'sent' : 'failed';
}

export async function listCoanfitrioesFromDb(acomodacaoId: number): Promise<ListingCoanfitriao[]> {
  const rows = await db
    .select()
    .from(coanfitriaoConvites)
    .where(eq(coanfitriaoConvites.acomodacaoId, acomodacaoId))
    .orderBy(coanfitriaoConvites.invitedAt);
  return rows.map(mapConviteRowToListingCoanfitriao);
}

async function countNonRevogadoCoanfitrioesFromDb(acomodacaoId: number): Promise<number> {
  const rows = await db
    .select({ id: coanfitriaoConvites.id })
    .from(coanfitriaoConvites)
    .where(
      and(
        eq(coanfitriaoConvites.acomodacaoId, acomodacaoId),
        inArray(coanfitriaoConvites.status, ['pendente', 'ativo']),
      ),
    );
  return rows.length;
}

export async function resolveCoanfitrioesForRead(
  acomodacaoId: number,
  metadata: unknown,
): Promise<ListingCoanfitriao[]> {
  const fromDb = await listCoanfitrioesFromDb(acomodacaoId);
  if (fromDb.length > 0) return fromDb;
  return readCoanfitrioesFromMetadata(metadata);
}

/** @deprecated Use resolveCoanfitrioesForRead — same DB-first rule for RBAC and read paths. */
export const resolveCoanfitrioesForRbac = resolveCoanfitrioesForRead;

export async function listConjuntosRegrasFromDb(acomodacaoId: number): Promise<ConjuntoRegras[]> {
  const rows = await db
    .select()
    .from(conjuntosRegras)
    .where(eq(conjuntosRegras.acomodacaoId, acomodacaoId))
    .orderBy(conjuntosRegras.criadoEm);
  return rows.map(mapConjuntoRegrasRowToConjuntoRegras);
}

export async function resolveConjuntosRegrasForRead(
  acomodacaoId: number,
  metadata: unknown,
): Promise<ConjuntoRegras[]> {
  const fromDb = await listConjuntosRegrasFromDb(acomodacaoId);
  if (fromDb.length > 0) return fromDb;
  return readConjuntosRegrasFromMetadata(metadata);
}

async function syncConjuntosRegrasToDb(
  acomodacaoId: number,
  list: ConjuntoRegras[] | undefined,
): Promise<void> {
  await db.delete(conjuntosRegras).where(eq(conjuntosRegras.acomodacaoId, acomodacaoId));
  if (!list || list.length === 0) return;

  const now = new Date();
  await db.insert(conjuntosRegras).values(
    list.map((conjunto) => ({
      id: conjunto.id,
      acomodacaoId,
      nome: conjunto.nome,
      cor: conjunto.cor,
      precoPorNoite:
        conjunto.precoPorNoite != null ? String(conjunto.precoPorNoite) : null,
      ajustePct: conjunto.ajustePct != null ? String(conjunto.ajustePct) : null,
      minNoites: conjunto.minNoites ?? null,
      maxNoites: conjunto.maxNoites ?? null,
      checkinDiasBloqueados: conjunto.checkinDiasBloqueados ?? null,
      criadoEm: now,
      atualizadoEm: now,
    })),
  );
}

/**
 * Cutover: stop dual-writing coanfitrioes into acomodacoes.metadata.
 * Clears any stale metadata mirror so DB (`coanfitriao_convites`) is the write source of truth.
 * Read path still falls back to metadata when the table has no rows (pre-backfill).
 */
async function clearCoanfitrioesMetadataMirror(
  unidadeId: number,
  row: typeof acomodacoes.$inferSelect,
): Promise<void> {
  const baseMeta =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? { ...(row.metadata as Record<string, unknown>) }
      : {};
  if (!stripCoanfitrioesFromMetadataRecord(baseMeta)) {
    return;
  }
  await db
    .update(acomodacoes)
    .set({ metadata: baseMeta, atualizadoEm: new Date() })
    .where(eq(acomodacoes.id, unidadeId));
}

async function proprietariosNaCarteira(corretorId: number): Promise<number[]> {
  const rows = await db
    .select({ proprietarioId: carteiraCorretor.proprietarioId })
    .from(carteiraCorretor)
    .where(
      and(eq(carteiraCorretor.corretorId, corretorId), eq(carteiraCorretor.status, 'ativo')),
    );
  return rows.map((r: { proprietarioId: number }) => r.proprietarioId);
}

export async function podeGerenciarUnidade(
  auth: AuthContext,
  row: typeof acomodacoes.$inferSelect,
) {
  if (STAFF_ROLES.has(auth.role)) return true;
  if (auth.role === 'anfitriao') return row.proprietarioId === auth.userId;
  if (BROKER_ROLES.has(auth.role)) {
    if (row.proprietarioId === auth.userId) return true;
    const carteira = await proprietariosNaCarteira(auth.userId);
    return row.proprietarioId != null && carteira.includes(row.proprietarioId);
  }
  return false;
}

export async function podeVerUnidade(auth: AuthContext, row: typeof acomodacoes.$inferSelect) {
  if (await podeGerenciarUnidade(auth, row)) return true;
  if (auth.email) {
    const cohosts = await resolveCoanfitrioesForRbac(row.id, row.metadata);
    if (findCoanfitriaoAtivoByEmail(cohosts, auth.email)) return true;
  }
  return false;
}

export async function podeEditarCalendarioUnidade(
  auth: AuthContext,
  row: typeof acomodacoes.$inferSelect,
) {
  if (await podeGerenciarUnidade(auth, row)) return true;
  if (!auth.email) return false;
  const cohosts = await resolveCoanfitrioesForRbac(row.id, row.metadata);
  const cohost = findCoanfitriaoAtivoByEmail(cohosts, auth.email);
  return cohost != null && papelPermiteCalendario(cohost.papel);
}

export async function podeEditarMensagensUnidade(
  auth: AuthContext,
  row: typeof acomodacoes.$inferSelect,
) {
  if (await podeGerenciarUnidade(auth, row)) return true;
  if (!auth.email) return false;
  const cohosts = await resolveCoanfitrioesForRbac(row.id, row.metadata);
  const cohost = findCoanfitriaoAtivoByEmail(cohosts, auth.email);
  return cohost != null && papelPermiteMensagens(cohost.papel);
}

function escopoProprietarios(auth: AuthContext, proprietariosCarteira: number[]) {
  if (auth.role === 'anfitriao') {
    return eq(acomodacoes.proprietarioId, auth.userId);
  }
  if (BROKER_ROLES.has(auth.role)) {
    const ids = [...new Set([auth.userId, ...proprietariosCarteira])];
    return inArray(acomodacoes.proprietarioId, ids);
  }
  return sql`true`;
}

export const anfitriaoService = {
  async listarMinhas(
    auth: AuthContext,
    page = 1,
    pageSize = 20,
    opts?: { ativo?: AtivoFilter },
  ) {
    if (!PARCEIRO_ROLES.has(auth.role) && !STAFF_ROLES.has(auth.role)) {
      return { items: [], total: 0, page, pageSize };
    }

    const offset = (Math.max(1, page) - 1) * pageSize;
    const proprietariosCarteira =
      BROKER_ROLES.has(auth.role) ? await proprietariosNaCarteira(auth.userId) : [];

    const isStaff = STAFF_ROLES.has(auth.role);
    const ownerScope: SQL = isStaff
      ? sql`true`
      : escopoProprietarios(auth, proprietariosCarteira);

    let whereScope: SQL = ownerScope;
    if (!isStaff) {
      const email = normalizeCoanfitriaoEmail(auth.email);
      if (email) {
        whereScope = combineOwnerAndCoanfitriaoScope(
          ownerScope,
          buildCoanfitriaoAtivoEmailScope(email),
        );
      }
    }

    const ativoFilter = resolveAtivoFilter(opts?.ativo);
    const ativoWhere = ativoFilterWhere(ativoFilter);
    const whereClause = ativoWhere ? and(whereScope, ativoWhere) : whereScope;

    const [rows, countRow] = await Promise.all([
      db
        .select()
        .from(acomodacoes)
        .where(whereClause)
        .orderBy(desc(acomodacoes.atualizadoEm))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(acomodacoes)
        .where(whereClause),
    ]);

    let ownedIds = new Set<number>();
    if (isStaff) {
      ownedIds = new Set(rows.map((r) => r.id));
    } else if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const ownedRows = await db
        .select({ id: acomodacoes.id })
        .from(acomodacoes)
        .where(and(ownerScope, inArray(acomodacoes.id, ids)));
      ownedIds = new Set(ownedRows.map((r) => r.id));
    }

    const items = annotateAcessoComo(rows, ownedIds, isStaff);
    return { items, total: countRow[0]?.count ?? 0, page, pageSize };
  },

  async obterUnidade(
    auth: AuthContext,
    id: number,
  ): Promise<{ error: 'not_found' | 'forbidden' } | { data: typeof acomodacoes.$inferSelect }> {
    const [row] = await db.select().from(acomodacoes).where(eq(acomodacoes.id, id)).limit(1);
    if (!row) return { error: 'not_found' };
    const ok = await podeVerUnidade(auth, row);
    if (!ok) return { error: 'forbidden' };

    const conjuntos = await resolveConjuntosRegrasForRead(row.id, row.metadata);
    const coanfitrioes = await resolveCoanfitrioesForRead(row.id, row.metadata);
    let metadata = enrichMetadataWithConjuntosRegras(row.metadata, conjuntos);
    metadata = enrichMetadataWithCoanfitrioes(metadata, coanfitrioes);
    return {
      data: {
        ...row,
        metadata,
      },
    };
  },

  async atualizarUnidade(
    auth: AuthContext,
    id: number,
    patch: Partial<{
      titulo: string;
      hotelId: string;
      proprietarioId: number;
      tipoId: number;
      codigoExterno: string;
      precoDiaria: string;
      utensilios: unknown;
      eletrodomesticos: unknown;
      amenidades: unknown;
      midia: unknown;
      capacidadeMax: number;
      capacidadeBase: number | null;
      statusPublicacao: string;
      dadosCompletos: boolean;
      /** Shallow-merged into existing metadata jsonb (listing editor extensions). */
      metadata: Record<string, unknown>;
    }>,
  ) {
    const scoped = await this.obterUnidade(auth, id);
    if ('error' in scoped) return { error: scoped.error };

    const row = scoped.data;
    const {
      hotelId: _hotelId,
      proprietarioId: _proprietarioId,
      tipoId: _tipoId,
      codigoExterno: _codigoExterno,
      metadata: metadataPatch,
      ...patchPermitido
    } = patch;

    const updatingTitulo = Object.prototype.hasOwnProperty.call(patch, 'titulo');
    const updatingNomeInterno =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'nomeInterno');

    if (updatingTitulo || updatingNomeInterno) {
      const titles = validateListingTitles({
        titulo: patch.titulo,
        nomeInterno: updatingNomeInterno
          ? (metadataPatch as Record<string, unknown>).nomeInterno
          : undefined,
        updatingTitulo,
        updatingNomeInterno,
      });
      if (!titles.ok) {
        return { error: titles.error };
      }
      if (updatingTitulo) {
        patchPermitido.titulo = titles.titulo;
      }
      if (updatingNomeInterno && metadataPatch && typeof metadataPatch === 'object') {
        (metadataPatch as Record<string, unknown>).nomeInterno = titles.nomeInterno || undefined;
      }
    } else if (typeof patchPermitido.titulo === 'string') {
      patchPermitido.titulo = sanitizeTituloPublico(patchPermitido.titulo) || patchPermitido.titulo;
    }

    const updatingTipoPropriedade =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'tipoPropriedade');
    if (updatingTipoPropriedade) {
      const tipo = validateTipoPropriedade(
        (metadataPatch as Record<string, unknown>).tipoPropriedade,
      );
      if (!tipo.ok) {
        return { error: tipo.error, message: tipo.message };
      }
      (metadataPatch as Record<string, unknown>).tipoPropriedade =
        Object.keys(tipo.value).length > 0 ? tipo.value : undefined;
    }

    const updatingTiposCama =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'tiposCama');
    if (updatingTiposCama) {
      const camas = validateTiposCama((metadataPatch as Record<string, unknown>).tiposCama);
      if (!camas.ok) {
        return { error: camas.error, message: camas.message };
      }
      (metadataPatch as Record<string, unknown>).tiposCama =
        Object.keys(camas.value).length > 0 ? camas.value : undefined;
    }

    const updatingDescricao =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'descricaoDetalhada');
    if (updatingDescricao) {
      const desc = validateListingDescricaoDetalhada(
        (metadataPatch as Record<string, unknown>).descricaoDetalhada,
      );
      if (!desc.ok) {
        return { error: desc.error, message: desc.message };
      }
      (metadataPatch as Record<string, unknown>).descricaoDetalhada =
        Object.keys(desc.value).length > 0 ? desc.value : undefined;
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'amenidades')) {
      const amen = validateListingAmenidades(patch.amenidades);
      if (!amen.ok) {
        return { error: amen.error, message: amen.message };
      }
      patchPermitido.amenidades = amen.value;
    }

    const updatingAcessibilidade =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'acessibilidade');
    if (updatingAcessibilidade) {
      const acc = validateListingAcessibilidade(
        (metadataPatch as Record<string, unknown>).acessibilidade,
      );
      if (!acc.ok) {
        return { error: acc.error, message: acc.message };
      }
      (metadataPatch as Record<string, unknown>).acessibilidade =
        acc.value.length > 0 ? acc.value : undefined;
    }

    const updatingLocalizacao =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'localizacao');
    if (updatingLocalizacao) {
      const loc = validateListingLocalizacao(
        (metadataPatch as Record<string, unknown>).localizacao,
      );
      if (!loc.ok) {
        return { error: loc.error, message: loc.message };
      }
      const empty = Object.keys(loc.value).length === 0;
      (metadataPatch as Record<string, unknown>).localizacao = empty ? undefined : loc.value;
    }

    const updatingSobreAnfitriao =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'sobreAnfitriao');
    if (updatingSobreAnfitriao) {
      const sobre = validateListingSobreAnfitriao(
        (metadataPatch as Record<string, unknown>).sobreAnfitriao,
      );
      if (!sobre.ok) {
        return { error: sobre.error, message: sobre.message };
      }
      const empty = Object.keys(sobre.value).length === 0;
      (metadataPatch as Record<string, unknown>).sobreAnfitriao = empty ? undefined : sobre.value;
    }

    const updatingCoanfitrioes =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'coanfitrioes');
    if (updatingCoanfitrioes) {
      return {
        error: 'use_dedicated_endpoints' as const,
        message: 'Use endpoints de coanfitriões',
      };
    }

    const updatingConfigReserva =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      (Object.prototype.hasOwnProperty.call(metadataPatch, 'modoReserva') ||
        Object.prototype.hasOwnProperty.call(metadataPatch, 'exigirBomHistorico') ||
        Object.prototype.hasOwnProperty.call(metadataPatch, 'mensagemPreReserva'));
    if (updatingConfigReserva) {
      const meta = metadataPatch as Record<string, unknown>;
      const input: Record<string, unknown> = {};
      if (Object.prototype.hasOwnProperty.call(meta, 'modoReserva')) {
        input.modoReserva = meta.modoReserva;
      }
      if (Object.prototype.hasOwnProperty.call(meta, 'exigirBomHistorico')) {
        input.exigirBomHistorico = meta.exigirBomHistorico;
      }
      if (Object.prototype.hasOwnProperty.call(meta, 'mensagemPreReserva')) {
        input.mensagemPreReserva = meta.mensagemPreReserva;
      }
      const config = validateListingConfigReserva(input);
      if (!config.ok) {
        return { error: config.error, message: config.message };
      }
      if (Object.prototype.hasOwnProperty.call(meta, 'modoReserva')) {
        meta.modoReserva = config.value.modoReserva;
      }
      if (
        Object.prototype.hasOwnProperty.call(meta, 'exigirBomHistorico') ||
        config.value.modoReserva === 'aprovar'
      ) {
        meta.exigirBomHistorico = config.value.exigirBomHistorico;
      }
      if (Object.prototype.hasOwnProperty.call(meta, 'mensagemPreReserva')) {
        meta.mensagemPreReserva = config.value.mensagemPreReserva ?? undefined;
      }
    }

    const updatingCancelamento =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      (Object.prototype.hasOwnProperty.call(metadataPatch, 'politicaCancelamentoCurta') ||
        Object.prototype.hasOwnProperty.call(metadataPatch, 'politicaCancelamentoLonga') ||
        Object.prototype.hasOwnProperty.call(metadataPatch, 'opcaoNaoReembolsavel'));
    if (updatingCancelamento) {
      const meta = metadataPatch as Record<string, unknown>;
      const input: Record<string, unknown> = {};
      if (Object.prototype.hasOwnProperty.call(meta, 'politicaCancelamentoCurta')) {
        input.politicaCancelamentoCurta = meta.politicaCancelamentoCurta;
      }
      if (Object.prototype.hasOwnProperty.call(meta, 'politicaCancelamentoLonga')) {
        input.politicaCancelamentoLonga = meta.politicaCancelamentoLonga;
      }
      if (Object.prototype.hasOwnProperty.call(meta, 'opcaoNaoReembolsavel')) {
        input.opcaoNaoReembolsavel = meta.opcaoNaoReembolsavel;
      }
      const cancelamento = validateListingCancelamento(input);
      if (!cancelamento.ok) {
        return { error: cancelamento.error, message: cancelamento.message };
      }
      if (Object.prototype.hasOwnProperty.call(meta, 'politicaCancelamentoCurta')) {
        meta.politicaCancelamentoCurta = cancelamento.value.politicaCancelamentoCurta;
        (patchPermitido as Record<string, unknown>).politicaCancelamentoCurta =
          cancelamento.value.politicaCancelamentoCurta;
      }
      if (Object.prototype.hasOwnProperty.call(meta, 'politicaCancelamentoLonga')) {
        meta.politicaCancelamentoLonga = cancelamento.value.politicaCancelamentoLonga;
        (patchPermitido as Record<string, unknown>).politicaCancelamentoLonga =
          cancelamento.value.politicaCancelamentoLonga;
      }
      if (Object.prototype.hasOwnProperty.call(meta, 'opcaoNaoReembolsavel')) {
        meta.opcaoNaoReembolsavel = cancelamento.value.opcaoNaoReembolsavel;
        (patchPermitido as Record<string, unknown>).opcaoNaoReembolsavel =
          cancelamento.value.opcaoNaoReembolsavel;
      }
    }

    const updatingRegrasCasa =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'regrasCasa');
    if (updatingRegrasCasa) {
      const regras = validateListingRegrasCasa(
        (metadataPatch as Record<string, unknown>).regrasCasa,
      );
      if (!regras.ok) {
        return { error: regras.error, message: regras.message };
      }
      const empty = Object.keys(regras.value).length === 0;
      (metadataPatch as Record<string, unknown>).regrasCasa = empty ? undefined : regras.value;
    }

    const updatingGuiaChegada =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'guiaChegada');
    if (updatingGuiaChegada) {
      const guia = validateListingGuiaChegada(
        (metadataPatch as Record<string, unknown>).guiaChegada,
      );
      if (!guia.ok) {
        return { error: guia.error, message: guia.message };
      }
      const empty = Object.keys(guia.value).length === 0;
      (metadataPatch as Record<string, unknown>).guiaChegada = empty ? undefined : guia.value;
    }

    const updatingSeguranca =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'seguranca');
    if (updatingSeguranca) {
      const seg = validateListingSeguranca(
        (metadataPatch as Record<string, unknown>).seguranca,
      );
      if (!seg.ok) {
        return { error: seg.error, message: seg.message };
      }
      const empty = Object.keys(seg.value).length === 0;
      (metadataPatch as Record<string, unknown>).seguranca = empty ? undefined : seg.value;
    }

    const updatingStatusAnuncio =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'statusAnuncio');
    if (updatingStatusAnuncio) {
      const status = validateListingStatusAnuncio(
        (metadataPatch as Record<string, unknown>).statusAnuncio,
      );
      if (!status.ok) {
        return { error: status.error, message: status.message };
      }
      (metadataPatch as Record<string, unknown>).statusAnuncio = status.value;
    }

    const updatingExigirFotoPerfil =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'exigirFotoPerfil');
    if (updatingExigirFotoPerfil) {
      const requisitos = validateListingExigirFotoPerfil(
        (metadataPatch as Record<string, unknown>).exigirFotoPerfil,
      );
      if (!requisitos.ok) {
        return { error: requisitos.error, message: requisitos.message };
      }
      (metadataPatch as Record<string, unknown>).exigirFotoPerfil = requisitos.value;
    }

    const updatingHospedagemSolidaria =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'hospedagemSolidaria');
    if (updatingHospedagemSolidaria) {
      const solidaria = validateListingHospedagemSolidaria(
        (metadataPatch as Record<string, unknown>).hospedagemSolidaria,
      );
      if (!solidaria.ok) {
        return { error: solidaria.error, message: solidaria.message };
      }
      (metadataPatch as Record<string, unknown>).hospedagemSolidaria = solidaria.value;
    }

    const updatingIdiomas =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'idiomas');
    if (updatingIdiomas) {
      const idiomas = validateListingIdiomas(
        (metadataPatch as Record<string, unknown>).idiomas,
      );
      if (!idiomas.ok) {
        return { error: idiomas.error, message: idiomas.message };
      }
      (metadataPatch as Record<string, unknown>).idiomas = idiomas.value;
    }

    const updatingGuiasLocais =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'guiasLocais');
    if (updatingGuiasLocais) {
      const guiasLocais = validateListingGuiasLocais(
        (metadataPatch as Record<string, unknown>).guiasLocais,
      );
      if (!guiasLocais.ok) {
        return { error: guiasLocais.error, message: guiasLocais.message };
      }
      (metadataPatch as Record<string, unknown>).guiasLocais = guiasLocais.value;
    }

    const updatingImpostos =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'impostos');
    if (updatingImpostos) {
      const impostos = validateListingImpostos(
        (metadataPatch as Record<string, unknown>).impostos,
      );
      if (!impostos.ok) {
        return { error: impostos.error, message: impostos.message };
      }
      (metadataPatch as Record<string, unknown>).impostos = impostos.value;
    }

    const updatingLeis =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'leis');
    if (updatingLeis) {
      const leis = validateListingLeis(
        (metadataPatch as Record<string, unknown>).leis,
      );
      if (!leis.ok) {
        return { error: leis.error, message: leis.message };
      }
      (metadataPatch as Record<string, unknown>).leis = leis.value;
    }

    const updatingCompSet =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'compSet');
    if (updatingCompSet) {
      const compSet = validateListingCompSet(
        (metadataPatch as Record<string, unknown>).compSet,
      );
      if (!compSet.ok) {
        return { error: compSet.error, message: compSet.message };
      }
      (metadataPatch as Record<string, unknown>).compSet = compSet.value;
    }

    const updatingConjuntosRegras =
      metadataPatch != null &&
      typeof metadataPatch === 'object' &&
      !Array.isArray(metadataPatch) &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'conjuntosRegras');
    if (updatingConjuntosRegras) {
      const conjuntos = validateListingConjuntosRegras(
        (metadataPatch as Record<string, unknown>).conjuntosRegras,
      );
      if (!conjuntos.ok) {
        return { error: conjuntos.error, message: conjuntos.message };
      }
      // Write path: conjuntos_regras table only; metadata kept as read fallback until ops confirm backfill.
      await syncConjuntosRegrasToDb(id, conjuntos.value);
      stripConjuntosRegrasFromMetadataPatch(metadataPatch as Record<string, unknown>);
    }

    const updatingCapacidadeMax = Object.prototype.hasOwnProperty.call(patch, 'capacidadeMax');
    const updatingCapacidadeBase = Object.prototype.hasOwnProperty.call(patch, 'capacidadeBase');
    if (updatingCapacidadeMax || updatingCapacidadeBase) {
      const cap = validateListingCapacidade({
        ...(updatingCapacidadeMax ? { capacidadeMax: patch.capacidadeMax } : {}),
        ...(updatingCapacidadeBase ? { capacidadeBase: patch.capacidadeBase } : {}),
      });
      if (!cap.ok) {
        return { error: cap.error, message: cap.message };
      }
      if (cap.capacidadeMax !== undefined) {
        patchPermitido.capacidadeMax = cap.capacidadeMax;
        // Keep base coherent when only max is updated and base would exceed max.
        const currentBase =
          patchPermitido.capacidadeBase ??
          (row.capacidadeBase != null ? Number(row.capacidadeBase) : null);
        if (
          currentBase != null &&
          Number.isFinite(currentBase) &&
          currentBase > cap.capacidadeMax &&
          !updatingCapacidadeBase
        ) {
          patchPermitido.capacidadeBase = cap.capacidadeMax;
        }
      }
      if (cap.capacidadeBase !== undefined) {
        patchPermitido.capacidadeBase =
          cap.capacidadeBase == null ? null : cap.capacidadeBase;
      }
      // Cross-check against existing max when only base is patched
      if (cap.capacidadeBase != null && cap.capacidadeMax == null) {
        const maxRef =
          patchPermitido.capacidadeMax ??
          (row.capacidadeMax != null ? Number(row.capacidadeMax) : CAPACIDADE_MAX);
        if (cap.capacidadeBase > maxRef) {
          return {
            error: 'capacidade_invalida' as const,
            message: 'Capacidade base não pode ser maior que a capacidade máxima',
          };
        }
      }
    }

    const status = patchPermitido.statusPublicacao ?? row.statusPublicacao;
    const dadosCompletos =
      patchPermitido.dadosCompletos ??
      ['completo', 'em_aprovacao', 'publicado'].includes(String(status));

    const baseMetadataForMerge =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};

    const nextMetadata =
      metadataPatch && typeof metadataPatch === 'object' && !Array.isArray(metadataPatch)
        ? {
            ...baseMetadataForMerge,
            ...metadataPatch,
          }
        : undefined;

    // nfseDrafts is server-managed (prepareNfseDraft only) — ignore client writes.
    if (
      nextMetadata &&
      metadataPatch &&
      typeof metadataPatch === 'object' &&
      Object.prototype.hasOwnProperty.call(metadataPatch, 'nfseDrafts')
    ) {
      if (Object.prototype.hasOwnProperty.call(baseMetadataForMerge, 'nfseDrafts')) {
        nextMetadata.nfseDrafts = baseMetadataForMerge.nfseDrafts;
      } else {
        delete nextMetadata.nfseDrafts;
      }
    }

    if (nextMetadata && 'slugPersonalizado' in nextMetadata) {
      const slug = normalizeListingSlug(nextMetadata.slugPersonalizado);
      if (slug) {
        if (!isValidListingSlug(slug)) {
          return { error: 'invalid_slug' as const };
        }
        const taken = await acomodacoesService.slugPersonalizadoEmUso(slug, id);
        if (taken) {
          return { error: 'slug_taken' as const };
        }
        nextMetadata.slugPersonalizado = slug;
      } else {
        nextMetadata.slugPersonalizado = '';
      }
    }

    if (nextMetadata && 'verificacaoLocal' in nextMetadata) {
      const baseMeta =
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {};
      const verPatch = sanitizeVerificacaoLocalHostPatch(baseMeta, nextMetadata.verificacaoLocal);
      if (!verPatch.ok) {
        return { error: verPatch.error, message: verPatch.message };
      }
      nextMetadata.verificacaoLocal = verPatch.value;
    }

    if (nextMetadata && updatingConjuntosRegras) {
      stripConjuntosRegrasFromMetadataPatch(nextMetadata);
    }

    const [updated] = await db
      .update(acomodacoes)
      .set({
        ...patchPermitido,
        ...(nextMetadata !== undefined ? { metadata: nextMetadata } : {}),
        dadosCompletos,
        atualizadoEm: new Date(),
      })
      .where(eq(acomodacoes.id, id))
      .returning();

    const conjuntos = await resolveConjuntosRegrasForRead(updated.id, updated.metadata);
    let metadata = enrichMetadataWithConjuntosRegras(updated.metadata, conjuntos);
    const coanfitrioes = await resolveCoanfitrioesForRead(updated.id, updated.metadata);
    metadata = enrichMetadataWithCoanfitrioes(metadata, coanfitrioes);

    return { data: { ...updated, metadata } };
  },

  async enviarAprovacao(auth: AuthContext, id: number) {
    const scoped = await this.obterUnidade(auth, id);
    if ('error' in scoped) return { error: scoped.error };
    const row = scoped.data;

    if (row.statusPublicacao !== 'completo' || !row.dadosCompletos) {
      return { error: 'invalid_status' as const };
    }

    const [updated] = await db
      .update(acomodacoes)
      .set({
        statusPublicacao: 'em_aprovacao',
        dadosCompletos: true,
        atualizadoEm: new Date(),
      })
      .where(eq(acomodacoes.id, id))
      .returning();

    return { data: updated };
  },

  async arquivarUnidade(
    auth: AuthContext,
    id: number,
    opts?: { motivo?: string },
  ): Promise<
    | { error: 'not_found' | 'forbidden' | 'invalid_motivo'; message?: string }
    | { data: typeof acomodacoes.$inferSelect; already_archived: boolean }
  > {
    const scoped = await this.obterUnidade(auth, id);
    if ('error' in scoped) return { error: scoped.error };

    const motivo = validateMotivoArquivar(opts?.motivo);
    if (!motivo.ok) {
      return { error: 'invalid_motivo', message: motivo.message };
    }

    const row = scoped.data;
    if (row.ativo === false) {
      return { data: row, already_archived: true };
    }

    const baseMeta =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    const nextMetadata = { ...baseMeta, statusAnuncio: 'nao_anunciado' as const };

    const updated = await db.transaction(async (tx) => {
      const [next] = await tx
        .update(acomodacoes)
        .set({
          ativo: false,
          metadata: nextMetadata,
          atualizadoEm: new Date(),
        })
        .where(eq(acomodacoes.id, id))
        .returning();

      await tx.insert(auditoriaEstados).values({
        entidade: 'acomodacao',
        entidadeId: id,
        de: 'ativo:true',
        para: 'arquivado',
        autorId: auth.userId,
        autorRole: auth.role,
        motivo: motivo.value ?? null,
      });

      return next;
    });

    return { data: updated, already_archived: false };
  },

  async desarquivarUnidade(
    auth: AuthContext,
    id: number,
    opts?: { motivo?: string },
  ): Promise<
    | { error: 'not_found' | 'forbidden' | 'invalid_motivo'; message?: string }
    | { data: typeof acomodacoes.$inferSelect; already_restored: boolean }
  > {
    const scoped = await this.obterUnidade(auth, id);
    if ('error' in scoped) return { error: scoped.error };
    if (!(await podeGerenciarUnidade(auth, scoped.data))) {
      return { error: 'forbidden' };
    }

    const motivo = validateMotivoDesarquivar(opts?.motivo);
    if (!motivo.ok) {
      return { error: 'invalid_motivo', message: motivo.message };
    }

    const row = scoped.data;
    if (row.ativo !== false) {
      return { data: row, already_restored: true };
    }

    const baseMeta =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    const nextMetadata = { ...baseMeta, statusAnuncio: 'anunciado' as const };

    const updated = await db.transaction(async (tx) => {
      const [next] = await tx
        .update(acomodacoes)
        .set({
          ativo: true,
          metadata: nextMetadata,
          atualizadoEm: new Date(),
        })
        .where(eq(acomodacoes.id, id))
        .returning();

      await tx.insert(auditoriaEstados).values({
        entidade: 'acomodacao',
        entidadeId: id,
        de: 'arquivado',
        para: 'reativado',
        autorId: auth.userId,
        autorRole: auth.role,
        motivo: motivo.value ?? null,
      });

      return next;
    });

    return { data: updated, already_restored: false };
  },

  async desarquivarUnidadesBulk(
    auth: AuthContext,
    ids: number[],
    opts?: { motivo?: string },
  ): Promise<
    | { error: 'invalid_motivo'; message?: string }
    | {
        results: Array<
          | { id: number; ok: true; already_restored?: boolean }
          | { id: number; ok: false; error: 'not_found' | 'forbidden' | 'invalid_motivo' }
        >;
        restored: number;
        already_restored: number;
        failed: number;
      }
  > {
    const motivo = validateMotivoDesarquivar(opts?.motivo);
    if (!motivo.ok) {
      return { error: 'invalid_motivo', message: motivo.message };
    }

    const results: Array<
      | { id: number; ok: true; already_restored?: boolean }
      | { id: number; ok: false; error: 'not_found' | 'forbidden' | 'invalid_motivo' }
    > = [];
    let restored = 0;
    let already_restored = 0;
    let failed = 0;

    for (const id of ids) {
      const result = await this.desarquivarUnidade(auth, id, { motivo: motivo.value });
      if ('error' in result) {
        results.push({ id, ok: false, error: result.error });
        failed += 1;
      } else if (result.already_restored) {
        results.push({ id, ok: true, already_restored: true });
        already_restored += 1;
      } else {
        results.push({ id, ok: true });
        restored += 1;
      }
    }

    return { results, restored, already_restored, failed };
  },

  async definirTrilhoThumb(
    auth: AuthContext,
    id: number,
    trilhoThumbUrl: string,
    originalUrl?: string | null,
  ) {
    const scoped = await this.obterUnidade(auth, id);
    if ('error' in scoped) return { error: scoped.error };
    const nextMidia = midiaWithTrilhoThumb(scoped.data.midia, trilhoThumbUrl, originalUrl ?? null);
    const [updated] = await db
      .update(acomodacoes)
      .set({ midia: nextMidia, atualizadoEm: new Date() })
      .where(eq(acomodacoes.id, id))
      .returning();
    return { data: updated };
  },

  async definirCapaTrilho(auth: AuthContext, id: number, capaUrl: string) {
    const scoped = await this.obterUnidade(auth, id);
    if ('error' in scoped) return { error: scoped.error };
    const nextMidia = midiaWithCapa(scoped.data.midia, capaUrl);
    const [updated] = await db
      .update(acomodacoes)
      .set({ midia: nextMidia, atualizadoEm: new Date() })
      .where(eq(acomodacoes.id, id))
      .returning();
    return { data: updated };
  },

  async adicionarFotoGaleria(auth: AuthContext, id: number, fotoUrl: string) {
    const scoped = await this.obterUnidade(auth, id);
    if ('error' in scoped) return { error: scoped.error };
    const nextMidia = midiaAddFoto(scoped.data.midia, fotoUrl);
    const [updated] = await db
      .update(acomodacoes)
      .set({ midia: nextMidia, atualizadoEm: new Date() })
      .where(eq(acomodacoes.id, id))
      .returning();
    return { data: updated };
  },

  async atualizarMidiaEstrutura(
    auth: AuthContext,
    id: number,
    patch: {
      removeUrl?: string;
      moveUrl?: string;
      direction?: 'left' | 'right';
      setCapaUrl?: string;
      setCategoriaUrl?: string;
      categoria?: string | null;
      setCaptionUrl?: string;
      caption?: string | null;
    },
  ) {
    const scoped = await this.obterUnidade(auth, id);
    if ('error' in scoped) return { error: scoped.error };
    let next = scoped.data.midia as unknown;
    if (patch.removeUrl) next = midiaRemoveFoto(next, patch.removeUrl);
    if (patch.moveUrl && patch.direction) next = midiaMoveFoto(next, patch.moveUrl, patch.direction);
    if (patch.setCapaUrl) next = midiaWithCapa(next, patch.setCapaUrl);
    if (patch.setCategoriaUrl) {
      next = midiaSetCategoria(next, patch.setCategoriaUrl, patch.categoria ?? null);
    }
    if (patch.setCaptionUrl) {
      next = midiaSetCaption(next, patch.setCaptionUrl, patch.caption ?? null);
    }
    const [updated] = await db
      .update(acomodacoes)
      .set({ midia: next, atualizadoEm: new Date() })
      .where(eq(acomodacoes.id, id))
      .returning();
    return { data: updated };
  },

  async aprovarUnidade(staffRole: string, id: number) {
    if (!STAFF_ROLES.has(staffRole)) return { error: 'forbidden' as const };

    const [updated] = await db
      .update(acomodacoes)
      .set({
        statusPublicacao: 'publicado',
        dadosCompletos: true,
        ativo: true,
        atualizadoEm: new Date(),
      })
      .where(and(eq(acomodacoes.id, id), eq(acomodacoes.statusPublicacao, 'em_aprovacao')))
      .returning();

    if (!updated) return { error: 'not_found' as const };
    return { data: updated };
  },

  async rejeitarUnidade(staffRole: string, id: number, motivo?: string) {
    if (!STAFF_ROLES.has(staffRole)) return { error: 'forbidden' as const };

    const [existing] = await db.select().from(acomodacoes).where(eq(acomodacoes.id, id)).limit(1);
    if (!existing) return { error: 'not_found' as const };

    const metadata = {
      ...(typeof existing.metadata === 'object' && existing.metadata ? existing.metadata : {}),
      motivoRejeicao: motivo ?? null,
    };

    const [updated] = await db
      .update(acomodacoes)
      .set({
        statusPublicacao: 'rejeitado',
        dadosCompletos: false,
        metadata,
        atualizadoEm: new Date(),
      })
      .where(eq(acomodacoes.id, id))
      .returning();

    return { data: updated };
  },

  async listarVerificacoesLocal(
    staffRole: string,
    statusFilter: 'enviado' | 'aprovado' | 'rejeitado' | 'all' = 'enviado',
  ) {
    if (!STAFF_ROLES.has(staffRole)) return { error: 'forbidden' as const };

    const rows = await db
      .select({
        id: acomodacoes.id,
        titulo: acomodacoes.titulo,
        hotelId: acomodacoes.hotelId,
        statusPublicacao: acomodacoes.statusPublicacao,
        metadata: acomodacoes.metadata,
        atualizadoEm: acomodacoes.atualizadoEm,
      })
      .from(acomodacoes)
      .where(
        statusFilter === 'all'
          ? sql`coalesce(${acomodacoes.metadata}#>>'{verificacaoLocal,status}','') <> ''`
          : sql`coalesce(${acomodacoes.metadata}#>>'{verificacaoLocal,status}','') = ${statusFilter}`,
      )
      .orderBy(desc(acomodacoes.atualizadoEm))
      .limit(100);

    const data = rows.map((row) => {
      const meta =
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {};
      const ver = asVerificacaoLocalRecord(meta.verificacaoLocal);
      return {
        id: row.id,
        titulo: row.titulo,
        hotelId: row.hotelId,
        statusPublicacao: row.statusPublicacao,
        atualizadoEm: row.atualizadoEm,
        verificacaoLocal: {
          status: typeof ver.status === 'string' ? ver.status : 'pendente',
          metodo: typeof ver.metodo === 'string' ? ver.metodo : null,
          codigo: typeof ver.codigo === 'string' ? ver.codigo : null,
          notas: typeof ver.notas === 'string' ? ver.notas : null,
          enviadoEm: typeof ver.enviadoEm === 'string' ? ver.enviadoEm : null,
          revisadoEm: typeof ver.revisadoEm === 'string' ? ver.revisadoEm : null,
          motivoRejeicao: typeof ver.motivoRejeicao === 'string' ? ver.motivoRejeicao : null,
          distanciaMetros:
            typeof ver.distanciaMetros === 'number' && Number.isFinite(ver.distanciaMetros)
              ? Math.round(ver.distanciaMetros)
              : null,
          evidenciaGeo:
            ver.evidenciaGeo &&
            typeof ver.evidenciaGeo === 'object' &&
            !Array.isArray(ver.evidenciaGeo)
              ? {
                  capturedAt:
                    typeof (ver.evidenciaGeo as Record<string, unknown>).capturedAt === 'string'
                      ? (ver.evidenciaGeo as Record<string, unknown>).capturedAt
                      : null,
                  accuracy:
                    typeof (ver.evidenciaGeo as Record<string, unknown>).accuracy === 'number'
                      ? Math.round((ver.evidenciaGeo as Record<string, unknown>).accuracy as number)
                      : null,
                }
              : null,
          evidencias: Array.isArray(ver.evidencias) ? ver.evidencias.slice(0, 6) : [],
        },
      };
    });

    return { data };
  },

  async decidirVerificacaoLocal(
    staffRole: string,
    id: number,
    action: 'aprovar' | 'rejeitar',
    motivo?: string,
  ) {
    if (!STAFF_ROLES.has(staffRole)) return { error: 'forbidden' as const };

    const [existing] = await db.select().from(acomodacoes).where(eq(acomodacoes.id, id)).limit(1);
    if (!existing) return { error: 'not_found' as const };

    const meta =
      existing.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata)
        ? (existing.metadata as Record<string, unknown>)
        : {};
    const ver = asVerificacaoLocalRecord(meta.verificacaoLocal);
    if (ver.status !== 'enviado') {
      return { error: 'invalid_status' as const };
    }

    const nextMeta = applyStaffVerificacaoLocalDecision(meta, action, motivo);
    const [updated] = await db
      .update(acomodacoes)
      .set({ metadata: nextMeta, atualizadoEm: new Date() })
      .where(eq(acomodacoes.id, id))
      .returning();

    return { data: updated };
  },

  async dashboardKpis(auth: AuthContext) {
    const { items } = await this.listarMinhas(auth, 1, 5000);
    type AcomodacaoRow = typeof acomodacoes.$inferSelect;
    const total = items.length;
    const incompletas = items.filter((i: AcomodacaoRow) => i.statusPublicacao === 'rascunho').length;
    const emAprovacao = items.filter((i: AcomodacaoRow) => i.statusPublicacao === 'em_aprovacao').length;
    const publicadas = items.filter((i: AcomodacaoRow) => i.statusPublicacao === 'publicado').length;
    return { total, incompletas, emAprovacao, publicadas };
  },

  async listarIdsAcomodacaoEscopo(auth: AuthContext): Promise<number[]> {
    const { items } = await this.listarMinhas(auth, 1, 5000);
    return items.map((i: typeof acomodacoes.$inferSelect) => i.id);
  },

  async listarReservas(
    auth: AuthContext,
    opts: { de: string; ate: string; acomodacaoId?: number },
  ): Promise<{ error: 'forbidden' | 'not_found' } | { data: ReservaAnfitriaoItem[] }> {
    const { de, ate, acomodacaoId } = opts;

    let idsEscopo: number[];
    if (acomodacaoId != null) {
      const scoped = await this.obterUnidade(auth, acomodacaoId);
      if ('error' in scoped) return { error: scoped.error };
      idsEscopo = [acomodacaoId];
    } else {
      idsEscopo = await this.listarIdsAcomodacaoEscopo(auth);
    }

    if (idsEscopo.length === 0) return { data: [] };

    const idSet = new Set(idsEscopo);
    const rows = await db
      .select()
      .from(propostas)
      .where(inArray(propostas.status, ['accepted', 'paid', 'pending_host']))
      .orderBy(desc(propostas.updatedAt));

    const data: ReservaAnfitriaoItem[] = [];
    for (const row of rows) {
      const estadia = parseEstadiaFromMetadata(row.metadata);
      if (!estadia || !idSet.has(estadia.acomodacaoId)) continue;
      if (!estadiaSobrepoePeriodo(estadia.checkIn, estadia.checkOut, de, ate)) continue;

      data.push({
        propostaId: row.id,
        codigo: row.codigo,
        titulo: row.titulo,
        status: row.status,
        acomodacaoId: estadia.acomodacaoId,
        checkIn: estadia.checkIn,
        checkOut: estadia.checkOut,
        valorTotal: String(row.valorTotal ?? '0'),
        clienteNome: row.clienteNome,
        clienteEmail: maskEmail(row.clienteEmail),
        clienteTelefone: maskPhone(row.clienteTelefone),
        aceitoEm: row.updatedAt ? row.updatedAt.toISOString() : null,
      });
    }

    return { data };
  },

  async decidirPedidoReserva(
    auth: AuthContext,
    propostaId: number,
    action: 'aprovar' | 'rejeitar',
  ) {
    const scoped = await this.assertPropostaNoEscopo(auth, propostaId);
    if ('error' in scoped) return { error: scoped.error };
    const row = scoped.data.proposta;
    if (row.status !== 'pending_host') {
      return { error: 'invalid_status' as const };
    }

    // require() avoids circular ESM static graph with propostas at boot
    const { propostasService } = require('../../propostas/services/propostas.service') as {
      propostasService: {
        changeStatus: (
          id: number,
          status: string,
          actorId?: number,
        ) => Promise<unknown>;
        addChatMessage: (
          id: number,
          payload: { senderType: string; senderName: string; message: string },
        ) => Promise<unknown>;
        aprovarPedidoHost: (id: number, actorId?: number) => Promise<unknown>;
      };
    };

    if (action === 'rejeitar') {
      const updated = await propostasService.changeStatus(propostaId, 'rejected', auth.userId);
      await propostasService.addChatMessage(propostaId, {
        senderType: 'anfitriao',
        senderName: 'Anfitrião',
        message: 'Pedido de reserva recusado pelo anfitrião.',
      });
      return { data: updated };
    }

    try {
      const updated = await propostasService.aprovarPedidoHost(propostaId, auth.userId);
      return { data: updated };
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('já foi')) return { error: 'invalid_status' as const };
      throw e;
    }
  },

  async assertPropostaNoEscopo(auth: AuthContext, propostaId: number) {
    const [row] = await db.select().from(propostas).where(eq(propostas.id, propostaId));
    if (!row) return { error: 'not_found' as const };
    const estadia = parseEstadiaFromMetadata(row.metadata);
    if (!estadia) return { error: 'not_found' as const };
    const scoped = await this.obterUnidade(auth, estadia.acomodacaoId);
    if ('error' in scoped) return { error: scoped.error };
    return { data: { proposta: row, estadia } };
  },

  async listarMensagensReserva(auth: AuthContext, propostaId: number) {
    const scoped = await this.assertPropostaNoEscopo(auth, propostaId);
    if ('error' in scoped) return { error: scoped.error };

    const messages = await db
      .select()
      .from(propostaChat)
      .where(eq(propostaChat.propostaId, propostaId))
      .orderBy(propostaChat.createdAt);

    await this.marcarMensagensLidas(auth, propostaId);

    return {
      data: {
        propostaId,
        messages: messages.map((m) => ({
          id: m.id,
          senderType: m.senderType,
          senderName: m.senderName,
          message: m.message,
          createdAt: m.createdAt ? m.createdAt.toISOString() : null,
        })),
      },
    };
  },

  async enviarMensagemReserva(
    auth: AuthContext,
    propostaId: number,
    message: string,
    senderName?: string,
  ) {
    const text = String(message || '').trim().slice(0, 2000);
    if (!text) return { error: 'invalid' as const };
    const scoped = await this.assertPropostaNoEscopo(auth, propostaId);
    if ('error' in scoped) return { error: scoped.error };

    const unitScoped = await this.obterUnidade(auth, scoped.data.estadia.acomodacaoId);
    if ('error' in unitScoped) return { error: unitScoped.error };
    if (!(await podeEditarMensagensUnidade(auth, unitScoped.data))) {
      return { error: 'forbidden' as const };
    }

    const [msg] = await db
      .insert(propostaChat)
      .values({
        propostaId,
        senderType: 'anfitriao',
        senderName: (senderName || 'Anfitrião').slice(0, 255),
        message: text,
      })
      .returning();

    await this.marcarMensagensLidas(auth, propostaId);

    return {
      data: {
        id: msg.id,
        senderType: msg.senderType,
        senderName: msg.senderName,
        message: msg.message,
        createdAt: msg.createdAt ? msg.createdAt.toISOString() : null,
      },
    };
  },

  async marcarMensagensLidas(auth: AuthContext, propostaId: number) {
    const scoped = await this.assertPropostaNoEscopo(auth, propostaId);
    if ('error' in scoped) return { error: scoped.error };
    const meta =
      scoped.data.proposta.metadata &&
      typeof scoped.data.proposta.metadata === 'object' &&
      !Array.isArray(scoped.data.proposta.metadata)
        ? { ...(scoped.data.proposta.metadata as Record<string, unknown>) }
        : {};
    meta.anfitriaoChatLastReadAt = new Date().toISOString();
    await db
      .update(propostas)
      .set({ metadata: meta, updatedAt: new Date() })
      .where(eq(propostas.id, propostaId));
    return { data: { ok: true } };
  },

  async listarInboxMensagens(auth: AuthContext, opts: { de: string; ate: string }) {
    const reservasResult = await this.listarReservas(auth, opts);
    if ('error' in reservasResult) return { error: reservasResult.error };
    const reservas = reservasResult.data;
    if (reservas.length === 0) return { data: [] };

    const ids = reservas.map((r) => r.propostaId);
    const chats = await db
      .select()
      .from(propostaChat)
      .where(inArray(propostaChat.propostaId, ids))
      .orderBy(desc(propostaChat.createdAt));

    const lastByProposta = new Map<number, (typeof chats)[number]>();
    for (const c of chats) {
      if (!lastByProposta.has(c.propostaId)) lastByProposta.set(c.propostaId, c);
    }

    const propostaRows = await db.select().from(propostas).where(inArray(propostas.id, ids));
    const metaById = new Map(propostaRows.map((p) => [p.id, p.metadata]));

    const data = reservas.map((r) => {
      const last = lastByProposta.get(r.propostaId) ?? null;
      const meta = metaById.get(r.propostaId);
      const metaObj =
        meta && typeof meta === 'object' && !Array.isArray(meta)
          ? (meta as Record<string, unknown>)
          : {};
      const lastReadAt =
        typeof metaObj.anfitriaoChatLastReadAt === 'string'
          ? metaObj.anfitriaoChatLastReadAt
          : null;
      const lastAt = last?.createdAt ? last.createdAt.toISOString() : null;
      const fromGuest =
        last != null &&
        (last.senderType === 'client' ||
          last.senderType === 'guest' ||
          last.senderType === 'cliente');
      const unread =
        fromGuest &&
        (!lastReadAt || (lastAt != null && lastAt > lastReadAt));

      return {
        ...r,
        lastMessage: last
          ? {
              id: last.id,
              senderType: last.senderType,
              preview: String(last.message).slice(0, 120),
              createdAt: lastAt,
            }
          : null,
        unread,
      };
    });

    data.sort((a, b) => {
      if (a.unread !== b.unread) return a.unread ? -1 : 1;
      const ta = a.lastMessage?.createdAt ?? a.aceitoEm ?? '';
      const tb = b.lastMessage?.createdAt ?? b.aceitoEm ?? '';
      return tb.localeCompare(ta);
    });

    return { data };
  },

  /** Lightweight unread tally for HostNav badge / polling (Aruanda A12). */
  async contarInboxNaoLidas(auth: AuthContext, opts: { de: string; ate: string }) {
    const inbox = await this.listarInboxMensagens(auth, opts);
    if ('error' in inbox) return { error: inbox.error };
    const unread = inbox.data.filter((row) => row.unread).length;
    return { data: { unread } };
  },

  async obterAgendaHoje(auth: AuthContext, hoje?: string) {
    const day = hoje && /^\d{4}-\d{2}-\d{2}$/.test(hoje) ? hoje : new Date().toISOString().slice(0, 10);
    const de = day;
    const proximosLim = (() => {
      const d = new Date(`${day}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 14);
      return d.toISOString().slice(0, 10);
    })();
    // Window: include stays that started before today but checkout later, and próximos.
    const windowDe = (() => {
      const d = new Date(`${day}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 30);
      return d.toISOString().slice(0, 10);
    })();

    const reservasResult = await this.listarReservas(auth, { de: windowDe, ate: proximosLim });
    if ('error' in reservasResult) return { error: reservasResult.error };
    const buckets = classificarReservasHoje(reservasResult.data, day, proximosLim);
    return {
      data: {
        hoje: day,
        proximosAte: proximosLim,
        ...buckets,
      },
    };
  },

  async obterCalendarioUnidade(
    auth: AuthContext,
    acomodacaoId: number,
    de: string,
    ate: string,
  ): Promise<{ error: 'forbidden' | 'not_found' } | { data: CalendarioDiaItem[] }> {
    const scoped = await this.obterUnidade(auth, acomodacaoId);
    if ('error' in scoped) return { error: scoped.error };

    const disponibilidadeResult = await this.listarDisponibilidade(auth, acomodacaoId, de, ate);
    if ('error' in disponibilidadeResult) return { error: disponibilidadeResult.error };

    const reservasResult = await this.listarReservas(auth, { de, ate, acomodacaoId });
    if ('error' in reservasResult) return { error: reservasResult.error };

    const reservedDates = buildReservedDateSet(reservasResult.data);
    const rowByDate = new Map<string, DisponibilidadeAcomodacao>(
      disponibilidadeResult.map((r: DisponibilidadeAcomodacao) => [String(r.data).slice(0, 10), r]),
    );

    const dias: CalendarioDiaItem[] = enumerateDatesInclusive(de, ate).map((data) => {
      const row = rowByDate.get(data);
      const estado = deriveCalendarioEstado(data, row, reservedDates);
      const readOnly = estado === 'reservado';
      return {
        data,
        estado,
        disponivel: estado === 'livre',
        precoOverride: row?.precoOverride != null ? String(row.precoOverride) : null,
        observacao: row?.observacao ?? null,
        readOnly,
      };
    });

    return { data: dias };
  },

  async listarDisponibilidade(
    auth: AuthContext,
    acomodacaoId: number,
    de: string,
    ate: string,
  ): Promise<{ error: 'forbidden' | 'not_found' } | DisponibilidadeAcomodacao[]> {
    const scoped = await this.obterUnidade(auth, acomodacaoId);
    if ('error' in scoped) return { error: scoped.error };

    return db
      .select()
      .from(disponibilidadeAcomodacao)
      .where(
        and(
          eq(disponibilidadeAcomodacao.acomodacaoId, acomodacaoId),
          sql`${disponibilidadeAcomodacao.data} >= ${de}`,
          sql`${disponibilidadeAcomodacao.data} <= ${ate}`,
        ),
      )
      .orderBy(disponibilidadeAcomodacao.data);
  },

  async salvarDisponibilidade(
    auth: AuthContext,
    acomodacaoId: number,
    dias: Array<{ data: string; disponivel: boolean; precoOverride?: string; observacao?: string }>,
  ) {
    const scoped = await this.obterUnidade(auth, acomodacaoId);
    if ('error' in scoped) return { error: scoped.error };
    if (dias.length > 50) return { error: 'limit_exceeded' as const };

    for (const dia of dias) {
      const [existente] = await db
        .select()
        .from(disponibilidadeAcomodacao)
        .where(
          and(
            eq(disponibilidadeAcomodacao.acomodacaoId, acomodacaoId),
            eq(disponibilidadeAcomodacao.data, dia.data),
          ),
        )
        .limit(1);

      if (isDiaReservadoProtegido(existente, dia) && !STAFF_ROLES.has(auth.role)) {
        return { error: 'day_reserved' as const };
      }

      const observacao =
        dia.disponivel === false ? (dia.observacao ?? OBSERVACAO_BLOQUEADO) : null;

      if (existente) {
        await db
          .update(disponibilidadeAcomodacao)
          .set({
            disponivel: dia.disponivel,
            precoOverride: dia.precoOverride ?? null,
            observacao:
              existente.observacao === OBSERVACAO_RESERVADO ? OBSERVACAO_RESERVADO : observacao,
            atualizadoEm: new Date(),
          })
          .where(eq(disponibilidadeAcomodacao.id, existente.id));
      } else {
        await db.insert(disponibilidadeAcomodacao).values({
          acomodacaoId,
          data: dia.data,
          disponivel: dia.disponivel,
          precoOverride: dia.precoOverride ?? null,
          observacao: dia.disponivel ? null : observacao ?? OBSERVACAO_BLOQUEADO,
        });
      }
    }

    return { ok: true as const, count: dias.length };
  },

  async bulkBloquearDatas(
    auth: AuthContext,
    acomodacaoId: number,
    datas: string[],
    observacao?: string,
  ) {
    const scoped = await this.obterUnidade(auth, acomodacaoId);
    if ('error' in scoped) return { error: scoped.error };
    if (!(await podeEditarCalendarioUnidade(auth, scoped.data))) {
      return { error: 'forbidden' as const };
    }
    if (datas.length > 50) return { error: 'limit_exceeded' as const };

    const obs = observacao?.trim() || OBSERVACAO_BLOQUEADO;
    if (obs === OBSERVACAO_RESERVADO) {
      return { error: 'invalid_observacao' as const };
    }

    for (const data of datas) {
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

      if (existente?.observacao === OBSERVACAO_RESERVADO) {
        return { error: 'day_reserved_conflict' as const, data };
      }

      if (existente) {
        await db
          .update(disponibilidadeAcomodacao)
          .set({
            disponivel: false,
            observacao: obs,
            atualizadoEm: new Date(),
          })
          .where(eq(disponibilidadeAcomodacao.id, existente.id));
      } else {
        await db.insert(disponibilidadeAcomodacao).values({
          acomodacaoId,
          data,
          disponivel: false,
          observacao: obs,
        });
      }
    }

    return { ok: true as const, count: datas.length };
  },

  async bulkDesbloquearDatas(auth: AuthContext, acomodacaoId: number, datas: string[]) {
    const scoped = await this.obterUnidade(auth, acomodacaoId);
    if ('error' in scoped) return { error: scoped.error };
    if (!(await podeEditarCalendarioUnidade(auth, scoped.data))) {
      return { error: 'forbidden' as const };
    }
    if (datas.length > 50) return { error: 'limit_exceeded' as const };

    let count = 0;
    for (const data of datas) {
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

      if (!existente) continue;

      if (existente.observacao === OBSERVACAO_RESERVADO) {
        return { error: 'day_reserved' as const, data };
      }

      if (existente.disponivel === false || existente.observacao === OBSERVACAO_BLOQUEADO) {
        await db
          .update(disponibilidadeAcomodacao)
          .set({
            disponivel: true,
            observacao: null,
            atualizadoEm: new Date(),
          })
          .where(eq(disponibilidadeAcomodacao.id, existente.id));
        count += 1;
      }
    }

    return { ok: true as const, count };
  },

  async ajustarPrecoDatas(
    auth: AuthContext,
    acomodacaoId: number,
    datas: string[],
    preco: number | null,
  ) {
    const scoped = await this.obterUnidade(auth, acomodacaoId);
    if ('error' in scoped) return { error: scoped.error };
    if (datas.length > 50) return { error: 'limit_exceeded' as const };

    if (preco != null && (!Number.isFinite(preco) || preco < 0)) {
      return { error: 'invalid_price' as const };
    }

    const precoStr = preco != null ? preco.toFixed(2) : null;

    for (const data of datas) {
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

      if (existente?.observacao === OBSERVACAO_RESERVADO) {
        return { error: 'day_reserved' as const, data };
      }

      if (existente) {
        await db
          .update(disponibilidadeAcomodacao)
          .set({
            precoOverride: precoStr,
            atualizadoEm: new Date(),
          })
          .where(eq(disponibilidadeAcomodacao.id, existente.id));
      } else {
        await db.insert(disponibilidadeAcomodacao).values({
          acomodacaoId,
          data,
          disponivel: true,
          precoOverride: precoStr,
        });
      }
    }

    return { ok: true as const, count: datas.length, preco: precoStr };
  },

  async obterCalendarioAgregado(auth: AuthContext, de: string, ate: string) {
    const { items } = await this.listarMinhas(auth, 1, 5000);
    const unidades: Array<{
      acomodacaoId: number;
      titulo: string;
      hotelId: string;
      dias: CalendarioDiaItem[];
    }> = [];

    for (const unit of items) {
      const cal = await this.obterCalendarioUnidade(auth, unit.id, de, ate);
      if ('error' in cal) continue;
      unidades.push({
        acomodacaoId: unit.id,
        titulo: unit.titulo,
        hotelId: unit.hotelId,
        dias: cal.data,
      });
    }

    return { data: unidades, de, ate };
  },

  async convidarCoanfitriao(
    auth: AuthContext,
    unidadeId: number,
    input: { nome: string; email: string; papel: string; telefone?: string },
  ) {
    const [row] = await db
      .select()
      .from(acomodacoes)
      .where(eq(acomodacoes.id, unidadeId))
      .limit(1);
    if (!row) return { error: 'not_found' as const };
    if (!(await podeGerenciarUnidade(auth, row))) return { error: 'forbidden' as const };

    const email = normalizeCoanfitriaoEmail(input.email);
    if (!email) return { error: 'email_required' as const };

    const nome =
      typeof input.nome === 'string'
        ? input.nome.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, COANFITRIOES_NOME_MAX)
        : '';
    if (!nome) return { error: 'invalid_nome' as const };

    const papelRaw = typeof input.papel === 'string' ? input.papel.trim() : '';
    if (!COANFITRIOES_PAPEIS.includes(papelRaw as CoanfitriaoPapel)) {
      return { error: 'invalid_papel' as const };
    }
    const papel = papelRaw as CoanfitriaoPapel;

    let telefone: string | undefined;
    if (input.telefone != null && String(input.telefone).trim()) {
      telefone = normalizeCoanfitriaoTelefone(input.telefone);
      if (!telefone) return { error: 'invalid_telefone' as const };
    }

    let activeCount = await countNonRevogadoCoanfitrioesFromDb(unidadeId);
    if (activeCount === 0) {
      activeCount = readCoanfitrioesFromMetadata(row.metadata).filter(
        (item) => item.status === 'pendente' || item.status === 'ativo',
      ).length;
    }
    if (activeCount >= COANFITRIOES_MAX) return { error: 'coanfitrioes_max' as const };

    const id = randomUUID();
    const token = randomUUID();
    const expiresAt = computeInviteExpiresAt();

    try {
      await db.insert(coanfitriaoConvites).values({
        id,
        acomodacaoId: unidadeId,
        nome,
        email,
        telefone,
        papel,
        status: 'pendente',
        invitedByUserId: auth.userId,
        token,
        expiresAt,
      });
    } catch (err) {
      if (isPgUniqueViolation(err)) {
        return { error: 'already_invited' as const };
      }
      throw err;
    }

    const list = await listCoanfitrioesFromDb(unidadeId);
    await clearCoanfitrioesMetadataMirror(unidadeId, row);

    let emailStatus: InviteDispatchStatus = 'skipped';
    try {
      const emailResult = await enviarConviteCoanfitriaoEmail({
        destinatarioEmail: email,
        nomeConvidado: nome,
        nomeUnidade: row.titulo,
        token,
        papelLabel: papelToLabel(papel),
      });
      emailStatus = resolveInviteDispatchStatus(emailResult);
    } catch {
      emailStatus = 'failed';
    }

    let smsStatus: InviteDispatchStatus = 'skipped';
    if (telefone) {
      try {
        const smsResult = await enviarConviteCoanfitriaoSms({
          telefone,
          nomeConvidado: nome,
          nomeUnidade: row.titulo,
          token,
          papelLabel: papelToLabel(papel),
        });
        smsStatus = resolveInviteDispatchStatus(smsResult);
      } catch {
        smsStatus = 'failed';
      }
    }

    return { data: list, emailStatus, smsStatus };
  },

  async revogarCoanfitriao(auth: AuthContext, unidadeId: number, coId: string) {
    const [row] = await db
      .select()
      .from(acomodacoes)
      .where(eq(acomodacoes.id, unidadeId))
      .limit(1);
    if (!row) return { error: 'not_found' as const };
    if (!(await podeGerenciarUnidade(auth, row))) return { error: 'forbidden' as const };

    const [target] = await db
      .select()
      .from(coanfitriaoConvites)
      .where(and(eq(coanfitriaoConvites.acomodacaoId, unidadeId), eq(coanfitriaoConvites.id, coId)))
      .limit(1);
    if (!target) return { error: 'not_found' as const };

    const now = new Date();
    await db
      .update(coanfitriaoConvites)
      .set({ status: 'revogado', revokedAt: now, updatedAt: now })
      .where(and(eq(coanfitriaoConvites.acomodacaoId, unidadeId), eq(coanfitriaoConvites.id, coId)));

    const list = await listCoanfitrioesFromDb(unidadeId);
    await clearCoanfitrioesMetadataMirror(unidadeId, row);

    return { data: list };
  },

  async reenviarConviteCoanfitriao(auth: AuthContext, unidadeId: number, coId: string) {
    const [row] = await db
      .select()
      .from(acomodacoes)
      .where(eq(acomodacoes.id, unidadeId))
      .limit(1);
    if (!row) return { error: 'not_found' as const };
    if (!(await podeGerenciarUnidade(auth, row))) return { error: 'forbidden' as const };

    const [target] = await db
      .select()
      .from(coanfitriaoConvites)
      .where(and(eq(coanfitriaoConvites.acomodacaoId, unidadeId), eq(coanfitriaoConvites.id, coId)))
      .limit(1);
    if (!target) return { error: 'not_found' as const };
    if (target.status !== 'pendente') return { error: 'invalid_status' as const };

    const now = new Date();
    const token = randomUUID();
    const expiresAt = computeInviteExpiresAt(now);

    await db
      .update(coanfitriaoConvites)
      .set({
        token,
        expiresAt,
        invitedAt: now,
        updatedAt: now,
      })
      .where(and(eq(coanfitriaoConvites.acomodacaoId, unidadeId), eq(coanfitriaoConvites.id, coId)));

    const list = await listCoanfitrioesFromDb(unidadeId);
    await clearCoanfitrioesMetadataMirror(unidadeId, row);

    let emailStatus: InviteDispatchStatus = 'skipped';
    try {
      const emailResult = await enviarConviteCoanfitriaoEmail({
        destinatarioEmail: target.email,
        nomeConvidado: target.nome,
        nomeUnidade: row.titulo,
        token,
        papelLabel: papelToLabel(target.papel as CoanfitriaoPapel),
      });
      emailStatus = resolveInviteDispatchStatus(emailResult);
    } catch {
      emailStatus = 'failed';
    }

    let smsStatus: InviteDispatchStatus = 'skipped';
    const telefone = target.telefone ?? undefined;
    if (telefone) {
      try {
        const smsResult = await enviarConviteCoanfitriaoSms({
          telefone,
          nomeConvidado: target.nome,
          nomeUnidade: row.titulo,
          token,
          papelLabel: papelToLabel(target.papel as CoanfitriaoPapel),
        });
        smsStatus = resolveInviteDispatchStatus(smsResult);
      } catch {
        smsStatus = 'failed';
      }
    }

    return { data: list, emailStatus, smsStatus };
  },

  async aceitarConviteCoanfitriao(auth: AuthContext, unidadeId: number, coId: string) {
    const authEmail = normalizeCoanfitriaoEmail(auth.email);
    if (!authEmail) return { error: 'email_required' as const };

    const [row] = await db
      .select()
      .from(acomodacoes)
      .where(eq(acomodacoes.id, unidadeId))
      .limit(1);
    if (!row) return { error: 'not_found' as const };

    const [target] = await db
      .select()
      .from(coanfitriaoConvites)
      .where(and(eq(coanfitriaoConvites.acomodacaoId, unidadeId), eq(coanfitriaoConvites.id, coId)))
      .limit(1);
    if (!target) {
      return { error: 'forbidden' as const };
    }
    if (target.status === 'pendente' && isInviteExpired(target.expiresAt)) {
      return { error: 'expired' as const };
    }
    if (
      target.status !== 'pendente' ||
      !coanfitriaoMatchesEmail(mapConviteRowToListingCoanfitriao(target), authEmail)
    ) {
      return { error: 'forbidden' as const };
    }

    const now = new Date();
    await db
      .update(coanfitriaoConvites)
      .set({ status: 'ativo', acceptedAt: now, updatedAt: now })
      .where(and(eq(coanfitriaoConvites.acomodacaoId, unidadeId), eq(coanfitriaoConvites.id, coId)));

    const list = await listCoanfitrioesFromDb(unidadeId);
    await clearCoanfitrioesMetadataMirror(unidadeId, row);

    return { data: list };
  },

  async aceitarConvitePorToken(auth: AuthContext, token: string) {
    const authEmail = normalizeCoanfitriaoEmail(auth.email);
    if (!authEmail) return { error: 'email_required' as const };

    const tokenTrimmed = typeof token === 'string' ? token.trim() : '';
    if (!tokenTrimmed) return { error: 'invalid_token' as const };

    const [target] = await db
      .select()
      .from(coanfitriaoConvites)
      .where(
        and(
          eq(coanfitriaoConvites.token, tokenTrimmed),
          eq(coanfitriaoConvites.status, 'pendente'),
        ),
      )
      .limit(1);

    if (!target) {
      return { error: 'forbidden' as const };
    }
    if (isInviteExpired(target.expiresAt)) {
      return { error: 'expired' as const };
    }
    if (!coanfitriaoMatchesEmail(mapConviteRowToListingCoanfitriao(target), authEmail)) {
      return { error: 'forbidden' as const };
    }

    const [row] = await db
      .select()
      .from(acomodacoes)
      .where(eq(acomodacoes.id, target.acomodacaoId))
      .limit(1);
    if (!row) return { error: 'not_found' as const };

    const now = new Date();
    await db
      .update(coanfitriaoConvites)
      .set({ status: 'ativo', acceptedAt: now, updatedAt: now })
      .where(eq(coanfitriaoConvites.id, target.id));

    const list = await listCoanfitrioesFromDb(target.acomodacaoId);
    await clearCoanfitrioesMetadataMirror(target.acomodacaoId, row);

    return {
      data: {
        acomodacaoId: target.acomodacaoId,
        titulo: row.titulo,
        coanfitrioes: list,
      },
    };
  },

  async removerCoanfitriao(auth: AuthContext, unidadeId: number, coId: string) {
    const [row] = await db
      .select()
      .from(acomodacoes)
      .where(eq(acomodacoes.id, unidadeId))
      .limit(1);
    if (!row) return { error: 'not_found' as const };
    if (!(await podeGerenciarUnidade(auth, row))) return { error: 'forbidden' as const };

    const [target] = await db
      .select()
      .from(coanfitriaoConvites)
      .where(and(eq(coanfitriaoConvites.acomodacaoId, unidadeId), eq(coanfitriaoConvites.id, coId)))
      .limit(1);
    if (!target) return { error: 'not_found' as const };
    if (target.status !== 'pendente' && target.status !== 'revogado') {
      return { error: 'invalid_status' as const };
    }

    await db
      .delete(coanfitriaoConvites)
      .where(and(eq(coanfitriaoConvites.acomodacaoId, unidadeId), eq(coanfitriaoConvites.id, coId)));

    const list = await listCoanfitrioesFromDb(unidadeId);
    await clearCoanfitrioesMetadataMirror(unidadeId, row);

    return { data: list };
  },

  async criarPreviewLink(auth: AuthContext, unidadeId: number) {
    const [row] = await db
      .select()
      .from(acomodacoes)
      .where(eq(acomodacoes.id, unidadeId))
      .limit(1);
    if (!row) return { error: 'not_found' as const };
    if (!(await podeGerenciarUnidade(auth, row))) return { error: 'forbidden' as const };

    const { raw, hash } = generatePreviewToken();
    const expiresAt = previewExpiresAtFromNow();

    await db
      .update(acomodacoes)
      .set({
        previewTokenHash: hash,
        previewExpiresAt: expiresAt,
        atualizadoEm: new Date(),
      })
      .where(eq(acomodacoes.id, unidadeId));

    const previewPath = `/h/preview/${raw}`;

    return {
      data: {
        url: resolvePreviewPublicUrl(previewPath),
        previewPath,
        expiresAt: expiresAt.toISOString(),
      },
    };
  },

  async exportImpostosCsv(
    auth: AuthContext,
    opts?: { ativo?: AtivoFilter },
  ): Promise<string> {
    const ativo = resolveAtivoFilter(opts?.ativo);
    const { items } = await this.listarMinhas(auth, 1, 5000, { ativo });
    const exportable = items.filter((unit) => unit.acessoComo !== 'coanfitriao');
    return buildImpostosExportCsv(
      exportable.map((unit) => ({
        id: unit.id,
        titulo: unit.titulo,
        hotelId: unit.hotelId,
        metadata: unit.metadata,
      })),
    );
  },

  async atribuirCarteira(staffRole: string, corretorId: number, proprietarioId: number) {
    if (!STAFF_ROLES.has(staffRole)) return { error: 'forbidden' as const };

    await db
      .insert(carteiraCorretor)
      .values({ corretorId, proprietarioId, status: 'ativo' })
      .onConflictDoUpdate({
        target: [carteiraCorretor.corretorId, carteiraCorretor.proprietarioId],
        set: { status: 'ativo' },
      });

    return { ok: true as const };
  },
};

module.exports = { anfitriaoService };
