/**
 * Property-type metadata for listing editor (host-only jsonb fields).
 */

export const TIPO_PROPRIEDADE_TIPOS = [
  { id: 'apartamento', label: 'Apartamento' },
  { id: 'casa', label: 'Casa' },
  { id: 'condominio', label: 'Condomínio' },
  { id: 'studio', label: 'Studio' },
  { id: 'loft', label: 'Loft' },
  { id: 'chale', label: 'Chalé' },
  { id: 'kitnet', label: 'Kitnet' },
  { id: 'pousada', label: 'Pousada' },
  { id: 'outro', label: 'Outro' },
] as const;

/** How guests book the space (entire place / private room / shared). */
export const TIPO_PROPRIEDADE_ACOMODACOES = [
  { id: 'espaco_inteiro', label: 'Espaço inteiro' },
  { id: 'quarto_privativo', label: 'Quarto privativo' },
  { id: 'quarto_compartilhado', label: 'Quarto compartilhado' },
] as const;

/** How the listing represents the space (aligned to acomodação catalogs). */
export const TIPO_PROPRIEDADE_REPRESENTACOES = TIPO_PROPRIEDADE_ACOMODACOES;

export type TipoPropriedadeTipoId = (typeof TIPO_PROPRIEDADE_TIPOS)[number]['id'];
export type TipoPropriedadeAcomodacaoId = (typeof TIPO_PROPRIEDADE_ACOMODACOES)[number]['id'];

export type TipoPropriedadeMeta = {
  representacao?: string;
  tipo?: string;
  acomodacao?: string;
  andares?: number;
  andar?: number;
  ano?: number;
  tamanhoM2?: number;
};

const LEGACY_TIPO: Record<string, string> = Object.fromEntries([
  ...TIPO_PROPRIEDADE_TIPOS.map((t) => [t.id, t.id] as const),
  ...TIPO_PROPRIEDADE_TIPOS.map((t) => [t.label.toLowerCase(), t.id] as const),
  ['chalé', 'chale'],
  ['condominio', 'condominio'],
  ['condomínio', 'condominio'],
]);

const LEGACY_ACOMODACAO: Record<string, string> = Object.fromEntries([
  ...TIPO_PROPRIEDADE_ACOMODACOES.map((t) => [t.id, t.id] as const),
  ...TIPO_PROPRIEDADE_ACOMODACOES.map((t) => [t.label.toLowerCase(), t.id] as const),
  ['espaço inteiro', 'espaco_inteiro'],
  ['espaco inteiro', 'espaco_inteiro'],
  ['quarto privado', 'quarto_privativo'],
]);

const YEAR_MIN = 1800;
const YEAR_MAX = new Date().getFullYear() + 2;

function asCatalogId(raw: unknown, legacy: Record<string, string>): string | undefined {
  if (raw == null || raw === '') return undefined;
  if (typeof raw !== 'string') return undefined;
  const key = raw.trim().toLowerCase();
  return legacy[key];
}

function asIntInRange(
  raw: unknown,
  min: number,
  max: number,
): { ok: true; value?: number } | { ok: false; error: 'tipo_propriedade_invalido'; message: string } {
  if (raw == null || raw === '') return { ok: true, value: undefined };
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return {
      ok: false,
      error: 'tipo_propriedade_invalido',
      message: 'Valores numéricos do tipo de propriedade devem ser inteiros',
    };
  }
  if (n < min || n > max) {
    return {
      ok: false,
      error: 'tipo_propriedade_invalido',
      message: `Valor fora do intervalo permitido (${min}–${max})`,
    };
  }
  return { ok: true, value: n };
}

function asPositiveNumber(
  raw: unknown,
  max: number,
): { ok: true; value?: number } | { ok: false; error: 'tipo_propriedade_invalido'; message: string } {
  if (raw == null || raw === '') return { ok: true, value: undefined };
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > max) {
    return {
      ok: false,
      error: 'tipo_propriedade_invalido',
      message: `Tamanho deve ser um número entre 0 e ${max} m²`,
    };
  }
  return { ok: true, value: Math.round(n * 100) / 100 };
}

export type TipoPropriedadeValidationOk = { ok: true; value: TipoPropriedadeMeta };
export type TipoPropriedadeValidationErr = {
  ok: false;
  error: 'tipo_propriedade_invalido';
  message: string;
};

export function validateTipoPropriedade(
  raw: unknown,
): TipoPropriedadeValidationOk | TipoPropriedadeValidationErr {
  if (raw == null) return { ok: true, value: {} };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      error: 'tipo_propriedade_invalido',
      message: 'Tipo de propriedade inválido',
    };
  }
  const o = raw as Record<string, unknown>;

  const tipo = asCatalogId(o.tipo, LEGACY_TIPO);
  if (o.tipo != null && o.tipo !== '' && !tipo) {
    return { ok: false, error: 'tipo_propriedade_invalido', message: 'Tipo de imóvel inválido' };
  }
  const acomodacao = asCatalogId(o.acomodacao, LEGACY_ACOMODACAO);
  if (o.acomodacao != null && o.acomodacao !== '' && !acomodacao) {
    return {
      ok: false,
      error: 'tipo_propriedade_invalido',
      message: 'Tipo de acomodação inválido',
    };
  }
  const representacao = asCatalogId(o.representacao, LEGACY_ACOMODACAO);
  if (o.representacao != null && o.representacao !== '' && !representacao) {
    return {
      ok: false,
      error: 'tipo_propriedade_invalido',
      message: 'Representação do espaço inválida',
    };
  }

  const andares = asIntInRange(o.andares, 1, 200);
  if (!andares.ok) return andares;
  const andar = asIntInRange(o.andar, -5, 200);
  if (!andar.ok) return andar;
  const ano = asIntInRange(o.ano, YEAR_MIN, YEAR_MAX);
  if (!ano.ok) return ano;
  const tamanho = asPositiveNumber(o.tamanhoM2, 100_000);
  if (!tamanho.ok) return tamanho;

  const value: TipoPropriedadeMeta = {};
  if (tipo) value.tipo = tipo;
  if (acomodacao) value.acomodacao = acomodacao;
  if (representacao) value.representacao = representacao;
  if (andares.value != null) value.andares = andares.value;
  if (andar.value != null) value.andar = andar.value;
  if (ano.value != null) value.ano = ano.value;
  if (tamanho.value != null) value.tamanhoM2 = tamanho.value;

  return { ok: true, value };
}

export function labelTipoPropriedade(id: string | undefined, kind: 'tipo' | 'acomodacao'): string | null {
  if (!id) return null;
  const list = kind === 'tipo' ? TIPO_PROPRIEDADE_TIPOS : TIPO_PROPRIEDADE_ACOMODACOES;
  return list.find((t) => t.id === id)?.label ?? null;
}

export function summarizeTipoPropriedade(meta: TipoPropriedadeMeta | null | undefined): string | null {
  if (!meta) return null;
  const parts: string[] = [];
  const tipo = labelTipoPropriedade(meta.tipo, 'tipo');
  const aco = labelTipoPropriedade(meta.acomodacao || meta.representacao, 'acomodacao');
  if (tipo) parts.push(tipo);
  if (aco) parts.push(aco);
  if (meta.tamanhoM2 != null) parts.push(`${meta.tamanhoM2} m²`);
  if (meta.andar != null) parts.push(`Andar ${meta.andar}`);
  return parts.length ? parts.join(' · ') : null;
}
