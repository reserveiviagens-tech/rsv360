import { and, desc, eq } from 'drizzle-orm';
import {
  calcularPlataformaTotal,
  calcularSplitComissoesCentavos,
  calcularTaxaHospede,
  resolveTaxaHospedePct,
  TAXA_HOSPEDE_DEFAULT_RESERVEI,
} from '@rsv360/shared';
import { db } from '../../../lib/db';
import { acomodacoes } from '../../../../backend/src/db/schema/acomodacoes';
import { comissoesLancamento } from '../../../../backend/src/db/schema/comissoes-lancamento';
import { configuracoesSistema } from '../../../../backend/src/db/schema/configuracoes-sistema';
import { propostas } from '../../../../backend/src/db/schema/propostas';
import { resolveCorretorIdForAcomodacao } from './resolve-corretor-proposta';
import {
  COMISSOES_CONFIANCA_MINIMA,
  COMISSOES_OFICIAL_RESERVEI,
  comissoesConfigSchema,
  comissoesSolicitarAprovacaoSchema,
  type ComissoesAprovarSugestaoInput,
  type ComissoesConfigInput,
  type ComissoesSimularQueryInput,
  type ComissoesSolicitarAprovacaoInput,
} from '../schema';

const CHAVE_CONFIG = 'comissoes';
const EVENTO_GERADOR = 'pagamento_confirmado';

export interface RegraComissaoAplicada {
  fonte: 'manual' | 'ia' | 'oficial_reservei_2026';
  atualizadoEm: string;
  motivoIa?: string;
  marca: string;
  split: {
    plataforma: number;
    corretor: number;
    proprietario: number;
  };
}

export interface ComissoesSugestaoPendente {
  taxaPlataformaPct: number;
  taxaCorretorPct: number;
  margemProprietarioPct: number;
  fonte: 'oficial_reservei' | 'heuristica' | 'openai';
  confianca: number;
  motivo: string;
  objetivo?: string;
  contexto?: string;
  solicitadoPorUserId: number;
  solicitadoEm: string;
  status: 'pendente_aprovacao';
}

export interface ComissoesGovernanca {
  confiancaMinima: number;
  aprovacaoDuasEtapas: boolean;
}

export interface ComissoesConfig {
  comissoesModuloAtivo: boolean;
  taxaPlataformaPct: number;
  taxaCorretorPct: number;
  margemProprietarioPct: number;
  taxaHospedePct: number;
  taxaHospedeAtiva: boolean;
  taxaHospedeNome: string;
  taxaHospedeDescricao: string;
  regraAplicada?: RegraComissaoAplicada;
  sugestaoPendente?: ComissoesSugestaoPendente;
  governanca: ComissoesGovernanca;
}

export interface ComissaoListItem {
  id: number;
  propostaId: number;
  acomodacaoId: number | null;
  papel: string;
  baseValor: string;
  percentual: string;
  valorComissao: string;
  status: string;
  eventoGerador: string;
  criadoEm: Date | null;
  propostaCodigo: string | null;
  propostaTitulo: string;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function parsePct(val: unknown, fallback: number) {
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function parseRegraAplicada(raw: unknown): RegraComissaoAplicada | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const split = r.split as Record<string, unknown> | undefined;
  if (!split) return undefined;
  const plataforma = Number(split.plataforma);
  const corretor = Number(split.corretor);
  const proprietario = Number(split.proprietario);
  if (![plataforma, corretor, proprietario].every((n) => Number.isFinite(n))) return undefined;
  const fonte = r.fonte;
  if (fonte !== 'manual' && fonte !== 'ia' && fonte !== 'oficial_reservei_2026') return undefined;
  return {
    fonte,
    atualizadoEm: String(r.atualizado_em ?? r.atualizadoEm ?? new Date().toISOString()),
    motivoIa: r.motivo_ia != null ? String(r.motivo_ia) : undefined,
    marca: String(r.marca ?? COMISSOES_OFICIAL_RESERVEI.marca),
    split: { plataforma, corretor, proprietario },
  };
}

function parseSugestaoPendente(raw: unknown): ComissoesSugestaoPendente | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const s = raw as Record<string, unknown>;
  const plataforma = Number(s.taxa_plataforma_pct ?? s.taxaPlataformaPct);
  const corretor = Number(s.taxa_corretor_pct ?? s.taxaCorretorPct);
  const solicitadoPor = Number(s.solicitado_por_user_id ?? s.solicitadoPorUserId);
  if (![plataforma, corretor, solicitadoPor].every((n) => Number.isFinite(n))) return undefined;
  const margem = Number(s.margem_proprietario_pct ?? s.margemProprietarioPct);
  const confianca = Number(s.confianca);
  const fonte = s.fonte;
  if (fonte !== 'oficial_reservei' && fonte !== 'heuristica' && fonte !== 'openai') return undefined;
  if (!Number.isFinite(confianca)) return undefined;
  return {
    taxaPlataformaPct: plataforma,
    taxaCorretorPct: corretor,
    margemProprietarioPct: Number.isFinite(margem)
      ? margem
      : Math.max(0, 100 - plataforma - corretor),
    fonte,
    confianca,
    motivo: String(s.motivo ?? ''),
    objetivo: s.objetivo != null ? String(s.objetivo) : undefined,
    contexto: s.contexto != null ? String(s.contexto) : undefined,
    solicitadoPorUserId: solicitadoPor,
    solicitadoEm: String(s.solicitado_em ?? s.solicitadoEm ?? new Date().toISOString()),
    status: 'pendente_aprovacao',
  };
}

function sugestaoPendenteToDb(sugestao: ComissoesSugestaoPendente) {
  return {
    taxa_plataforma_pct: sugestao.taxaPlataformaPct,
    taxa_corretor_pct: sugestao.taxaCorretorPct,
    margem_proprietario_pct: sugestao.margemProprietarioPct,
    fonte: sugestao.fonte,
    confianca: sugestao.confianca,
    motivo: sugestao.motivo,
    objetivo: sugestao.objetivo,
    contexto: sugestao.contexto,
    solicitado_por_user_id: sugestao.solicitadoPorUserId,
    solicitado_em: sugestao.solicitadoEm,
    status: sugestao.status,
  };
}

function governancaPadrao(): ComissoesGovernanca {
  return {
    confiancaMinima: COMISSOES_CONFIANCA_MINIMA,
    aprovacaoDuasEtapas: true,
  };
}

function parseTaxaHospedeAtiva(valores: Record<string, unknown>): boolean {
  return valores.taxa_hospede_ativa === true || valores.taxaHospedeAtiva === true;
}

function parseTaxaHospedePct(valores: Record<string, unknown>, ativa: boolean): number {
  const raw = valores.taxa_hospede_pct ?? valores.taxaHospedePct;
  return resolveTaxaHospedePct(raw, ativa);
}

function parseTaxaHospedeNome(valores: Record<string, unknown>): string {
  const raw = valores.taxa_hospede_nome ?? valores.taxaHospedeNome;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return TAXA_HOSPEDE_DEFAULT_RESERVEI.taxaHospedeNome;
}

function parseTaxaHospedeDescricao(valores: Record<string, unknown>): string {
  const raw = valores.taxa_hospede_descricao ?? valores.taxaHospedeDescricao;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return TAXA_HOSPEDE_DEFAULT_RESERVEI.taxaHospedeDescricao;
}

function configFromRow(valores: Record<string, unknown>): ComissoesConfig {
  const taxaPlataformaPct = parsePct(valores.taxa_plataforma_pct, COMISSOES_OFICIAL_RESERVEI.taxaPlataformaPct);
  const taxaCorretorPct = parsePct(valores.taxa_corretor_pct, COMISSOES_OFICIAL_RESERVEI.taxaCorretorPct);
  const taxaHospedeAtiva = parseTaxaHospedeAtiva(valores);
  const taxaHospedePct = parseTaxaHospedePct(valores, taxaHospedeAtiva);
  return {
    comissoesModuloAtivo: valores.comissoes_modulo_ativo === true,
    taxaPlataformaPct,
    taxaCorretorPct,
    margemProprietarioPct: Math.max(0, 100 - taxaPlataformaPct - taxaCorretorPct),
    taxaHospedePct,
    taxaHospedeAtiva,
    taxaHospedeNome: parseTaxaHospedeNome(valores),
    taxaHospedeDescricao: parseTaxaHospedeDescricao(valores),
    regraAplicada: parseRegraAplicada(valores.regra_aplicada),
    sugestaoPendente: parseSugestaoPendente(valores.sugestao_pendente),
    governanca: governancaPadrao(),
  };
}

function buildRegraAplicada(
  config: Pick<ComissoesConfigInput, 'taxaPlataformaPct' | 'taxaCorretorPct'>,
  fonte: RegraComissaoAplicada['fonte'],
  motivoIa?: string,
): RegraComissaoAplicada {
  const proprietario = Math.max(0, 100 - config.taxaPlataformaPct - config.taxaCorretorPct);
  return {
    fonte,
    atualizadoEm: new Date().toISOString(),
    motivoIa,
    marca: COMISSOES_OFICIAL_RESERVEI.marca,
    split: {
      plataforma: config.taxaPlataformaPct,
      corretor: config.taxaCorretorPct,
      proprietario,
    },
  };
}
function parseMetadata(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function resolveBaseComissaoProposta(valorTotal: number, metadata: Record<string, unknown>): number {
  const baseSnapshot = Number(metadata.taxaHospedeBase ?? metadata.baseElegivel);
  if (Number.isFinite(baseSnapshot) && baseSnapshot > 0) return baseSnapshot;
  const taxaHospede = Number(metadata.taxaHospedeValor ?? 0);
  if (Number.isFinite(taxaHospede) && taxaHospede > 0) {
    return roundMoney(valorTotal - taxaHospede);
  }
  return valorTotal;
}

export function calcularSplitComissoes(
  baseValor: number,
  config: Pick<ComissoesConfig, 'taxaPlataformaPct' | 'taxaCorretorPct'>,
  opts: { temCorretor: boolean },
) {
  return calcularSplitComissoesCentavos(baseValor, config, opts);
}

export function simularComissoes(
  query: ComissoesSimularQueryInput,
  configVigente: ComissoesConfig,
) {
  const configAplicada = {
    taxaPlataformaPct: query.taxaPlataformaPct ?? configVigente.taxaPlataformaPct,
    taxaCorretorPct: query.taxaCorretorPct ?? configVigente.taxaCorretorPct,
  };
  const taxaHospedeAtiva = query.taxaHospedeAtiva ?? configVigente.taxaHospedeAtiva;
  const taxaHospedePct = query.taxaHospedePct ?? configVigente.taxaHospedePct;
  const baseValor = query.valor;
  const temCorretor = query.temCorretor ?? true;

  const splitSobreBase = calcularSplitComissoesCentavos(baseValor, configAplicada, { temCorretor });
  const taxaHospede = calcularTaxaHospede(baseValor, taxaHospedePct, taxaHospedeAtiva);
  const plataformaTotal = calcularPlataformaTotal(splitSobreBase, taxaHospede);

  return {
    baseValor,
    configAplicada: {
      ...configAplicada,
      taxaHospedePct: taxaHospede.pct,
      taxaHospedeAtiva,
    },
    taxaHospede,
    totalHospede: baseValor + (taxaHospede.ativa ? taxaHospede.valor : 0),
    splitSobreBase,
    plataformaTotal,
  };
}

async function persistValoresDb(valoresDb: Record<string, unknown>) {
  const [existing] = await db
    .select()
    .from(configuracoesSistema)
    .where(eq(configuracoesSistema.chave, CHAVE_CONFIG))
    .limit(1);

  if (existing) {
    await db
      .update(configuracoesSistema)
      .set({ valores: valoresDb, updatedAt: new Date() })
      .where(eq(configuracoesSistema.chave, CHAVE_CONFIG));
  } else {
    await db.insert(configuracoesSistema).values({
      chave: CHAVE_CONFIG,
      valores: valoresDb,
    });
  }
}

export const comissoesService = {
  async getConfig(): Promise<ComissoesConfig> {
    const [row] = await db
      .select()
      .from(configuracoesSistema)
      .where(eq(configuracoesSistema.chave, CHAVE_CONFIG))
      .limit(1);
    const valores = (row?.valores ?? {}) as Record<string, unknown>;
    return configFromRow(valores);
  },

  async salvarConfig(
    partial: Partial<ComissoesConfigInput>,
    opts: { fonte: 'manual' | 'ia'; motivoIa?: string } = { fonte: 'manual' },
  ): Promise<ComissoesConfig> {
    const atual = await this.getConfig();
    const merged = comissoesConfigSchema.parse({
      comissoesModuloAtivo: partial.comissoesModuloAtivo ?? atual.comissoesModuloAtivo,
      taxaPlataformaPct: partial.taxaPlataformaPct ?? atual.taxaPlataformaPct,
      taxaCorretorPct: partial.taxaCorretorPct ?? atual.taxaCorretorPct,
      taxaHospedePct: partial.taxaHospedePct ?? atual.taxaHospedePct,
      taxaHospedeAtiva: partial.taxaHospedeAtiva ?? atual.taxaHospedeAtiva,
      taxaHospedeNome: partial.taxaHospedeNome ?? atual.taxaHospedeNome,
      taxaHospedeDescricao: partial.taxaHospedeDescricao ?? atual.taxaHospedeDescricao,
    });

    const regra = buildRegraAplicada(merged, opts.fonte === 'ia' ? 'ia' : 'manual', opts.motivoIa);
    const [existing] = await db
      .select()
      .from(configuracoesSistema)
      .where(eq(configuracoesSistema.chave, CHAVE_CONFIG))
      .limit(1);
    const valoresAtuais = (existing?.valores ?? {}) as Record<string, unknown>;

    const valoresDb: Record<string, unknown> = {
      ...valoresAtuais,
      comissoes_modulo_ativo: merged.comissoesModuloAtivo,
      taxa_plataforma_pct: merged.taxaPlataformaPct,
      taxa_corretor_pct: merged.taxaCorretorPct,
      taxa_hospede_pct: merged.taxaHospedePct,
      taxa_hospede_ativa: merged.taxaHospedeAtiva,
      taxa_hospede_nome: merged.taxaHospedeNome ?? TAXA_HOSPEDE_DEFAULT_RESERVEI.taxaHospedeNome,
      taxa_hospede_descricao:
        merged.taxaHospedeDescricao ?? TAXA_HOSPEDE_DEFAULT_RESERVEI.taxaHospedeDescricao,
      regra_aplicada: {
        fonte: regra.fonte,
        atualizado_em: regra.atualizadoEm,
        motivo_ia: regra.motivoIa,
        marca: regra.marca,
        split: regra.split,
      },
    };
    delete valoresDb.sugestao_pendente;

    await persistValoresDb(valoresDb);
    return configFromRow(valoresDb);
  },

  async solicitarAprovacao(
    input: ComissoesSolicitarAprovacaoInput,
    solicitanteUserId: number,
  ): Promise<ComissoesConfig> {
    const parsed = comissoesSolicitarAprovacaoSchema.parse(input);
    const margem =
      parsed.margemProprietarioPct ?? Math.max(0, 100 - parsed.taxaPlataformaPct - parsed.taxaCorretorPct);

    const sugestaoPendente: ComissoesSugestaoPendente = {
      taxaPlataformaPct: parsed.taxaPlataformaPct,
      taxaCorretorPct: parsed.taxaCorretorPct,
      margemProprietarioPct: margem,
      fonte: parsed.fonte,
      confianca: parsed.confianca,
      motivo: parsed.motivo,
      objetivo: parsed.objetivo,
      contexto: parsed.contexto,
      solicitadoPorUserId: solicitanteUserId,
      solicitadoEm: new Date().toISOString(),
      status: 'pendente_aprovacao',
    };

    const [existing] = await db
      .select()
      .from(configuracoesSistema)
      .where(eq(configuracoesSistema.chave, CHAVE_CONFIG))
      .limit(1);
    const valoresAtuais = (existing?.valores ?? {}) as Record<string, unknown>;
    const valoresDb = {
      ...valoresAtuais,
      sugestao_pendente: sugestaoPendenteToDb(sugestaoPendente),
    };

    await persistValoresDb(valoresDb);
    return configFromRow(valoresDb);
  },

  async aprovarSugestao(
    aprovadorUserId: number,
    opts: ComissoesAprovarSugestaoInput,
  ): Promise<ComissoesConfig> {
    if (!opts.confirmouDiff) {
      throw new Error('Confirmação do diff atual vs sugestão é obrigatória');
    }

    const atual = await this.getConfig();
    const pendente = atual.sugestaoPendente;
    if (!pendente) {
      throw new Error('Não há sugestão pendente de aprovação');
    }
    if (pendente.solicitadoPorUserId === aprovadorUserId) {
      throw new Error('Aprovação requer outro administrador (duas etapas)');
    }
    if (pendente.confianca < COMISSOES_CONFIANCA_MINIMA && !opts.overrideBaixaConfianca) {
      throw new Error(
        `Confiança ${Math.round(pendente.confianca * 100)}% abaixo do mínimo ${Math.round(COMISSOES_CONFIANCA_MINIMA * 100)}%. Override explícito necessário.`,
      );
    }

    return this.salvarConfig(
      {
        comissoesModuloAtivo: atual.comissoesModuloAtivo,
        taxaPlataformaPct: pendente.taxaPlataformaPct,
        taxaCorretorPct: pendente.taxaCorretorPct,
      },
      { fonte: 'ia', motivoIa: pendente.motivo },
    );
  },

  async rejeitarSugestao(_userId: number, _motivo?: string): Promise<ComissoesConfig> {
    const [existing] = await db
      .select()
      .from(configuracoesSistema)
      .where(eq(configuracoesSistema.chave, CHAVE_CONFIG))
      .limit(1);
    if (!existing) {
      return configFromRow({});
    }

    const valoresAtuais = { ...(existing.valores as Record<string, unknown>) };
    delete valoresAtuais.sugestao_pendente;
    await persistValoresDb(valoresAtuais);
    return configFromRow(valoresAtuais);
  },

  async listarMinhas(userId: number, page = 1, pageSize = 20) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(100, Math.max(1, pageSize));
    const offset = (safePage - 1) * safeSize;

    const rows = await db
      .select({
        id: comissoesLancamento.id,
        propostaId: comissoesLancamento.propostaId,
        acomodacaoId: comissoesLancamento.acomodacaoId,
        papel: comissoesLancamento.papel,
        baseValor: comissoesLancamento.baseValor,
        percentual: comissoesLancamento.percentual,
        valorComissao: comissoesLancamento.valorComissao,
        status: comissoesLancamento.status,
        eventoGerador: comissoesLancamento.eventoGerador,
        criadoEm: comissoesLancamento.criadoEm,
        propostaCodigo: propostas.codigo,
        propostaTitulo: propostas.titulo,
      })
      .from(comissoesLancamento)
      .innerJoin(propostas, eq(comissoesLancamento.propostaId, propostas.id))
      .where(eq(comissoesLancamento.beneficiarioUserId, userId))
      .orderBy(desc(comissoesLancamento.criadoEm))
      .limit(safeSize)
      .offset(offset);

    return {
      items: rows as ComissaoListItem[],
      page: safePage,
      pageSize: safeSize,
    };
  },

  /**
   * MVP-B: chamar após pagamento confirmado (proposta.status = paid).
   * MVP-A: retorna cedo se comissoes_modulo_ativo = false.
   */
  async gerarLancamentos(propostaId: number) {
    const config = await this.getConfig();
    if (!config.comissoesModuloAtivo) {
      return { generated: false, reason: 'module_disabled' as const };
    }

    const [proposta] = await db.select().from(propostas).where(eq(propostas.id, propostaId)).limit(1);
    if (!proposta) {
      return { generated: false, reason: 'proposta_not_found' as const };
    }
    if (proposta.status !== 'paid') {
      return { generated: false, reason: 'proposta_not_paid' as const };
    }

    const metadata = parseMetadata(proposta.metadata);
    const acomodacaoId = Number(metadata.acomodacaoId ?? metadata.selectedAcomodacaoId ?? 0) || null;
    let corretorId = Number(metadata.corretorId ?? 0) || null;
    if (!corretorId && acomodacaoId) {
      corretorId = await resolveCorretorIdForAcomodacao(acomodacaoId);
    }

    if (!acomodacaoId) {
      return { generated: false, reason: 'acomodacao_missing' as const };
    }

    const [acomodacao] = await db
      .select({ proprietarioId: acomodacoes.proprietarioId })
      .from(acomodacoes)
      .where(eq(acomodacoes.id, acomodacaoId))
      .limit(1);
    if (!acomodacao?.proprietarioId) {
      return { generated: false, reason: 'proprietario_missing' as const };
    }

    const valorTotal = Number(proposta.valorTotal);
    if (!Number.isFinite(valorTotal) || valorTotal <= 0) {
      return { generated: false, reason: 'invalid_base_valor' as const };
    }

    /** Split sobre base sem taxa hóspede; MVP-B: papel `plataforma_taxa` para taxaHospedeValor. */
    const baseValor = resolveBaseComissaoProposta(valorTotal, metadata);
    const split = calcularSplitComissoes(baseValor, config, { temCorretor: corretorId != null && corretorId > 0 });

    const lancamentos: Array<typeof comissoesLancamento.$inferInsert> = [
      {
        propostaId,
        acomodacaoId,
        beneficiarioUserId: acomodacao.proprietarioId,
        papel: 'proprietario',
        baseValor: baseValor.toFixed(2),
        percentual: split.proprietario.percentual.toFixed(2),
        valorComissao: split.proprietario.valor.toFixed(2),
        status: 'confirmada',
        eventoGerador: EVENTO_GERADOR,
      },
    ];

    if (corretorId && corretorId > 0 && split.corretor.valor > 0) {
      lancamentos.push({
        propostaId,
        acomodacaoId,
        beneficiarioUserId: corretorId,
        papel: 'corretor',
        baseValor: baseValor.toFixed(2),
        percentual: split.corretor.percentual.toFixed(2),
        valorComissao: split.corretor.valor.toFixed(2),
        status: 'confirmada',
        eventoGerador: EVENTO_GERADOR,
      });
    }

    const inserted: number[] = [];
    for (const row of lancamentos) {
      const existing = await db
        .select({ id: comissoesLancamento.id })
        .from(comissoesLancamento)
        .where(
          and(
            eq(comissoesLancamento.propostaId, row.propostaId!),
            eq(comissoesLancamento.beneficiarioUserId, row.beneficiarioUserId!),
            eq(comissoesLancamento.papel, row.papel!),
          ),
        )
        .limit(1);
      if (existing.length > 0) continue;

      const [created] = await db.insert(comissoesLancamento).values(row).returning({ id: comissoesLancamento.id });
      if (created) inserted.push(created.id);
    }

    return { generated: true, insertedIds: inserted };
  },
};

module.exports = { comissoesService, calcularSplitComissoes, simularComissoes };
