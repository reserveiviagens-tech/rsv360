import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { acomodacoes } from '../../../../backend/src/db/schema/acomodacoes';
import { disponibilidadeAcomodacao } from '../../../../backend/src/db/schema/disponibilidade-acomodacao';
import {
  politicaDescontoAudit,
  politicaDescontoParceiro,
} from '../../../../backend/src/db/schema/politica-desconto';
import { empreendimentos } from '../../../../backend/src/db/schema/empreendimentos';
import { feriadoMunicipio } from '../../../../backend/src/db/schema/feriado-municipio';
import { tarifaTemporada, tarifaTemporadaPeriodo } from '../../../../backend/src/db/schema/tarifa-temporada';
import { tarifaService } from './tarifa.service';
import {
  anfitriaoService,
  type AuthContext,
} from './anfitriao.service';
import {
  clampSmartPrice,
  normalizeMinNoitesPorCheckin,
  parseWeekdayList,
  sugerirPrecoCompetitivo,
  type MinNoitesPorCheckin,
} from './host-pricing.helpers';
import {
  avaliarPrecificacao,
  classificarTemporadaTipo,
  expandFeriadosMd,
  feriadosNoIntervalo,
  isFimDeSemana,
  type TemporadaInfo,
} from './calendario-contexto.util';
import { normalizarCidade } from './feriados-brasil.data';
import {
  assertSafeIcalUrl,
  ICAL_IMPORT_OBS,
  mergeBusyRanges,
  parseIcalBusyDates,
  toIcalDate,
} from './ical.util';
import { randomBytes } from 'crypto';

const STAFF_ROLES = new Set(['admin', 'manager']);
const MASTER_ROLES = new Set(['admin', 'manager', 'anfitriao']);
const BROKER_ROLES = new Set(['corretor', 'agente', 'promotor']);

export type ResolverPrecoDiaInput = {
  acomodacaoId: number;
  data: string;
  descontoProposto?: number;
  actorRole?: string;
};

export type ResultadoPrecoDia = {
  data: string;
  precoBase: number;
  precoEfetivo: number;
  precoAposDesconto: number;
  override: number | null;
  weekendApplied: boolean;
  descontoAplicado: number;
  tetoDesconto: number;
  trilha: Array<{ passo: string; detalhe?: string }>;
};

function isWeekend(isoDate: string): boolean {
  return isFimDeSemana(isoDate);
}

async function loadTemporadasOverlapping(de: string, ate: string): Promise<
  Array<{
    temporadaId: number;
    slug: string;
    nome: string;
    prioridade: number;
    dataInicio: string;
    dataFim: string;
  }>
> {
  const rows = await db
    .select({
      temporadaId: tarifaTemporadaPeriodo.temporadaId,
      prioridade: tarifaTemporada.prioridade,
      slug: tarifaTemporada.slug,
      nome: tarifaTemporada.nome,
      dataInicio: tarifaTemporadaPeriodo.dataInicio,
      dataFim: tarifaTemporadaPeriodo.dataFim,
    })
    .from(tarifaTemporadaPeriodo)
    .innerJoin(tarifaTemporada, eq(tarifaTemporadaPeriodo.temporadaId, tarifaTemporada.id))
    .where(
      and(
        eq(tarifaTemporadaPeriodo.ativo, true),
        eq(tarifaTemporada.ativo, true),
        lte(tarifaTemporadaPeriodo.dataInicio, ate),
        gte(tarifaTemporadaPeriodo.dataFim, de),
      ),
    )
    .orderBy(desc(tarifaTemporada.prioridade));

  return rows.map((r) => ({
    temporadaId: r.temporadaId,
    slug: r.slug,
    nome: r.nome,
    prioridade: r.prioridade ?? 0,
    dataInicio: String(r.dataInicio).slice(0, 10),
    dataFim: String(r.dataFim).slice(0, 10),
  }));
}

function matchTemporadaDia(
  data: string,
  periodos: Awaited<ReturnType<typeof loadTemporadasOverlapping>>,
): TemporadaInfo | null {
  const match = periodos.find((p) => data >= p.dataInicio && data <= p.dataFim);
  if (!match) return null;
  return {
    id: match.temporadaId,
    slug: match.slug,
    nome: match.nome,
    tipo: classificarTemporadaTipo(match.slug || match.nome),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const CANCEL_POLICIES = new Set([
  'flexivel',
  'moderada',
  'limitada',
  'restrita',
  'restrita_longa',
  'rigorosa_longa',
]);

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, round2(n)));
}

function normalizeCancelPolicy(value: string, fallback: string): string {
  const v = String(value || '').toLowerCase().trim();
  return CANCEL_POLICIES.has(v) ? v : fallback;
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export type PricingDefaultsView = {
  precoDiaria: number | null;
  precoFimSemana: number | null;
  minNoites: number;
  maxNoites: number;
  minNoitesPorCheckin: MinNoitesPorCheckin | null;
  antecedenciaDias: number;
  avisoPrevioMesmoDia: string | null;
  descontoSemanalPct: number;
  descontoMensalPct: number;
  taxaLimpeza: number | null;
  taxaPet: number | null;
  taxaHospedeExtra: number | null;
  politicaCancelamentoCurta: string;
  politicaCancelamentoLonga: string;
  opcaoNaoReembolsavel: boolean;
  precoInteligenteAtivo: boolean;
  precoInteligenteMin: number | null;
  precoInteligenteMax: number | null;
  descontoUltimaHoraPct: number;
  descontoUltimaHoraDias: number;
  descontoAntecipadaPct: number;
  descontoAntecipadaDias: number;
  descontoNovoAnuncioPct: number;
  descontoNovoAnuncioLimite: number;
  descontoAvaliacaoPct: number;
  descontoAvaliacaoMinNota: number;
  descontoAvaliacaoMinReviews: number;
  tempoPreparacaoNoites: number;
  tempoPreparacaoHoras: number;
  periodoDisponibilidadeMeses: number;
  checkinDiasPermitidos: number[] | null;
  checkoutDiasPermitidos: number[] | null;
  icalToken: string | null;
  icalImportUrl: string | null;
  icalImportLastSyncAt: string | null;
  icalImportLastStatus: string | null;
  icalImportLastError: string | null;
  permitirPedidosMesmoDia: boolean;
};

export type PricingDefaultsPatch = {
  precoDiaria?: number | null;
  precoFimSemana?: number | null;
  minNoites?: number;
  maxNoites?: number;
  minNoitesPorCheckin?: MinNoitesPorCheckin | null;
  antecedenciaDias?: number;
  avisoPrevioMesmoDia?: string | null;
  descontoSemanalPct?: number;
  descontoMensalPct?: number;
  taxaLimpeza?: number | null;
  taxaPet?: number | null;
  taxaHospedeExtra?: number | null;
  politicaCancelamentoCurta?: string;
  politicaCancelamentoLonga?: string;
  opcaoNaoReembolsavel?: boolean;
  precoInteligenteAtivo?: boolean;
  precoInteligenteMin?: number | null;
  precoInteligenteMax?: number | null;
  descontoUltimaHoraPct?: number;
  descontoUltimaHoraDias?: number;
  descontoAntecipadaPct?: number;
  descontoAntecipadaDias?: number;
  descontoNovoAnuncioPct?: number;
  descontoNovoAnuncioLimite?: number;
  descontoAvaliacaoPct?: number;
  descontoAvaliacaoMinNota?: number;
  descontoAvaliacaoMinReviews?: number;
  tempoPreparacaoNoites?: number;
  tempoPreparacaoHoras?: number;
  periodoDisponibilidadeMeses?: number;
  checkinDiasPermitidos?: number[] | null;
  checkoutDiasPermitidos?: number[] | null;
  regenerateIcalToken?: boolean;
  permitirPedidosMesmoDia?: boolean;
};

function mapPricingDefaults(unit: Record<string, unknown>): PricingDefaultsView {
  return {
    precoDiaria: numOrNull(unit.precoDiaria),
    precoFimSemana: numOrNull(unit.precoFimSemana),
    minNoites: Number(unit.minNoites ?? 1) || 1,
    maxNoites: Number(unit.maxNoites ?? 30) || 30,
    minNoitesPorCheckin: normalizeMinNoitesPorCheckin(
      unit.minNoitesPorCheckin,
      Number(unit.minNoites ?? 1) || 1,
    ),
    antecedenciaDias: Number(unit.antecedenciaDias ?? 0) || 0,
    avisoPrevioMesmoDia: (unit.avisoPrevioMesmoDia as string | null) ?? null,
    descontoSemanalPct: Number(unit.descontoSemanalPct ?? 0) || 0,
    descontoMensalPct: Number(unit.descontoMensalPct ?? 0) || 0,
    taxaLimpeza: numOrNull(unit.taxaLimpeza),
    taxaPet: numOrNull(unit.taxaPet),
    taxaHospedeExtra: numOrNull(unit.taxaHospedeExtra),
    politicaCancelamentoCurta: String(unit.politicaCancelamentoCurta ?? 'limitada'),
    politicaCancelamentoLonga: String(unit.politicaCancelamentoLonga ?? 'restrita_longa'),
    opcaoNaoReembolsavel: Boolean(unit.opcaoNaoReembolsavel),
    precoInteligenteAtivo: Boolean(unit.precoInteligenteAtivo),
    precoInteligenteMin: numOrNull(unit.precoInteligenteMin),
    precoInteligenteMax: numOrNull(unit.precoInteligenteMax),
    descontoUltimaHoraPct: Number(unit.descontoUltimaHoraPct ?? 0) || 0,
    descontoUltimaHoraDias: Number(unit.descontoUltimaHoraDias ?? 3) || 3,
    descontoAntecipadaPct: Number(unit.descontoAntecipadaPct ?? 0) || 0,
    descontoAntecipadaDias: Number(unit.descontoAntecipadaDias ?? 30) || 30,
    descontoNovoAnuncioPct: Number(unit.descontoNovoAnuncioPct ?? 0) || 0,
    descontoNovoAnuncioLimite: Number(unit.descontoNovoAnuncioLimite ?? 3) || 3,
    descontoAvaliacaoPct: Number(unit.descontoAvaliacaoPct ?? 0) || 0,
    descontoAvaliacaoMinNota: Number(unit.descontoAvaliacaoMinNota ?? 4.8) || 4.8,
    descontoAvaliacaoMinReviews: Number(unit.descontoAvaliacaoMinReviews ?? 3) || 3,
    tempoPreparacaoNoites: Number(unit.tempoPreparacaoNoites ?? 0) || 0,
    tempoPreparacaoHoras: Number(unit.tempoPreparacaoHoras ?? 0) || 0,
    periodoDisponibilidadeMeses: Number(unit.periodoDisponibilidadeMeses ?? 12) || 0,
    checkinDiasPermitidos: parseWeekdayList(unit.checkinDiasPermitidos),
    checkoutDiasPermitidos: parseWeekdayList(unit.checkoutDiasPermitidos),
    icalToken: (unit.icalToken as string | null) ?? null,
    icalImportUrl: (unit.icalImportUrl as string | null) ?? null,
    icalImportLastSyncAt: unit.icalImportLastSyncAt
      ? new Date(unit.icalImportLastSyncAt as Date).toISOString()
      : null,
    icalImportLastStatus: (unit.icalImportLastStatus as string | null) ?? null,
    icalImportLastError: (unit.icalImportLastError as string | null) ?? null,
    permitirPedidosMesmoDia: (() => {
      const meta = unit.metadata;
      if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
        const v = (meta as Record<string, unknown>).permitirPedidosMesmoDia;
        if (typeof v === 'boolean') return v;
      }
      return true;
    })(),
  };
}

async function resolveTetoDesconto(
  acomodacaoId: number,
  hotelId: string | null,
  role: string,
): Promise<number> {
  if (STAFF_ROLES.has(role) || role === 'anfitriao') {
    return 100;
  }

  const policies = await db
    .select()
    .from(politicaDescontoParceiro)
    .where(eq(politicaDescontoParceiro.ativo, true))
    .orderBy(asc(politicaDescontoParceiro.id));

  const matchesRole = (roles: unknown) => {
    const list = Array.isArray(roles) ? roles.map(String) : [];
    return list.length === 0 || list.includes(role);
  };

  const unit = policies.find(
    (p) => p.scope === 'acomodacao' && p.scopeId === String(acomodacaoId) && matchesRole(p.rolesPermitidos),
  );
  if (unit) return Number(unit.maxDescontoPercentual) || 0;

  if (hotelId) {
    const emp = policies.find(
      (p) => p.scope === 'empreendimento' && p.scopeId === hotelId && matchesRole(p.rolesPermitidos),
    );
    if (emp) return Number(emp.maxDescontoPercentual) || 0;
  }

  const global = policies.find((p) => p.scope === 'global' && matchesRole(p.rolesPermitidos));
  return global ? Number(global.maxDescontoPercentual) || 0 : 0;
}

export const rateCalendarService = {
  async resolverPrecoDia(input: ResolverPrecoDiaInput): Promise<ResultadoPrecoDia> {
    const trilha: Array<{ passo: string; detalhe?: string }> = [];
    const tarifa = await tarifaService.resolverTarifa({
      acomodacaoId: input.acomodacaoId,
      data: input.data,
    });

    let preco = tarifa.precoFinal;
    trilha.push(...tarifa.trilha.map((t) => ({ passo: t.passo, detalhe: t.detalhe })));

    const [unit] = await db
      .select()
      .from(acomodacoes)
      .where(eq(acomodacoes.id, input.acomodacaoId))
      .limit(1);

    let weekendApplied = false;
    const weekendPrice = unit?.precoFimSemana != null ? Number(unit.precoFimSemana) : null;
    if (!tarifa.motorAtivo && weekendPrice != null && Number.isFinite(weekendPrice) && isWeekend(input.data)) {
      preco = weekendPrice;
      weekendApplied = true;
      trilha.push({ passo: 'fim_semana', detalhe: `preco_fim_semana=${weekendPrice}` });
    }

    const [disp] = await db
      .select()
      .from(disponibilidadeAcomodacao)
      .where(
        and(
          eq(disponibilidadeAcomodacao.acomodacaoId, input.acomodacaoId),
          eq(disponibilidadeAcomodacao.data, input.data),
        ),
      )
      .limit(1);

    let override: number | null = null;
    if (disp?.precoOverride != null && disp.precoOverride !== '') {
      override = Number(disp.precoOverride);
      if (Number.isFinite(override)) {
        preco = override;
        trilha.push({ passo: 'override', detalhe: `preco_override=${override}` });
      } else {
        override = null;
      }
    }

    if (unit) {
      const beforeSmart = preco;
      preco = clampSmartPrice(
        preco,
        Boolean(unit.precoInteligenteAtivo),
        unit.precoInteligenteMin != null ? Number(unit.precoInteligenteMin) : null,
        unit.precoInteligenteMax != null ? Number(unit.precoInteligenteMax) : null,
      );
      if (preco !== beforeSmart) {
        trilha.push({
          passo: 'preco_inteligente',
          detalhe: `${beforeSmart}→${preco}`,
        });
      }
    }

    const teto = await resolveTetoDesconto(
      input.acomodacaoId,
      unit?.hotelId ?? null,
      input.actorRole || 'user',
    );
    trilha.push({ passo: 'teto_desconto', detalhe: `${teto}%` });

    let descontoAplicado = 0;
    let precoAposDesconto = preco;
    if (input.descontoProposto != null && input.descontoProposto > 0) {
      const capped = Math.min(Number(input.descontoProposto), teto);
      descontoAplicado = capped;
      precoAposDesconto = round2(preco * (1 - capped / 100));
      trilha.push({ passo: 'desconto', detalhe: `${capped}% (pedido=${input.descontoProposto})` });
    }

    return {
      data: input.data,
      precoBase: tarifa.precoBase,
      precoEfetivo: round2(preco),
      precoAposDesconto,
      override,
      weekendApplied,
      descontoAplicado,
      tetoDesconto: teto,
      trilha,
    };
  },

  async obterRateCalendar(auth: AuthContext, acomodacaoId: number, de: string, ate: string) {
    const unitResult = await anfitriaoService.obterUnidade(auth, acomodacaoId);
    if ('error' in unitResult) return unitResult;

    const unit = unitResult.data;
    const cal = await anfitriaoService.obterCalendarioUnidade(auth, acomodacaoId, de, ate);
    if ('error' in cal) return cal;

    const pricingDefaults = mapPricingDefaults(unit as Record<string, unknown>);
    let cidadeEmp: string | null = 'Caldas Novas';
    if (unit.hotelId) {
      const [emp] = await db
        .select({ cidade: empreendimentos.cidade })
        .from(empreendimentos)
        .where(eq(empreendimentos.hotelId, String(unit.hotelId)))
        .limit(1);
      if (emp?.cidade) cidadeEmp = emp.cidade;
    }
    const cidadeNorm = normalizarCidade(cidadeEmp);
    let municipaisDb: Array<{
      md: string;
      nome: string;
      uf: string;
      municipio: string;
      tipo: string;
    }> = [];
    if (cidadeNorm) {
      try {
        municipaisDb = await db
          .select({
            md: feriadoMunicipio.md,
            nome: feriadoMunicipio.nome,
            uf: feriadoMunicipio.uf,
            municipio: feriadoMunicipio.municipio,
            tipo: feriadoMunicipio.tipo,
          })
          .from(feriadoMunicipio)
          .where(eq(feriadoMunicipio.municipioNorm, cidadeNorm))
          .limit(200);
      } catch (err) {
        // Table may be absent before migration 0046 — keep national/state catalog.
        console.warn(
          '[rate-calendar] feriado_municipio unavailable; using static holiday catalog',
          (err as Error)?.message?.slice(0, 120),
        );
        municipaisDb = [];
      }
    }
    const extrasMunicipais = expandFeriadosMd(
      municipaisDb.map((r) => ({
        md: r.md,
        nome: r.nome,
        uf: r.uf,
        municipio: r.municipio,
        tipo: (r.tipo === 'estadual' || r.tipo === 'nacional' ? r.tipo : 'municipal') as
          | 'municipal'
          | 'estadual'
          | 'nacional',
      })),
      de,
      ate,
    );
    const feriados = feriadosNoIntervalo(
      de,
      ate,
      {
        cidade: cidadeEmp,
        // Capitals + state of listing city; national always included.
        todasCapitais: false,
        todosEstados: false,
      },
      extrasMunicipais,
    );
    const temporadas = await loadTemporadasOverlapping(de, ate);

    const dias = [];
    for (const dia of cal.data) {
      const preco = await this.resolverPrecoDia({
        acomodacaoId,
        data: dia.data,
        actorRole: auth.role,
      });
      const fimDeSemana = isFimDeSemana(dia.data);
      const feriado = feriados.get(dia.data) ?? null;
      const temporada = matchTemporadaDia(dia.data, temporadas);
      const alerta = avaliarPrecificacao({
        precoEfetivo: preco.precoEfetivo,
        precoBase: preco.precoBase || pricingDefaults.precoDiaria || 0,
        precoFimSemana: pricingDefaults.precoFimSemana,
        temporada,
        fimDeSemana,
        feriado,
      });
      dias.push({
        ...dia,
        precoEfetivo: preco.precoEfetivo,
        precoBase: preco.precoBase,
        override: preco.override,
        weekendApplied: preco.weekendApplied,
        tetoDesconto: preco.tetoDesconto,
        contexto: {
          fimDeSemana,
          feriado,
          temporada,
          alerta,
        },
      });
    }

    const dica = sugerirPrecoCompetitivo(pricingDefaults.precoDiaria);

    return {
      data: {
        acomodacaoId,
        titulo: unit.titulo,
        pricingDefaults,
        dicas: {
          precoSugerido: dica.precoSugerido,
          ganhoBuscasPct: dica.ganhoBuscasPct,
          mensagem: `Seu anúncio poderia aparecer em até ${dica.ganhoBuscasPct}% mais buscas com um preço de R$${dica.precoSugerido}.`,
        },
        dias,
        de,
        ate,
        canEditPricing: MASTER_ROLES.has(auth.role),
        canApplyDiscount: BROKER_ROLES.has(auth.role) || STAFF_ROLES.has(auth.role),
      },
    };
  },

  async atualizarDia(
    auth: AuthContext,
    acomodacaoId: number,
    body: { data: string; preco?: number | null; disponivel?: boolean; observacao?: string },
  ) {
    if (!MASTER_ROLES.has(auth.role)) {
      return { error: 'forbidden' as const };
    }
    const unitResult = await anfitriaoService.obterUnidade(auth, acomodacaoId);
    if ('error' in unitResult) return unitResult;

    if (body.preco !== undefined) {
      const r = await anfitriaoService.ajustarPrecoDatas(
        auth,
        acomodacaoId,
        [body.data],
        body.preco,
      );
      if ('error' in r) return r;
    }
    if (body.disponivel === false) {
      const r = await anfitriaoService.bulkBloquearDatas(auth, acomodacaoId, [body.data], body.observacao);
      if ('error' in r) return r;
    } else if (body.disponivel === true) {
      const r = await anfitriaoService.bulkDesbloquearDatas(auth, acomodacaoId, [body.data]);
      if ('error' in r) return r;
    }
    return { ok: true as const };
  },

  async atualizarPricingDefaults(
    auth: AuthContext,
    acomodacaoId: number,
    patch: PricingDefaultsPatch,
  ) {
    if (!MASTER_ROLES.has(auth.role)) {
      return { error: 'forbidden' as const };
    }
    const unitResult = await anfitriaoService.obterUnidade(auth, acomodacaoId);
    if ('error' in unitResult) return unitResult;

    const set: Record<string, unknown> = { atualizadoEm: new Date() };
    if (patch.precoDiaria !== undefined) {
      set.precoDiaria = patch.precoDiaria == null ? null : String(patch.precoDiaria);
    }
    if (patch.precoFimSemana !== undefined) {
      set.precoFimSemana = patch.precoFimSemana == null ? null : String(patch.precoFimSemana);
    }
    if (patch.minNoites !== undefined) set.minNoites = Math.max(1, Math.floor(patch.minNoites));
    if (patch.maxNoites !== undefined) set.maxNoites = Math.max(1, Math.floor(patch.maxNoites));
    if (patch.minNoitesPorCheckin !== undefined) {
      set.minNoitesPorCheckin =
        patch.minNoitesPorCheckin == null
          ? null
          : normalizeMinNoitesPorCheckin(
              patch.minNoitesPorCheckin,
              patch.minNoites ?? Number((unitResult.data as { minNoites?: number }).minNoites ?? 1),
            );
    }
    if (patch.antecedenciaDias !== undefined) {
      set.antecedenciaDias = Math.max(0, Math.floor(patch.antecedenciaDias));
    }
    if (patch.avisoPrevioMesmoDia !== undefined) {
      set.avisoPrevioMesmoDia = patch.avisoPrevioMesmoDia;
    }
    if (patch.descontoSemanalPct !== undefined) {
      set.descontoSemanalPct = String(clampPct(patch.descontoSemanalPct));
    }
    if (patch.descontoMensalPct !== undefined) {
      set.descontoMensalPct = String(clampPct(patch.descontoMensalPct));
    }
    if (patch.taxaLimpeza !== undefined) {
      set.taxaLimpeza = patch.taxaLimpeza == null ? null : String(Math.max(0, patch.taxaLimpeza));
    }
    if (patch.taxaPet !== undefined) {
      set.taxaPet = patch.taxaPet == null ? null : String(Math.max(0, patch.taxaPet));
    }
    if (patch.taxaHospedeExtra !== undefined) {
      set.taxaHospedeExtra =
        patch.taxaHospedeExtra == null ? null : String(Math.max(0, patch.taxaHospedeExtra));
    }
    if (patch.politicaCancelamentoCurta !== undefined) {
      set.politicaCancelamentoCurta = normalizeCancelPolicy(
        patch.politicaCancelamentoCurta,
        'limitada',
      );
    }
    if (patch.politicaCancelamentoLonga !== undefined) {
      set.politicaCancelamentoLonga = normalizeCancelPolicy(
        patch.politicaCancelamentoLonga,
        'restrita_longa',
      );
    }
    if (patch.opcaoNaoReembolsavel !== undefined) {
      set.opcaoNaoReembolsavel = Boolean(patch.opcaoNaoReembolsavel);
    }
    if (patch.precoInteligenteAtivo !== undefined) {
      set.precoInteligenteAtivo = Boolean(patch.precoInteligenteAtivo);
    }
    if (patch.precoInteligenteMin !== undefined) {
      set.precoInteligenteMin =
        patch.precoInteligenteMin == null ? null : String(Math.max(0, patch.precoInteligenteMin));
    }
    if (patch.precoInteligenteMax !== undefined) {
      set.precoInteligenteMax =
        patch.precoInteligenteMax == null ? null : String(Math.max(0, patch.precoInteligenteMax));
    }
    if (patch.descontoUltimaHoraPct !== undefined) {
      set.descontoUltimaHoraPct = String(clampPct(patch.descontoUltimaHoraPct));
    }
    if (patch.descontoUltimaHoraDias !== undefined) {
      set.descontoUltimaHoraDias = Math.max(0, Math.floor(patch.descontoUltimaHoraDias));
    }
    if (patch.descontoAntecipadaPct !== undefined) {
      set.descontoAntecipadaPct = String(clampPct(patch.descontoAntecipadaPct));
    }
    if (patch.descontoAntecipadaDias !== undefined) {
      set.descontoAntecipadaDias = Math.max(1, Math.floor(patch.descontoAntecipadaDias));
    }
    if (patch.descontoNovoAnuncioPct !== undefined) {
      set.descontoNovoAnuncioPct = String(clampPct(patch.descontoNovoAnuncioPct));
    }
    if (patch.descontoNovoAnuncioLimite !== undefined) {
      set.descontoNovoAnuncioLimite = Math.max(1, Math.floor(patch.descontoNovoAnuncioLimite));
    }
    if (patch.descontoAvaliacaoPct !== undefined) {
      set.descontoAvaliacaoPct = String(clampPct(patch.descontoAvaliacaoPct));
    }
    if (patch.descontoAvaliacaoMinNota !== undefined) {
      const n = Number(patch.descontoAvaliacaoMinNota);
      set.descontoAvaliacaoMinNota = String(Math.min(5, Math.max(0, Number.isFinite(n) ? n : 4.8)));
    }
    if (patch.descontoAvaliacaoMinReviews !== undefined) {
      set.descontoAvaliacaoMinReviews = Math.max(0, Math.floor(patch.descontoAvaliacaoMinReviews));
    }
    if (patch.tempoPreparacaoNoites !== undefined) {
      set.tempoPreparacaoNoites = Math.max(0, Math.floor(patch.tempoPreparacaoNoites));
    }
    if (patch.tempoPreparacaoHoras !== undefined) {
      set.tempoPreparacaoHoras = Math.min(23, Math.max(0, Math.floor(patch.tempoPreparacaoHoras)));
    }
    if (patch.periodoDisponibilidadeMeses !== undefined) {
      set.periodoDisponibilidadeMeses = Math.min(
        24,
        Math.max(0, Math.floor(patch.periodoDisponibilidadeMeses)),
      );
    }
    if (patch.checkinDiasPermitidos !== undefined) {
      set.checkinDiasPermitidos = parseWeekdayList(patch.checkinDiasPermitidos);
    }
    if (patch.checkoutDiasPermitidos !== undefined) {
      set.checkoutDiasPermitidos = parseWeekdayList(patch.checkoutDiasPermitidos);
    }
    if (patch.regenerateIcalToken) {
      set.icalToken = randomBytes(24).toString('hex');
    }
    if (patch.permitirPedidosMesmoDia !== undefined) {
      const prevMeta =
        unitResult.data &&
        typeof (unitResult.data as { metadata?: unknown }).metadata === 'object' &&
        (unitResult.data as { metadata?: unknown }).metadata != null &&
        !Array.isArray((unitResult.data as { metadata?: unknown }).metadata)
          ? {
              ...((unitResult.data as { metadata: Record<string, unknown> }).metadata),
            }
          : {};
      set.metadata = {
        ...prevMeta,
        permitirPedidosMesmoDia: Boolean(patch.permitirPedidosMesmoDia),
      };
    }

    const [row] = await db
      .update(acomodacoes)
      .set(set)
      .where(eq(acomodacoes.id, acomodacaoId))
      .returning();

    return { data: row };
  },

  async getPoliticaDesconto(scope?: string, scopeId?: string | null) {
    const rows = await db
      .select()
      .from(politicaDescontoParceiro)
      .where(eq(politicaDescontoParceiro.ativo, true));
    if (scope) {
      return rows.filter(
        (r) => r.scope === scope && (scopeId == null ? !r.scopeId : r.scopeId === scopeId),
      );
    }
    return rows;
  },

  async upsertPoliticaDesconto(
    auth: AuthContext,
    body: {
      scope: 'global' | 'empreendimento' | 'acomodacao';
      scopeId?: string | null;
      maxDescontoPercentual: number;
      maxDescontoAbsoluto?: number | null;
      rolesPermitidos?: string[];
      ativo?: boolean;
    },
  ) {
    if (!MASTER_ROLES.has(auth.role)) {
      return { error: 'forbidden' as const };
    }
    const pct = Number(body.maxDescontoPercentual);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return { error: 'validation' as const, message: 'maxDescontoPercentual inválido' };
    }

    const existing = await db
      .select()
      .from(politicaDescontoParceiro)
      .where(
        and(
          eq(politicaDescontoParceiro.scope, body.scope),
          body.scopeId
            ? eq(politicaDescontoParceiro.scopeId, body.scopeId)
            : sql`${politicaDescontoParceiro.scopeId} IS NULL`,
        ),
      )
      .limit(1);

    const payload = {
      maxDescontoPercentual: String(pct),
      maxDescontoAbsoluto:
        body.maxDescontoAbsoluto != null ? String(body.maxDescontoAbsoluto) : null,
      rolesPermitidos: body.rolesPermitidos ?? ['corretor', 'agente', 'promotor'],
      ativo: body.ativo !== false,
      updatedBy: auth.userId,
      updatedAt: new Date(),
    };

    let row;
    if (existing[0]) {
      [row] = await db
        .update(politicaDescontoParceiro)
        .set(payload)
        .where(eq(politicaDescontoParceiro.id, existing[0].id))
        .returning();
    } else {
      [row] = await db
        .insert(politicaDescontoParceiro)
        .values({
          scope: body.scope,
          scopeId: body.scopeId ?? null,
          ...payload,
        })
        .returning();
    }

    await db.insert(politicaDescontoAudit).values({
      actorUserId: auth.userId,
      actorRole: auth.role,
      action: 'politica_upsert',
      percentual: String(pct),
      meta: { scope: body.scope, scopeId: body.scopeId ?? null },
    });

    return { data: row };
  },

  async aplicarDesconto(
    auth: AuthContext,
    acomodacaoId: number,
    body: { datas: string[]; percentual: number; enforceAsRole?: string },
  ) {
    if (!BROKER_ROLES.has(auth.role) && !STAFF_ROLES.has(auth.role)) {
      return { error: 'forbidden' as const };
    }
    const unitResult = await anfitriaoService.obterUnidade(auth, acomodacaoId);
    if ('error' in unitResult) return unitResult;

    const percentual = Number(body.percentual);
    if (!Number.isFinite(percentual) || percentual < 0) {
      return { error: 'validation' as const, message: 'percentual inválido' };
    }

    const datas = Array.isArray(body.datas) ? body.datas.slice(0, 50) : [];
    if (datas.length === 0) {
      return { error: 'validation' as const, message: 'datas obrigatórias' };
    }

    /** Proxy CRM: staff JWT + enforceAsRole broker → teto de parceiro (fail-closed). */
    let roleForCap = auth.role;
    if (
      STAFF_ROLES.has(auth.role) &&
      typeof body.enforceAsRole === 'string' &&
      BROKER_ROLES.has(body.enforceAsRole)
    ) {
      roleForCap = body.enforceAsRole;
    }

    const teto = await resolveTetoDesconto(
      acomodacaoId,
      unitResult.data.hotelId,
      roleForCap,
    );

    if (percentual > teto) {
      await db.insert(politicaDescontoAudit).values({
        acomodacaoId,
        actorUserId: auth.userId,
        actorRole: auth.role,
        action: 'desconto_bloqueado',
        percentual: String(percentual),
        datas,
        meta: { teto },
      });
      return {
        error: 'discount_cap' as const,
        message: `Desconto máximo permitido: ${teto}%`,
        teto,
      };
    }

    const results = [];
    for (const data of datas) {
      const before = await this.resolverPrecoDia({
        acomodacaoId,
        data,
        actorRole: auth.role,
      });
      const afterPrice = round2(before.precoEfetivo * (1 - percentual / 100));
      const save = await anfitriaoService.ajustarPrecoDatas(
        auth,
        acomodacaoId,
        [data],
        afterPrice,
      );
      if ('error' in save) {
        return save;
      }
      results.push({ data, precoAntes: before.precoEfetivo, precoDepois: afterPrice });
      await db.insert(politicaDescontoAudit).values({
        acomodacaoId,
        actorUserId: auth.userId,
        actorRole: auth.role,
        action: 'desconto_aplicado',
        percentual: String(percentual),
        precoAntes: String(before.precoEfetivo),
        precoDepois: String(afterPrice),
        datas: [data],
      });
    }

    return { ok: true as const, teto, results };
  },

  /**
   * Validação server-side para funil cotação/proposta — UI não decide o teto.
   */
  async validarDescontoProposto(
    auth: AuthContext,
    acomodacaoId: number,
    percentual: number,
    opts?: { enforceAsRole?: string },
  ): Promise<{ ok: true; teto: number } | { ok: false; teto: number; message: string }> {
    const unitResult = await anfitriaoService.obterUnidade(auth, acomodacaoId);
    if ('error' in unitResult) {
      return { ok: false, teto: 0, message: 'Unidade inacessível' };
    }
    let roleForCap = auth.role;
    if (
      opts?.enforceAsRole &&
      BROKER_ROLES.has(opts.enforceAsRole) &&
      (STAFF_ROLES.has(auth.role) || !auth.role)
    ) {
      roleForCap = opts.enforceAsRole;
    }
    const teto = await resolveTetoDesconto(acomodacaoId, unitResult.data.hotelId, roleForCap);
    if (
      (STAFF_ROLES.has(auth.role) || auth.role === 'anfitriao') &&
      !opts?.enforceAsRole
    ) {
      return { ok: true, teto: 100 };
    }
    if (percentual > teto) {
      return { ok: false, teto, message: `Desconto máximo permitido: ${teto}%` };
    }
    return { ok: true, teto };
  },

  /**
   * Validação sem JWT de parceiro (funil público / cotação) — role efetiva = corretor.
   */
  async assertDescontoParceiroNoFunil(
    acomodacaoId: number,
    percentual: number,
    actorRole = 'corretor',
  ): Promise<{ ok: true; teto: number } | { ok: false; teto: number; message: string }> {
    const pct = Number(percentual);
    if (!Number.isFinite(pct) || pct < 0) {
      return { ok: false, teto: 0, message: 'percentual inválido' };
    }
    if (pct === 0) {
      return { ok: true, teto: await resolveTetoDesconto(acomodacaoId, null, actorRole) };
    }
    const [unit] = await db
      .select({ id: acomodacoes.id, hotelId: acomodacoes.hotelId })
      .from(acomodacoes)
      .where(eq(acomodacoes.id, acomodacaoId))
      .limit(1);
    if (!unit) {
      return { ok: false, teto: 0, message: 'Unidade não encontrada' };
    }
    const role = BROKER_ROLES.has(actorRole) ? actorRole : 'corretor';
    const teto = await resolveTetoDesconto(acomodacaoId, unit.hotelId, role);
    if (pct > teto) {
      await db.insert(politicaDescontoAudit).values({
        acomodacaoId,
        actorUserId: null,
        actorRole: role,
        action: 'desconto_bloqueado_funil',
        percentual: String(pct),
        meta: { teto, origem: 'cotacao_proposta' },
      });
      return { ok: false, teto, message: `Desconto máximo permitido: ${teto}%` };
    }
    return { ok: true, teto };
  },

  async garantirIcalToken(
    auth: AuthContext,
    acomodacaoId: number,
    opts?: { regenerate?: boolean },
  ) {
    if (!MASTER_ROLES.has(auth.role)) {
      return { error: 'forbidden' as const };
    }
    const unitResult = await anfitriaoService.obterUnidade(auth, acomodacaoId);
    if ('error' in unitResult) return unitResult;
    const existing = (unitResult.data as { icalToken?: string | null }).icalToken;
    if (existing && !opts?.regenerate) {
      return { data: { icalToken: existing, regenerated: false } };
    }
    const token = randomBytes(24).toString('hex');
    await db
      .update(acomodacoes)
      .set({ icalToken: token, atualizadoEm: new Date() })
      .where(eq(acomodacoes.id, acomodacaoId));
    return { data: { icalToken: token, regenerated: Boolean(opts?.regenerate && existing) } };
  },

  async salvarIcalImportUrl(auth: AuthContext, acomodacaoId: number, url: string | null) {
    if (!MASTER_ROLES.has(auth.role)) {
      return { error: 'forbidden' as const };
    }
    const unitResult = await anfitriaoService.obterUnidade(auth, acomodacaoId);
    if ('error' in unitResult) return unitResult;

    let safeUrl: string | null = null;
    if (url != null && String(url).trim() !== '') {
      safeUrl = assertSafeIcalUrl(String(url)).toString();
    }

    await db
      .update(acomodacoes)
      .set({
        icalImportUrl: safeUrl,
        icalImportLastError: null,
        icalImportLastStatus: safeUrl ? 'configured' : null,
        atualizadoEm: new Date(),
      })
      .where(eq(acomodacoes.id, acomodacaoId));

    return {
      data: {
        icalImportUrl: safeUrl,
        icalImportLastStatus: safeUrl ? 'configured' : null,
      },
    };
  },

  async sincronizarIcalImport(auth: AuthContext, acomodacaoId: number) {
    if (!MASTER_ROLES.has(auth.role)) {
      return { error: 'forbidden' as const };
    }
    const unitResult = await anfitriaoService.obterUnidade(auth, acomodacaoId);
    if ('error' in unitResult) return unitResult;
    const unit = unitResult.data as {
      icalImportUrl?: string | null;
    };
    if (!unit.icalImportUrl) {
      return { error: 'no_url' as const };
    }

    const de = new Date().toISOString().slice(0, 10);
    const ateDate = new Date();
    ateDate.setMonth(ateDate.getMonth() + 12);
    const ate = ateDate.toISOString().slice(0, 10);

    try {
      const safe = assertSafeIcalUrl(unit.icalImportUrl);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      let icsText: string;
      try {
        const res = await fetch(safe.toString(), {
          method: 'GET',
          signal: controller.signal,
          headers: {
            Accept: 'text/calendar, text/plain, */*',
            'User-Agent': 'RSV360-iCalSync/1.0',
          },
          redirect: 'follow',
        });
        if (!res.ok) {
          throw new Error(`Feed externo retornou HTTP ${res.status}`);
        }
        icsText = await res.text();
      } finally {
        clearTimeout(timer);
      }

      if (!icsText || icsText.length > 2_000_000) {
        throw new Error('Feed iCal inválido ou muito grande');
      }
      if (!/BEGIN:VCALENDAR/i.test(icsText)) {
        throw new Error('Resposta não parece um calendário iCal');
      }

      const busy = new Set(parseIcalBusyDates(icsText, de, ate));
      const cal = await anfitriaoService.obterCalendarioUnidade(auth, acomodacaoId, de, ate);
      if ('error' in cal) {
        throw new Error('Não foi possível ler o calendário local');
      }

      const toBlock: string[] = [];
      const toUnblock: string[] = [];
      for (const dia of cal.data) {
        const isBusyExt = busy.has(dia.data);
        const isIcalBlock =
          dia.estado === 'bloqueado' &&
          String(dia.observacao || '').startsWith(ICAL_IMPORT_OBS);
        if (dia.estado === 'reservado') continue;
        if (isBusyExt && dia.estado === 'livre') {
          toBlock.push(dia.data);
        } else if (!isBusyExt && isIcalBlock) {
          toUnblock.push(dia.data);
        }
      }

      // Chunk to respect bulk limit (50)
      const chunk = <T,>(arr: T[], size: number) => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
      };

      let blocked = 0;
      let unblocked = 0;
      for (const part of chunk(toBlock, 50)) {
        if (part.length === 0) continue;
        const r = await anfitriaoService.bulkBloquearDatas(
          auth,
          acomodacaoId,
          part,
          ICAL_IMPORT_OBS,
        );
        if ('error' in r) {
          throw new Error(`Falha ao bloquear noites importadas (${r.error})`);
        }
        blocked += part.length;
      }
      for (const part of chunk(toUnblock, 50)) {
        if (part.length === 0) continue;
        const r = await anfitriaoService.bulkDesbloquearDatas(auth, acomodacaoId, part);
        if ('error' in r) {
          throw new Error(`Falha ao liberar noites iCal antigas (${r.error})`);
        }
        unblocked += part.length;
      }

      await db
        .update(acomodacoes)
        .set({
          icalImportLastSyncAt: new Date(),
          icalImportLastStatus: 'ok',
          icalImportLastError: null,
          atualizadoEm: new Date(),
        })
        .where(eq(acomodacoes.id, acomodacaoId));

      return {
        data: {
          blocked,
          unblocked,
          busyNights: busy.size,
          syncedAt: new Date().toISOString(),
          status: 'ok' as const,
        },
      };
    } catch (err) {
      const message = (err as Error).message || 'Falha na sincronização iCal';
      await db
        .update(acomodacoes)
        .set({
          icalImportLastSyncAt: new Date(),
          icalImportLastStatus: 'error',
          icalImportLastError: message.slice(0, 500),
          atualizadoEm: new Date(),
        })
        .where(eq(acomodacoes.id, acomodacaoId));
      return { error: 'sync_failed' as const, message };
    }
  },

  async gerarIcalFeed(acomodacaoId: number, token: string, de: string, ate: string) {
    const [unit] = await db
      .select()
      .from(acomodacoes)
      .where(and(eq(acomodacoes.id, acomodacaoId), eq(acomodacoes.icalToken, token)))
      .limit(1);
    if (!unit) {
      return { error: 'not_found' as const };
    }

    // Token já autentica o feed — usar role staff para leitura de calendário sem IDOR de proprietário.
    const auth: AuthContext = { userId: unit.proprietarioId ?? 1, role: 'admin' };
    const cal = await anfitriaoService.obterCalendarioUnidade(auth, acomodacaoId, de, ate);
    if ('error' in cal) {
      return { error: 'not_found' as const };
    }

    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//RSV360//Reservei Viagens//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${String(unit.titulo).replace(/[,;\\]/g, ' ')}`,
    ];

    const byEstado = {
      reservado: [] as string[],
      bloqueado: [] as string[],
    };
    for (const dia of cal.data) {
      if (dia.estado === 'reservado') byEstado.reservado.push(dia.data);
      else if (dia.estado === 'bloqueado') byEstado.bloqueado.push(dia.data);
    }

    for (const [estado, dates] of Object.entries(byEstado) as Array<
      ['reservado' | 'bloqueado', string[]]
    >) {
      const summary = estado === 'reservado' ? 'Reservado' : 'Bloqueado';
      for (const range of mergeBusyRanges(dates)) {
        const start = toIcalDate(range.start);
        const end = toIcalDate(range.endExclusive);
        lines.push(
          'BEGIN:VEVENT',
          `UID:${acomodacaoId}-${estado}-${start}@rsv360.reserveiviagens.com.br`,
          `DTSTAMP:${stamp}`,
          `DTSTART;VALUE=DATE:${start}`,
          `DTEND;VALUE=DATE:${end}`,
          `SUMMARY:${summary}`,
          'TRANSP:OPAQUE',
          'STATUS:CONFIRMED',
          'END:VEVENT',
        );
      }
    }

    lines.push('END:VCALENDAR');
    return { data: lines.join('\r\n') };
  },
};

module.exports = { rateCalendarService };
