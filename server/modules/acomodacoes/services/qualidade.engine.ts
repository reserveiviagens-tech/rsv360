/**
 * Listing completeness quality engine for host Desempenho (Reservei Viagens / RSV360°).
 * Pure functions — scored from listing fields + metadata (not guest review stars).
 */

import { unidadeTemAcessibilidadeDeclarada } from './acessibilidade-fotos.util';
import type { OppUnitInput } from './oportunidades.engine';

export type QualidadeUnitInput = OppUnitInput & {
  capacidadeMax?: number | null;
  tipoId?: number | null;
};

export type QualidadeCheck = {
  id: string;
  ok: boolean;
  label: string;
};

export type QualidadeCategoria = {
  id: string;
  label: string;
  pct: number;
  checks: QualidadeCheck[];
};

export type QualidadeUnidadeResult = {
  score: number;
  categorias: QualidadeCategoria[];
};

export type QualidadeCategoriaResumo = {
  id: string;
  label: string;
  pct: number;
};

export type QualidadePorUnidade = {
  id: number;
  titulo: string;
  score: number;
  categorias: QualidadeCategoria[];
};

export type QualidadePortfolioResult = {
  scoreMedio: number | null;
  categorias: QualidadeCategoriaResumo[];
  porUnidade: QualidadePorUnidade[];
};

const CATEGORIA_DEFS: Array<{ id: string; label: string }> = [
  { id: 'apresentacao', label: 'Apresentação' },
  { id: 'espaco', label: 'Espaço' },
  { id: 'preco', label: 'Preço' },
  { id: 'disponibilidade', label: 'Disponibilidade' },
  { id: 'local_confianca', label: 'Local e confiança' },
  { id: 'experiencia', label: 'Experiência' },
];

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function amenityIds(raw: unknown): Set<string> {
  const set = new Set<string>();
  if (!Array.isArray(raw)) return set;
  for (const item of raw) {
    if (typeof item === 'string') set.add(item.toLowerCase());
    else if (item && typeof item === 'object' && 'id' in item) {
      set.add(String((item as { id: unknown }).id).toLowerCase());
    } else if (item && typeof item === 'object' && 'label' in item) {
      set.add(String((item as { label: unknown }).label).toLowerCase());
    }
  }
  return set;
}

function hasAmenity(set: Set<string>, ...keys: string[]): boolean {
  for (const k of keys) {
    if (set.has(k.toLowerCase())) return true;
    for (const a of set) {
      if (a.includes(k.toLowerCase())) return true;
    }
  }
  return false;
}

function hasFotos(midia: unknown): boolean {
  if (Array.isArray(midia) && midia.length > 0) return true;
  const o = asRecord(midia);
  if (typeof o.capa === 'string' && o.capa) return true;
  if (typeof o.trilhoThumb === 'string' && o.trilhoThumb) return true;
  const fotos = o.fotos ?? o.images ?? o.photos;
  return Array.isArray(fotos) && fotos.length > 0;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function hasDescricaoAnuncio(metadata: unknown): boolean {
  const desc = asRecord(asRecord(metadata).descricaoDetalhada);
  const anuncio = typeof desc.anuncio === 'string' ? desc.anuncio.trim() : '';
  if (anuncio.length >= 20) return true;
  return DESCRICAO_FIELD_KEYS.some((k) => {
    const t = desc[k];
    return typeof t === 'string' && t.trim().length >= 20;
  });
}

const DESCRICAO_FIELD_KEYS = [
  'anuncio',
  'suaPropriedade',
  'acessoHospede',
  'interacaoHospedes',
  'outrasInformacoes',
] as const;

function hasTipoPropriedade(metadata: unknown, tipoId: number | null | undefined): boolean {
  if (tipoId != null && tipoId > 0) return true;
  const tipo = asRecord(asRecord(metadata).tipoPropriedade);
  return Boolean(tipo.tipo?.toString().trim() || tipo.acomodacao?.toString().trim());
}

function hasCamas(metadata: unknown): boolean {
  const camas = asRecord(asRecord(metadata).tiposCama);
  return Object.values(camas).some((v) => num(v) > 0);
}

function hasComodidadesBasicas(amenidades: unknown): boolean {
  const set = amenityIds(amenidades);
  return (
    hasAmenity(set, 'wifi', 'wi-fi', 'internet') ||
    hasAmenity(set, 'ar', 'ar-condicionado') ||
    hasAmenity(set, 'tv', 'televis') ||
    hasAmenity(set, 'cozinha', 'kitchen', 'utensilio')
  );
}

function hasPrecificacao(u: QualidadeUnitInput): boolean {
  if (num(u.precoDiaria) <= 0) return false;
  return (
    num(u.descontoSemanalPct) > 0 ||
    num(u.descontoMensalPct) > 0 ||
    num(u.descontoAntecipadaPct) > 0 ||
    num(u.descontoUltimaHoraPct) > 0 ||
    num(u.descontoNovoAnuncioPct) > 0 ||
    u.precoInteligenteAtivo === true
  );
}

function hasConfigReserva(metadata: unknown): boolean {
  const meta = asRecord(metadata);
  const modo = String(meta.modoReserva ?? '').trim();
  return modo.length > 0;
}

function hasCidade(metadata: unknown): boolean {
  const loc = asRecord(asRecord(metadata).localizacao);
  const cidade = typeof loc.cidade === 'string' ? loc.cidade.trim() : '';
  return cidade.length > 0;
}

function hasVerificacao(u: QualidadeUnitInput): boolean {
  const meta = asRecord(u.metadata);
  if (meta.statusAnuncio === 'anunciado') return true;
  if (String(u.statusPublicacao ?? '').toLowerCase() === 'publicado') return true;
  if (String(u.statusPublicacao ?? '').toLowerCase() === 'em_aprovacao') return true;
  return Boolean(u.dadosCompletos);
}

function hasSegurancaOuAcessibilidade(metadata: unknown): boolean {
  if (unidadeTemAcessibilidadeDeclarada(metadata)) return true;
  const seg = asRecord(asRecord(metadata).seguranca);
  const dispositivos = asRecord(seg.dispositivos);
  if (Object.values(dispositivos).some((d) => asRecord(d).ativo === true)) return true;
  const consideracoes = asRecord(seg.consideracoes);
  return Object.values(consideracoes).some((v) => v === true);
}

function hasGuiaChegada(metadata: unknown): boolean {
  const guia = asRecord(asRecord(metadata).guiaChegada);
  const wifi =
    (typeof guia.wifiRede === 'string' && guia.wifiRede.trim().length > 0) ||
    (typeof guia.wifiSenha === 'string' && guia.wifiSenha.trim().length > 0);
  const metodo = String(guia.metodoCheckIn ?? '').trim();
  const guiaCasa = typeof guia.guiaCasa === 'string' ? guia.guiaCasa.trim() : '';
  const comoChegar = typeof guia.comoChegar === 'string' ? guia.comoChegar.trim() : '';
  return wifi || metodo.length > 0 || guiaCasa.length >= 10 || comoChegar.length >= 10;
}

function hasIdiomas(metadata: unknown): boolean {
  const idiomas = asRecord(metadata).idiomas;
  return Array.isArray(idiomas) && idiomas.length > 0;
}

function pctFromChecks(checks: QualidadeCheck[]): number {
  if (checks.length === 0) return 0;
  const ok = checks.filter((c) => c.ok).length;
  return Math.round((ok / checks.length) * 100);
}

function scoreFromCategorias(categorias: QualidadeCategoria[]): number {
  if (categorias.length === 0) return 0;
  const sum = categorias.reduce((acc, c) => acc + c.pct, 0);
  return Math.round(sum / categorias.length);
}

function buildCategoria(id: string, label: string, checks: QualidadeCheck[]): QualidadeCategoria {
  return { id, label, pct: pctFromChecks(checks), checks };
}

/**
 * Evaluate completeness quality for a single listing.
 */
export function avaliarQualidadeUnidade(unit: QualidadeUnitInput): QualidadeUnidadeResult {
  const meta = unit.metadata;

  const categorias: QualidadeCategoria[] = [
    buildCategoria('apresentacao', 'Apresentação', [
      { id: 'fotos_capa', ok: hasFotos(unit.midia), label: 'Fotos e capa' },
      { id: 'titulo', ok: Boolean(unit.titulo?.trim()), label: 'Título do anúncio' },
      { id: 'descricao', ok: hasDescricaoAnuncio(meta), label: 'Descrição do anúncio' },
    ]),
    buildCategoria('espaco', 'Espaço', [
      { id: 'tipo', ok: hasTipoPropriedade(meta, unit.tipoId), label: 'Tipo de propriedade' },
      { id: 'camas', ok: hasCamas(meta), label: 'Camas configuradas' },
      {
        id: 'capacidade',
        ok: num(unit.capacidadeMax) > 0,
        label: 'Capacidade de hóspedes',
      },
      {
        id: 'comodidades',
        ok: hasComodidadesBasicas(unit.amenidades),
        label: 'Comodidades básicas',
      },
    ]),
    buildCategoria('preco', 'Preço', [
      { id: 'preco_diaria', ok: num(unit.precoDiaria) > 0, label: 'Preço por diária' },
      {
        id: 'descontos_ou_inteligente',
        ok: hasPrecificacao(unit),
        label: 'Descontos ou Preço Inteligente',
      },
    ]),
    buildCategoria('disponibilidade', 'Disponibilidade', [
      {
        id: 'min_max_noites',
        ok: num(unit.minNoites) > 0 && num(unit.maxNoites) > 0,
        label: 'Mínimo e máximo de noites',
      },
      {
        id: 'periodo_disponibilidade',
        ok: num(unit.periodoDisponibilidadeMeses) > 0,
        label: 'Período de disponibilidade',
      },
      {
        id: 'config_reserva',
        ok: hasConfigReserva(meta),
        label: 'Configuração de reserva',
      },
    ]),
    buildCategoria('local_confianca', 'Local e confiança', [
      { id: 'cidade', ok: hasCidade(meta), label: 'Cidade informada' },
      { id: 'verificacao', ok: hasVerificacao(unit), label: 'Anúncio verificado ou completo' },
      {
        id: 'seguranca_ou_acessibilidade',
        ok: hasSegurancaOuAcessibilidade(meta),
        label: 'Segurança ou acessibilidade',
      },
    ]),
    buildCategoria('experiencia', 'Experiência', [
      { id: 'guia_chegada', ok: hasGuiaChegada(meta), label: 'Guia de chegada' },
      { id: 'idiomas', ok: hasIdiomas(meta), label: 'Idiomas atendidos (opcional)' },
    ]),
  ];

  return { score: scoreFromCategorias(categorias), categorias };
}

/**
 * Aggregate completeness quality across a host portfolio.
 */
export function avaliarQualidadePortfolio(units: QualidadeUnitInput[]): QualidadePortfolioResult {
  if (units.length === 0) {
    return {
      scoreMedio: null,
      categorias: CATEGORIA_DEFS.map((c) => ({ ...c, pct: 0 })),
      porUnidade: [],
    };
  }

  const porUnidade: QualidadePorUnidade[] = units.map((u) => {
    const r = avaliarQualidadeUnidade(u);
    return {
      id: u.id,
      titulo: String(u.titulo ?? '').trim() || `Anúncio #${u.id}`,
      score: r.score,
      categorias: r.categorias,
    };
  });

  const categorias: QualidadeCategoriaResumo[] = CATEGORIA_DEFS.map((def) => {
    const pcts = porUnidade.map(
      (u) => u.categorias.find((c) => c.id === def.id)?.pct ?? 0,
    );
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    return { id: def.id, label: def.label, pct: Math.round(avg) };
  });

  const scoreMedio =
    Math.round(
      (porUnidade.reduce((acc, u) => acc + u.score, 0) / porUnidade.length) * 10,
    ) / 10;

  return { scoreMedio, categorias, porUnidade };
}

const DICA_POR_CATEGORIA: Record<string, string> = {
  apresentacao: 'Adicione fotos, título e descrição para melhorar a apresentação do anúncio.',
  espaco: 'Complete tipo, camas, capacidade e comodidades básicas do espaço.',
  preco: 'Defina preço por diária e ative descontos ou Preço Inteligente.',
  disponibilidade: 'Configure noites mín/máx, disponibilidade e modo de reserva.',
  local_confianca: 'Informe cidade, segurança/acessibilidade e publique o anúncio.',
  experiencia: 'Preencha o guia de chegada (Wi-Fi, check-in ou instruções).',
};

/**
 * Generate actionable tips from the lowest-scoring categories.
 */
export function gerarDicasQualidade(result: QualidadePortfolioResult): string[] {
  if (result.porUnidade.length === 0) {
    return ['Cadastre um anúncio para ver a completude do perfil.'];
  }

  const dicas: string[] = [];
  const sorted = [...result.categorias].sort((a, b) => a.pct - b.pct);
  for (const cat of sorted.slice(0, 3)) {
    if (cat.pct >= 100) continue;
    const hint = DICA_POR_CATEGORIA[cat.id];
    if (hint) dicas.push(`${cat.label} (${cat.pct}%): ${hint}`);
  }
  if (dicas.length === 0 && (result.scoreMedio ?? 0) < 100) {
    dicas.push('Revise os anúncios com menor completude na tabela abaixo.');
  }
  return dicas;
}
