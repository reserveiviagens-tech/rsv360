/**
 * Calendar pricing context: weekend, Brazilian holidays, season tier, price guardrails.
 * Holidays: national (fixed+movable) + state + capital/municipal curated catalog.
 */

import {
  FERIADOS_ESTADUAIS,
  FERIADOS_MUNICIPAIS_CAPITAIS,
  normalizarCidade,
  resolverUfPorCidade,
  type FeriadoTipo,
} from './feriados-brasil.data';

export type TemporadaTipo = 'alta' | 'media' | 'baixa' | 'feriado';

export type FeriadoInfo = {
  data: string;
  nome: string;
  tipo?: FeriadoTipo;
  uf?: string;
  municipio?: string;
};

export type TemporadaInfo = {
  id: number;
  slug: string;
  nome: string;
  tipo: TemporadaTipo;
};

export type FaixaPreco = {
  minSugerido: number;
  referencia: number;
  maxSugerido: number;
};

export type AlertaPrecificacao = {
  nivel: 'ok' | 'abaixo' | 'acima';
  mensagem: string;
  faixa: FaixaPreco;
  tags: string[];
};

export type PeriodoTemporadaSeed = {
  temporada: 'baixa' | 'media' | 'alta' | 'feriado' | 'ferias_escolares';
  inicio: string;
  fim: string;
  rotulo?: string;
};

/** Fri–Sat night as weekend (host calendar convention). */
export function isFimDeSemana(isoDate: string): boolean {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const day = d.getDay();
  return day === 5 || day === 6;
}

/** Easter Sunday (Anonymous Gregorian algorithm). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function isoFromUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** DD/MM/YYYY (FeriadosAPI) → ISO + MM-DD. */
export function parseDataBrDdMmYyyy(br: string): { iso: string; md: string } | null {
  const m = String(br).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return { iso: `${yyyy}-${mm}-${dd}`, md: `${mm}-${dd}` };
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoFromUtc(d);
}

/** National BR holidays for a year (fixed + movable). */
export function feriadosNacionaisBr(year: number): FeriadoInfo[] {
  const easter = isoFromUtc(easterSunday(year));
  const fixed: Array<[string, string]> = [
    [`${year}-01-01`, 'Confraternização Universal'],
    [`${year}-04-21`, 'Tiradentes'],
    [`${year}-05-01`, 'Dia do Trabalho'],
    [`${year}-09-07`, 'Independência do Brasil'],
    [`${year}-10-12`, 'Nossa Senhora Aparecida'],
    [`${year}-11-02`, 'Finados'],
    [`${year}-11-15`, 'Proclamação da República'],
    [`${year}-11-20`, 'Dia da Consciência Negra'],
    [`${year}-12-25`, 'Natal'],
  ];
  const movable: FeriadoInfo[] = [
    { data: addDaysIso(easter, -48), nome: 'Carnaval', tipo: 'nacional' },
    { data: addDaysIso(easter, -47), nome: 'Carnaval', tipo: 'nacional' },
    { data: addDaysIso(easter, -2), nome: 'Sexta-feira Santa', tipo: 'nacional' },
    { data: easter, nome: 'Páscoa', tipo: 'nacional' },
    { data: addDaysIso(easter, 60), nome: 'Corpus Christi', tipo: 'nacional' },
  ];
  return [
    ...fixed.map(([data, nome]) => ({ data, nome, tipo: 'nacional' as const })),
    ...movable,
  ].sort((a, b) => a.data.localeCompare(b.data));
}

function applyFixed(year: number, list: typeof FERIADOS_ESTADUAIS): FeriadoInfo[] {
  return list.map((f) => ({
    data: `${year}-${f.md}`,
    nome: f.nome,
    tipo: f.tipo,
    uf: f.uf,
    municipio: f.municipio,
  }));
}

export type FeriadosFiltro = {
  /** Include state holidays for this UF (and all if 'ALL'). */
  uf?: string | null;
  /** City name for municipal match. */
  cidade?: string | null;
  /** When true, include every UF state holiday (busy calendar). */
  todosEstados?: boolean;
  /** When true, include all curated capital municipals. */
  todasCapitais?: boolean;
};

/**
 * Holidays for a year with optional geographic filter.
 * Always includes national. Defaults: UF from cidade (or GO for Caldas Novas market).
 */
export function feriadosBrasilAno(year: number, filtro: FeriadosFiltro = {}): FeriadoInfo[] {
  const out: FeriadoInfo[] = [...feriadosNacionaisBr(year)];
  const cidade = filtro.cidade ?? null;
  const uf =
    (filtro.uf && filtro.uf.toUpperCase()) ||
    resolverUfPorCidade(cidade) ||
    (filtro.todosEstados ? null : 'GO');

  if (filtro.todosEstados) {
    out.push(...applyFixed(year, FERIADOS_ESTADUAIS));
  } else if (uf) {
    out.push(...applyFixed(year, FERIADOS_ESTADUAIS.filter((f) => f.uf === uf)));
  }

  const cidadeN = normalizarCidade(cidade);
  if (filtro.todasCapitais) {
    out.push(...applyFixed(year, FERIADOS_MUNICIPAIS_CAPITAIS));
  } else {
    out.push(
      ...applyFixed(
        year,
        FERIADOS_MUNICIPAIS_CAPITAIS.filter((f) => {
          if (uf && f.uf !== uf) return false;
          if (!cidadeN) return f.uf === uf;
          return normalizarCidade(f.municipio) === cidadeN;
        }),
      ),
    );
  }

  // Dedupe by date+nome
  const seen = new Set<string>();
  return out
    .filter((f) => {
      const k = `${f.data}|${f.nome}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.data.localeCompare(b.data));
}

export type FeriadoMdRecorrente = {
  md: string;
  nome: string;
  tipo?: FeriadoTipo;
  uf?: string;
  municipio?: string;
};

/** Expand MM-DD patterns across years overlapping [de, ate]. */
export function expandFeriadosMd(
  rows: FeriadoMdRecorrente[],
  de: string,
  ate: string,
): FeriadoInfo[] {
  const startY = Number(de.slice(0, 4));
  const endY = Number(ate.slice(0, 4));
  const out: FeriadoInfo[] = [];
  for (let y = startY; y <= endY; y += 1) {
    for (const r of rows) {
      if (!/^\d{2}-\d{2}$/.test(r.md)) continue;
      const data = `${y}-${r.md}`;
      if (data >= de && data <= ate) {
        out.push({
          data,
          nome: r.nome,
          tipo: r.tipo ?? 'municipal',
          uf: r.uf,
          municipio: r.municipio,
        });
      }
    }
  }
  return out;
}

export function feriadosNoIntervalo(
  de: string,
  ate: string,
  filtro: FeriadosFiltro = {},
  extras: FeriadoInfo[] = [],
): Map<string, FeriadoInfo> {
  const startY = Number(de.slice(0, 4));
  const endY = Number(ate.slice(0, 4));
  const map = new Map<string, FeriadoInfo>();
  const merge = (f: FeriadoInfo) => {
    if (f.data < de || f.data > ate) return;
    const prev = map.get(f.data);
    // Prefer national > estadual > municipal when colliding
    if (!prev || rankTipo(f.tipo) < rankTipo(prev.tipo)) {
      map.set(f.data, f);
    }
  };
  for (let y = startY; y <= endY; y += 1) {
    for (const f of feriadosBrasilAno(y, filtro)) merge(f);
  }
  for (const f of extras) merge(f);
  return map;
}

function rankTipo(t?: FeriadoTipo): number {
  if (t === 'nacional') return 0;
  if (t === 'estadual') return 1;
  return 2;
}

export function classificarTemporadaTipo(slugOrNome: string | null | undefined): TemporadaTipo {
  const s = String(slugOrNome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!s) return 'media';
  if (s.includes('feriado') || s.includes('holiday') || s.includes('reveillon') || s.includes('natal')) {
    return 'feriado';
  }
  if (s.includes('ferias') || s.includes('escolar')) return 'alta';
  if (s.includes('alta') || s.includes('peak') || s.includes('high') || s.includes('carnaval')) {
    return 'alta';
  }
  if (s.includes('baixa') || s.includes('low') || s.includes('off')) return 'baixa';
  if (s.includes('media') || s.includes('mid')) return 'media';
  return 'media';
}

const FAIXA_POR_TIPO: Record<TemporadaTipo, { min: number; ref: number; max: number }> = {
  baixa: { min: 0.7, ref: 0.85, max: 1.05 },
  media: { min: 0.9, ref: 1.0, max: 1.25 },
  alta: { min: 1.1, ref: 1.3, max: 1.7 },
  feriado: { min: 1.25, ref: 1.55, max: 2.1 },
};

function roundMoney(n: number): number {
  return Math.round(n);
}

export function calcularFaixaPreco(input: {
  precoBase: number;
  precoFimSemana?: number | null;
  tipo: TemporadaTipo;
  fimDeSemana: boolean;
  feriado: boolean;
}): FaixaPreco {
  const base = Number.isFinite(input.precoBase) && input.precoBase > 0 ? input.precoBase : 100;
  let tipo: TemporadaTipo = input.tipo;
  if (input.feriado) tipo = 'feriado';
  const mult = FAIXA_POR_TIPO[tipo];
  let minSugerido = roundMoney(base * mult.min);
  let referencia = roundMoney(base * mult.ref);
  let maxSugerido = roundMoney(base * mult.max);

  if (input.fimDeSemana && input.precoFimSemana != null && Number.isFinite(input.precoFimSemana)) {
    const fds = Number(input.precoFimSemana);
    referencia = Math.max(referencia, roundMoney(fds));
    minSugerido = Math.max(minSugerido, roundMoney(fds * 0.95));
    maxSugerido = Math.max(maxSugerido, roundMoney(fds * 1.25));
  } else if (input.fimDeSemana) {
    referencia = Math.max(referencia, roundMoney(base * 1.15));
    minSugerido = Math.max(minSugerido, roundMoney(base * 1.05));
  }

  if (minSugerido > maxSugerido) maxSugerido = minSugerido;
  return { minSugerido, referencia, maxSugerido };
}

export function avaliarPrecificacao(input: {
  precoEfetivo: number;
  precoBase: number;
  precoFimSemana?: number | null;
  temporada: TemporadaInfo | null;
  fimDeSemana: boolean;
  feriado: FeriadoInfo | null;
}): AlertaPrecificacao {
  const tipo = input.feriado ? 'feriado' : input.temporada?.tipo ?? 'media';
  const faixa = calcularFaixaPreco({
    precoBase: input.precoBase,
    precoFimSemana: input.precoFimSemana,
    tipo,
    fimDeSemana: input.fimDeSemana,
    feriado: Boolean(input.feriado),
  });

  const tags: string[] = [];
  if (input.fimDeSemana) tags.push('Final de semana');
  if (input.feriado) {
    const escopo =
      input.feriado.tipo === 'estadual'
        ? `estadual${input.feriado.uf ? ` ${input.feriado.uf}` : ''}`
        : input.feriado.tipo === 'municipal'
          ? 'municipal'
          : 'nacional';
    tags.push(`Feriado (${escopo}): ${input.feriado.nome}`);
  }
  if (input.temporada) {
    const label =
      input.temporada.tipo === 'alta'
        ? input.temporada.slug.includes('ferias')
          ? 'Férias escolares / alta'
          : 'Alta temporada'
        : input.temporada.tipo === 'baixa'
          ? 'Baixa temporada'
          : input.temporada.tipo === 'feriado'
            ? 'Temporada feriado / pico'
            : 'Média temporada';
    tags.push(label);
  } else if (!input.feriado) {
    tags.push('Média temporada');
  }

  const p = input.precoEfetivo;
  let nivel: AlertaPrecificacao['nivel'] = 'ok';
  let mensagem = `Preço dentro da faixa sugerida (R$${faixa.minSugerido}–R$${faixa.maxSugerido}). Referência: R$${faixa.referencia}.`;

  if (Number.isFinite(p) && p > 0) {
    if (p < faixa.minSugerido) {
      nivel = 'abaixo';
      mensagem = `Preço abaixo do sugerido para esta data (mín. R$${faixa.minSugerido}). Risco de prejuízo ou deixar receita na mesa. Referência: R$${faixa.referencia}.`;
    } else if (p > faixa.maxSugerido) {
      nivel = 'acima';
      mensagem = `Preço acima do sugerido para esta data (máx. R$${faixa.maxSugerido}). Risco de baixa conversão. Referência: R$${faixa.referencia}.`;
    }
  }

  return { nivel, mensagem, faixa, tags };
}

export function labelTemporadaTipo(tipo: TemporadaTipo): string {
  switch (tipo) {
    case 'alta':
      return 'Alta temporada';
    case 'baixa':
      return 'Baixa temporada';
    case 'feriado':
      return 'Feriado / pico';
    default:
      return 'Média temporada';
  }
}

/**
 * Generate season windows for N years starting at anoInicio (inclusive).
 * Priority when overlapping in DB: feriado > ferias_escolares > alta > media > baixa.
 */
export function gerarPeriodosTemporadaAnos(
  anoInicio: number,
  quantidadeAnos: number,
): PeriodoTemporadaSeed[] {
  const periodos: PeriodoTemporadaSeed[] = [];
  const anoFim = anoInicio + quantidadeAnos - 1;

  periodos.push({
    temporada: 'baixa',
    inicio: `${anoInicio}-01-01`,
    fim: `${anoFim}-12-31`,
    rotulo: 'Baixa catch-all',
  });

  for (let y = anoInicio; y <= anoFim; y += 1) {
    const easter = isoFromUtc(easterSunday(y));

    // Média
    periodos.push({ temporada: 'media', inicio: `${y}-03-01`, fim: `${y}-03-31`, rotulo: 'Média mar' });
    periodos.push({ temporada: 'media', inicio: `${y}-05-01`, fim: `${y}-05-31`, rotulo: 'Média mai' });
    periodos.push({ temporada: 'media', inicio: `${y}-08-01`, fim: `${y}-08-31`, rotulo: 'Média ago' });
    periodos.push({ temporada: 'media', inicio: `${y}-10-01`, fim: `${y}-10-31`, rotulo: 'Média out' });

    // Alta (fora de férias escolares explícitas)
    periodos.push({ temporada: 'alta', inicio: `${y}-06-15`, fim: `${y}-06-30`, rotulo: 'Alta pré-férias' });
    periodos.push({ temporada: 'alta', inicio: `${y}-11-15`, fim: `${y}-11-30`, rotulo: 'Alta pré-Natal' });

    // Férias escolares (verão + inverno)
    periodos.push({
      temporada: 'ferias_escolares',
      inicio: `${y}-07-01`,
      fim: `${y}-07-31`,
      rotulo: 'Férias julho',
    });
    periodos.push({
      temporada: 'ferias_escolares',
      inicio: `${y}-12-10`,
      fim: `${y}-12-19`,
      rotulo: 'Férias pré-Natal',
    });
    // Jan after New Year (summer continuation) — skip first year Jan if before start? include always
    periodos.push({
      temporada: 'ferias_escolares',
      inicio: `${y}-01-06`,
      fim: `${y}-01-31`,
      rotulo: 'Férias janeiro',
    });

    // Carnaval (sex → qua)
    periodos.push({
      temporada: 'feriado',
      inicio: addDaysIso(easter, -51),
      fim: addDaysIso(easter, -46),
      rotulo: 'Carnaval',
    });

    // Semana Santa (qui → seg)
    periodos.push({
      temporada: 'feriado',
      inicio: addDaysIso(easter, -3),
      fim: addDaysIso(easter, 1),
      rotulo: 'Semana Santa',
    });

    // Corpus Christi bridge (qua–sex)
    periodos.push({
      temporada: 'feriado',
      inicio: addDaysIso(easter, 59),
      fim: addDaysIso(easter, 61),
      rotulo: 'Corpus Christi',
    });

    // Fixed national long weekends / peaks
    periodos.push({ temporada: 'feriado', inicio: `${y}-04-20`, fim: `${y}-04-22`, rotulo: 'Tiradentes' });
    periodos.push({ temporada: 'feriado', inicio: `${y}-04-30`, fim: `${y}-05-02`, rotulo: 'Dia do Trabalho' });
    periodos.push({ temporada: 'feriado', inicio: `${y}-09-05`, fim: `${y}-09-08`, rotulo: 'Independência' });
    periodos.push({ temporada: 'feriado', inicio: `${y}-10-11`, fim: `${y}-10-13`, rotulo: 'N. Sra. Aparecida' });
    periodos.push({ temporada: 'feriado', inicio: `${y}-11-01`, fim: `${y}-11-03`, rotulo: 'Finados' });
    periodos.push({ temporada: 'feriado', inicio: `${y}-11-14`, fim: `${y}-11-16`, rotulo: 'Proclamação' });
    periodos.push({ temporada: 'feriado', inicio: `${y}-11-19`, fim: `${y}-11-21`, rotulo: 'Consciência Negra' });

    // Natal + Réveillon
    periodos.push({
      temporada: 'feriado',
      inicio: `${y}-12-20`,
      fim: `${y}-12-31`,
      rotulo: 'Natal / Réveillon',
    });
    periodos.push({
      temporada: 'feriado',
      inicio: `${y}-01-01`,
      fim: `${y}-01-05`,
      rotulo: 'Ano Novo',
    });
  }

  return periodos;
}
