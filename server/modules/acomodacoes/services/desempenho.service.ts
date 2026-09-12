import { anfitriaoService, type AuthContext } from './anfitriao.service';
import {
  avaliarOportunidades,
  resumoOportunidades,
  type Oportunidade,
  type OppUnitInput,
} from './oportunidades.engine';
import {
  avaliarQualidadePortfolio,
  gerarDicasQualidade,
  type QualidadeCategoria,
  type QualidadeCategoriaResumo,
  type QualidadeUnitInput,
} from './qualidade.engine';
import {
  aggregateReviewsForAcomodacoes,
  getGuestFeedbackReviewsStatus,
} from './anfitriao-reviews.service';
import { roundReviewMedia } from './anfitriao-reviews.util';

function daysInclusive(de: string, ate: string): number {
  const a = new Date(`${de}T12:00:00`);
  const b = new Date(`${ate}T12:00:00`);
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return Math.max(0, diff) + 1;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(`${checkIn}T12:00:00`);
  const b = new Date(`${checkOut}T12:00:00`);
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return Math.max(0, diff);
}

function monthBounds(ym: string): { de: string; ate: string } {
  const [y, m] = ym.split('-').map(Number);
  const de = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(y, m, 0).getDate();
  const ate = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { de, ate };
}

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export type DesempenhoMetrics = {
  periodo: { de: string; ate: string; mes: string };
  resumo: {
    unidadesTotal: number;
    unidadesPublicadas: number;
    reservas: number;
    receitaTotal: number;
    noitesReservadas: number;
    noitesDisponiveisEstimadas: number;
    ocupacaoPct: number | null;
  };
  qualidade: {
    scoreMedio: number | null;
    categorias: QualidadeCategoriaResumo[];
    porUnidade: Array<{
      id: number;
      titulo: string;
      score: number;
      categorias: QualidadeCategoria[];
    }>;
    dicas: string[];
  };
  conversao: {
    reservas: number;
    unidadesAtivas: number;
    reservasPorUnidade: number | null;
    nota: string;
  };
  porUnidade: Array<{
    acomodacaoId: number;
    titulo: string;
    statusPublicacao: string;
    reservas: number;
    receita: number;
    noites: number;
  }>;
  oportunidades: Oportunidade[];
  oportunidadesResumo: {
    pendentes: number;
    concluidas: number;
    pctNaoConcluidas: number;
  };
  avaliacoesHospedes: {
    disponivel: boolean;
    mediaGeral: number | null;
    totalAvaliacoes: number;
    porUnidade: Array<{
      acomodacaoId: number;
      titulo?: string;
      media: number | null;
      total: number;
    }>;
  };
};

export const desempenhoService = {
  async obterMetricas(auth: AuthContext, mes?: string): Promise<DesempenhoMetrics> {
    const ym = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : currentYearMonth();
    const { de, ate } = monthBounds(ym);

    const kpis = await anfitriaoService.dashboardKpis(auth);
    const { items } = await anfitriaoService.listarMinhas(auth, 1, 5000);
    const reservasResult = await anfitriaoService.listarReservas(auth, { de, ate });
    const reservas = 'error' in reservasResult ? [] : reservasResult.data;

    const byUnit = new Map<
      number,
      { reservas: number; receita: number; noites: number }
    >();

    let receitaTotal = 0;
    let noitesReservadas = 0;
    for (const r of reservas) {
      const valor = Number(r.valorTotal) || 0;
      const noites = nightsBetween(r.checkIn, r.checkOut);
      receitaTotal += valor;
      noitesReservadas += noites;
      const cur = byUnit.get(r.acomodacaoId) || { reservas: 0, receita: 0, noites: 0 };
      cur.reservas += 1;
      cur.receita += valor;
      cur.noites += noites;
      byUnit.set(r.acomodacaoId, cur);
    }

    const diasPeriodo = daysInclusive(de, ate);
    const noitesDisponiveisEstimadas = Math.max(0, items.length * Math.max(0, diasPeriodo - 1));
    const ocupacaoPct =
      noitesDisponiveisEstimadas > 0
        ? Math.round((noitesReservadas / noitesDisponiveisEstimadas) * 1000) / 10
        : null;

    const dicas: string[] = [];
    if ((ocupacaoPct ?? 0) < 30 && items.length > 0) {
      dicas.push('Revise preços e disponibilidade no calendário de tarifas para atrair mais reservas.');
    }
    if (reservas.length === 0) {
      dicas.push('Ainda não há reservas no período. Confira o calendário e as políticas de cancelamento.');
    }

    const unidadesAtivas = kpis.publicadas || items.length;
    const reservasPorUnidade =
      unidadesAtivas > 0 ? Math.round((reservas.length / unidadesAtivas) * 100) / 100 : null;

    const porUnidade = items.map((u) => {
      const agg = byUnit.get(u.id) || { reservas: 0, receita: 0, noites: 0 };
      return {
        acomodacaoId: u.id,
        titulo: u.titulo,
        statusPublicacao: String(u.statusPublicacao),
        reservas: agg.reservas,
        receita: Math.round(agg.receita * 100) / 100,
        noites: agg.noites,
      };
    });

    // Pricing/discount columns may arrive later via rate-calendar migrations;
    // read optionally so typecheck stays green on the base acomodacoes schema.
    const oppUnits: OppUnitInput[] = items.map((u) => {
      const row = u as typeof u & Record<string, unknown>;
      return {
        id: u.id,
        titulo: u.titulo,
        statusPublicacao: String(u.statusPublicacao),
        dadosCompletos: u.dadosCompletos,
        amenidades: u.amenidades,
        midia: u.midia,
        precoDiaria: u.precoDiaria,
        minNoites: typeof row.minNoites === 'number' ? row.minNoites : null,
        maxNoites: typeof row.maxNoites === 'number' ? row.maxNoites : null,
        descontoSemanalPct: row.descontoSemanalPct as OppUnitInput['descontoSemanalPct'],
        descontoMensalPct: row.descontoMensalPct as OppUnitInput['descontoMensalPct'],
        descontoAntecipadaPct: row.descontoAntecipadaPct as OppUnitInput['descontoAntecipadaPct'],
        descontoUltimaHoraPct: row.descontoUltimaHoraPct as OppUnitInput['descontoUltimaHoraPct'],
        descontoNovoAnuncioPct: row.descontoNovoAnuncioPct as OppUnitInput['descontoNovoAnuncioPct'],
        periodoDisponibilidadeMeses:
          typeof row.periodoDisponibilidadeMeses === 'number'
            ? row.periodoDisponibilidadeMeses
            : null,
        politicaCancelamentoCurta:
          typeof row.politicaCancelamentoCurta === 'string'
            ? row.politicaCancelamentoCurta
            : null,
        precoInteligenteAtivo:
          typeof row.precoInteligenteAtivo === 'boolean' ? row.precoInteligenteAtivo : null,
        metadata: u.metadata,
      };
    });
    const oportunidades = avaliarOportunidades(oppUnits);
    const oportunidadesResumo = resumoOportunidades(oportunidades);

    const qualidadeUnits: QualidadeUnitInput[] = items.map((u) => {
      const row = u as typeof u & Record<string, unknown>;
      const base = oppUnits.find((o) => o.id === u.id);
      return {
        ...(base ?? {
          id: u.id,
          titulo: u.titulo,
          statusPublicacao: String(u.statusPublicacao),
          dadosCompletos: u.dadosCompletos,
          amenidades: u.amenidades,
          midia: u.midia,
          precoDiaria: u.precoDiaria,
          metadata: u.metadata,
        }),
        capacidadeMax: u.capacidadeMax,
        tipoId: u.tipoId,
        minNoites: typeof row.minNoites === 'number' ? row.minNoites : base?.minNoites ?? null,
        maxNoites: typeof row.maxNoites === 'number' ? row.maxNoites : base?.maxNoites ?? null,
        periodoDisponibilidadeMeses:
          typeof row.periodoDisponibilidadeMeses === 'number'
            ? row.periodoDisponibilidadeMeses
            : base?.periodoDisponibilidadeMeses ?? null,
      };
    });
    const qualidadeAgg = avaliarQualidadePortfolio(qualidadeUnits);
    dicas.push(...gerarDicasQualidade(qualidadeAgg));

    const idsEscopo = items.map((u) => u.id);
    const reviewsStatus = await getGuestFeedbackReviewsStatus();
    const reviewAggs = await aggregateReviewsForAcomodacoes(idsEscopo);
    const reviewsByUnit = new Map(reviewAggs.map((r) => [r.acomodacaoId, r]));

    let totalAvaliacoes = 0;
    let weightedSum = 0;
    for (const agg of reviewAggs) {
      totalAvaliacoes += agg.total;
      if (agg.media != null && agg.total > 0) {
        weightedSum += agg.media * agg.total;
      }
    }
    const mediaGeral =
      totalAvaliacoes > 0 ? roundReviewMedia(weightedSum / totalAvaliacoes) : null;

    const avaliacoesHospedes = {
      disponivel: reviewsStatus.disponivel,
      mediaGeral,
      totalAvaliacoes,
      porUnidade: items.map((u) => {
        const agg = reviewsByUnit.get(u.id);
        return {
          acomodacaoId: u.id,
          titulo: u.titulo,
          media: agg?.media ?? null,
          total: agg?.total ?? 0,
        };
      }),
    };

    return {
      periodo: { de, ate, mes: ym },
      resumo: {
        unidadesTotal: kpis.total,
        unidadesPublicadas: kpis.publicadas,
        reservas: reservas.length,
        receitaTotal: Math.round(receitaTotal * 100) / 100,
        noitesReservadas,
        noitesDisponiveisEstimadas,
        ocupacaoPct,
      },
      qualidade: {
        scoreMedio: qualidadeAgg.scoreMedio,
        categorias: qualidadeAgg.categorias,
        porUnidade: qualidadeAgg.porUnidade,
        dicas,
      },
      conversao: {
        reservas: reservas.length,
        unidadesAtivas,
        reservasPorUnidade,
        nota:
          'A conversão usa reservas confirmadas no período dividido pelas unidades no escopo do anfitrião (RSV360°).',
      },
      porUnidade,
      oportunidades,
      oportunidadesResumo,
      avaliacoesHospedes,
    };
  },

  async relatorioCsv(auth: AuthContext, mes?: string): Promise<string> {
    const m = await this.obterMetricas(auth, mes);
    const lines = [
      'acomodacao_id;titulo;status;reservas;receita;noites;mes;de;ate',
      ...m.porUnidade.map(
        (u) =>
          `${u.acomodacaoId};"${String(u.titulo).replace(/"/g, '""')}";${u.statusPublicacao};${u.reservas};${u.receita};${u.noites};${m.periodo.mes};${m.periodo.de};${m.periodo.ate}`,
      ),
    ];
    return lines.join('\n');
  },
};
