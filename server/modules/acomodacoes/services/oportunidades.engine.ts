/**
 * Opportunity engine for host Desempenho (Reservei Viagens / RSV360°).
 * Pure functions — evaluated from listing fields + metadata.
 */

import {
  unidadeTemAcessibilidadeDeclarada,
  unidadeTemFotosAcessibilidadePendentes,
} from './acessibilidade-fotos.util';

export type OppCategoria = 'atraentes' | 'flexivel' | 'precos';

export type Oportunidade = {
  id: string;
  titulo: string;
  categoria: OppCategoria;
  /** 0–100 completion across eligible listings (or 100 if done). */
  pct: number;
  done: boolean;
  ctaPath?: string;
  /** Deep-link label, e.g. unit title. */
  ctaLabel?: string;
  ctaUnitId?: number;
  ctaUnitTitulo?: string;
};

export type OppUnitInput = {
  id: number;
  titulo?: string | null;
  statusPublicacao?: string | null;
  dadosCompletos?: boolean | null;
  amenidades?: unknown;
  midia?: unknown;
  precoDiaria?: string | number | null;
  minNoites?: number | null;
  maxNoites?: number | null;
  descontoSemanalPct?: string | number | null;
  descontoMensalPct?: string | number | null;
  descontoAntecipadaPct?: string | number | null;
  descontoUltimaHoraPct?: string | number | null;
  descontoNovoAnuncioPct?: string | number | null;
  periodoDisponibilidadeMeses?: number | null;
  politicaCancelamentoCurta?: string | null;
  precoInteligenteAtivo?: boolean | null;
  metadata?: unknown;
};

/** Editor section query for deep-links from Desempenho CTAs. */
export const OPP_SECTION: Record<string, string> = {
  fotos: 'fotos',
  'titulo-preco': 'titulo',
  completo: 'titulo',
  wifi: 'comodidades',
  ar: 'comodidades',
  tv: 'comodidades',
  'cozinha-basica': 'comodidades',
  pets: 'regras',
  instantanea: 'config-reserva',
  'self-checkin': 'metodo-checkin',
  'espaco-trabalho': 'comodidades',
  berco: 'camas',
  'estadias-curtas': 'disponibilidade',
  'antecedencia-6m': 'disponibilidade',
  'viagens-longas': 'disponibilidade',
  'cancelamento-flexivel': 'cancelamento',
  'desconto-semanal': 'descontos',
  'desconto-mensal': 'descontos',
  'desconto-antecipada': 'descontos',
  'desconto-ultima-hora': 'descontos',
  'novo-anuncio': 'descontos',
  'preco-inteligente': 'precos',
  acessibilidade: 'acessibilidade',
  'acessibilidade-publicar': 'acessibilidade',
};

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

function pctAcross(units: OppUnitInput[], predicate: (u: OppUnitInput) => boolean): number {
  if (units.length === 0) return 0;
  const ok = units.filter(predicate).length;
  if (ok === 0) return 0;
  if (ok >= units.length) return 100;
  return Math.max(1, Math.round((ok / units.length) * 100));
}

function truncateTitle(title: string, max = 42): string {
  const t = title.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * Prefer the first unit that still needs the action; deep-link with ?secao=.
 */
export function resolverCtaAfinidade(
  units: OppUnitInput[],
  ok: (u: OppUnitInput) => boolean,
  oppId: string,
): Pick<Oportunidade, 'ctaPath' | 'ctaLabel' | 'ctaUnitId' | 'ctaUnitTitulo'> {
  const pending = units.find((u) => !ok(u)) ?? units[0];
  if (!pending) {
    return { ctaPath: '/anfitriao/unidades', ctaLabel: 'Abrir anúncios' };
  }
  const secao = OPP_SECTION[oppId];
  const qs = secao ? `?secao=${encodeURIComponent(secao)}` : '';
  const titulo = String(pending.titulo ?? '').trim() || `Anúncio #${pending.id}`;
  return {
    ctaPath: `/anfitriao/unidades/${pending.id}${qs}`,
    ctaLabel: `Abrir: ${truncateTitle(titulo)}`,
    ctaUnitId: pending.id,
    ctaUnitTitulo: titulo,
  };
}

/**
 * Evaluate opportunities for a host portfolio.
 */
export function avaliarOportunidades(units: OppUnitInput[]): Oportunidade[] {
  if (units.length === 0) {
    return [
      {
        id: 'sem-unidades',
        titulo: 'Cadastre ou vincule um anúncio para ver oportunidades',
        categoria: 'atraentes',
        pct: 0,
        done: false,
        ctaPath: '/anfitriao/unidades',
        ctaLabel: 'Abrir anúncios',
      },
    ];
  }

  const defs: Array<{
    id: string;
    titulo: string;
    categoria: OppCategoria;
    ok: (u: OppUnitInput) => boolean;
  }> = [
    {
      id: 'fotos',
      titulo: 'Adicione fotos e capa ao anúncio',
      categoria: 'atraentes',
      ok: (u) => hasFotos(u.midia),
    },
    {
      id: 'titulo-preco',
      titulo: 'Defina título e preço básico',
      categoria: 'atraentes',
      ok: (u) => Boolean(u.titulo?.trim()) && num(u.precoDiaria) > 0,
    },
    {
      id: 'completo',
      titulo: 'Complete os dados do anúncio',
      categoria: 'atraentes',
      ok: (u) =>
        Boolean(u.dadosCompletos) ||
        ['completo', 'em_aprovacao', 'publicado'].includes(String(u.statusPublicacao)),
    },
    {
      id: 'wifi',
      titulo: 'Adicione Wi-Fi às comodidades',
      categoria: 'atraentes',
      ok: (u) => hasAmenity(amenityIds(u.amenidades), 'wifi', 'wi-fi', 'internet'),
    },
    {
      id: 'ar',
      titulo: 'Adicione ar-condicionado',
      categoria: 'atraentes',
      ok: (u) => hasAmenity(amenityIds(u.amenidades), 'ar', 'ar-condicionado', 'arcondicionado'),
    },
    {
      id: 'tv',
      titulo: 'Adicione TV',
      categoria: 'atraentes',
      ok: (u) => hasAmenity(amenityIds(u.amenidades), 'tv', 'televis'),
    },
    {
      id: 'cozinha-basica',
      titulo: 'Forneça o básico para cozinhar',
      categoria: 'atraentes',
      ok: (u) => hasAmenity(amenityIds(u.amenidades), 'cozinha', 'kitchen', 'utensilio'),
    },
    {
      id: 'pets',
      titulo: 'Permita animais de estimação em seu espaço',
      categoria: 'atraentes',
      ok: (u) => {
        const meta = asRecord(u.metadata);
        const regras = asRecord(meta.regrasCasa);
        return regras.pets === true || hasAmenity(amenityIds(u.amenidades), 'pet', 'animal');
      },
    },
    {
      id: 'instantanea',
      titulo: 'Permita que os hóspedes façam Reservas Instantâneas',
      categoria: 'atraentes',
      ok: (u) => asRecord(u.metadata).modoReserva === 'instantanea',
    },
    {
      id: 'self-checkin',
      titulo: 'Ofereça self check-in',
      categoria: 'atraentes',
      ok: (u) => {
        const guia = asRecord(asRecord(u.metadata).guiaChegada);
        const m = String(guia.metodoCheckIn ?? '').toLowerCase();
        return (
          m.includes('fechadura') ||
          m.includes('teclado') ||
          m.includes('cofre') ||
          m.includes('self')
        );
      },
    },
    {
      id: 'espaco-trabalho',
      titulo: 'Defina um espaço de trabalho adequado para notebook',
      categoria: 'atraentes',
      ok: (u) =>
        hasAmenity(amenityIds(u.amenidades), 'trabalho', 'workspace', 'escritorio', 'notebook'),
    },
    {
      id: 'berco',
      titulo: 'Adicione um berço',
      categoria: 'atraentes',
      ok: (u) => {
        const camas = asRecord(asRecord(u.metadata).tiposCama);
        return (
          num(camas['berco']) > 0 ||
          num(camas['Berço']) > 0 ||
          hasAmenity(amenityIds(u.amenidades), 'berço', 'berco')
        );
      },
    },
    {
      id: 'estadias-curtas',
      titulo: 'Receba hóspedes em estadias curtas',
      categoria: 'flexivel',
      ok: (u) => num(u.minNoites) > 0 && num(u.minNoites) <= 2,
    },
    {
      id: 'antecedencia-6m',
      titulo: 'Permita que os hóspedes reservem com seis meses de antecedência',
      categoria: 'flexivel',
      ok: (u) => num(u.periodoDisponibilidadeMeses) >= 6,
    },
    {
      id: 'viagens-longas',
      titulo: 'Viagens mais longas ativadas',
      categoria: 'flexivel',
      ok: (u) => num(u.maxNoites) >= 28,
    },
    {
      id: 'cancelamento-flexivel',
      titulo: 'Mudar para a política de cancelamento Flexível',
      categoria: 'flexivel',
      ok: (u) => String(u.politicaCancelamentoCurta ?? '').toLowerCase().includes('flex'),
    },
    {
      id: 'desconto-semanal',
      titulo: 'Ofereça descontos semanais',
      categoria: 'precos',
      ok: (u) => num(u.descontoSemanalPct) > 0,
    },
    {
      id: 'desconto-mensal',
      titulo: 'Ofereça descontos mensais',
      categoria: 'precos',
      ok: (u) => num(u.descontoMensalPct) > 0,
    },
    {
      id: 'desconto-antecipada',
      titulo: 'Adicione um desconto para reservas antecipadas',
      categoria: 'precos',
      ok: (u) => num(u.descontoAntecipadaPct) > 0,
    },
    {
      id: 'desconto-ultima-hora',
      titulo: 'Adicione um desconto de última hora',
      categoria: 'precos',
      ok: (u) => num(u.descontoUltimaHoraPct) > 0,
    },
    {
      id: 'novo-anuncio',
      titulo: 'Ofereça uma promoção de novo anúncio',
      categoria: 'precos',
      ok: (u) => num(u.descontoNovoAnuncioPct) > 0,
    },
    {
      id: 'preco-inteligente',
      titulo: 'Ative o Preço Inteligente',
      categoria: 'precos',
      ok: (u) => u.precoInteligenteAtivo === true,
    },
    {
      id: 'acessibilidade',
      titulo: 'Declare e publique recursos de acessibilidade',
      categoria: 'atraentes',
      ok: (u) => unidadeTemAcessibilidadeDeclarada(u.metadata),
    },
    {
      id: 'acessibilidade-publicar',
      titulo: 'Conclua a revisão das fotos de acessibilidade',
      categoria: 'atraentes',
      ok: (u) => !unidadeTemFotosAcessibilidadePendentes(u.metadata),
    },
  ];

  return defs.map((d) => {
    const pct = pctAcross(units, d.ok);
    const cta = resolverCtaAfinidade(units, d.ok, d.id);
    return {
      id: d.id,
      titulo: d.titulo,
      categoria: d.categoria,
      pct,
      done: pct >= 100,
      ...cta,
    };
  });
}

export function resumoOportunidades(opps: Oportunidade[]): {
  pendentes: number;
  concluidas: number;
  pctNaoConcluidas: number;
} {
  const pendentes = opps.filter((o) => !o.done).length;
  const concluidas = opps.filter((o) => o.done).length;
  const total = opps.length || 1;
  return {
    pendentes,
    concluidas,
    pctNaoConcluidas: Math.round((pendentes / total) * 100),
  };
}
