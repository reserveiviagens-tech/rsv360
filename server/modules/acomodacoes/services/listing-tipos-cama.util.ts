/**
 * Bed-type counters for listing editor (metadata.tiposCama).
 */

export const CAMA_CATALOG = [
  { id: 'solteiro', label: 'Solteiro', icon: '🛏' },
  { id: 'casal', label: 'Casal', icon: '🛏' },
  { id: 'queen', label: 'Queen', icon: '🛏' },
  { id: 'king', label: 'King', icon: '🛏' },
  { id: 'viuva', label: 'Viúva', icon: '🛏' },
  { id: 'beliche', label: 'Beliche', icon: '🪜' },
  { id: 'sofa_cama', label: 'Sofá-cama', icon: '🛋' },
  { id: 'sofa', label: 'Sofá', icon: '🛋' },
  { id: 'colchao_chao', label: 'Colchão no chão', icon: '🟫' },
  { id: 'colchao_ar', label: 'Colchão de ar', icon: '💨' },
  { id: 'berco', label: 'Berço', icon: '🍼' },
  { id: 'cama_infantil', label: 'Cama infantil', icon: '🧸' },
  { id: 'rede', label: 'Rede', icon: '🪢' },
  { id: 'colchao_agua', label: 'Colchão de água', icon: '💧' },
] as const;

export type CamaTipoId = (typeof CAMA_CATALOG)[number]['id'];

export const CAMA_COUNT_MAX = 30;

const BY_ID = new Map(CAMA_CATALOG.map((c) => [c.id, c]));

const LEGACY_TO_ID: Record<string, CamaTipoId> = Object.fromEntries([
  ...CAMA_CATALOG.map((c) => [c.id, c.id] as const),
  ...CAMA_CATALOG.map((c) => [c.label.toLowerCase(), c.id] as const),
  ['viúva', 'viuva'],
  ['sofa-cama', 'sofa_cama'],
  ['sofá-cama', 'sofa_cama'],
  ['sofa cama', 'sofa_cama'],
  ['sofá cama', 'sofa_cama'],
  ['colchao no chao', 'colchao_chao'],
  ['colchão no chão', 'colchao_chao'],
  ['colchao de ar', 'colchao_ar'],
  ['colchão de ar', 'colchao_ar'],
  ['berço', 'berco'],
  ['colchao de agua', 'colchao_agua'],
  ['colchão de água', 'colchao_agua'],
]) as Record<string, CamaTipoId>;

export type TiposCamaValidationOk = { ok: true; value: Record<string, number> };
export type TiposCamaValidationErr = {
  ok: false;
  error: 'tipos_cama_invalido';
  message: string;
};

function resolveId(rawKey: string): CamaTipoId | null {
  const key = rawKey.trim().toLowerCase();
  return LEGACY_TO_ID[key] ?? null;
}

export function validateTiposCama(raw: unknown): TiposCamaValidationOk | TiposCamaValidationErr {
  if (raw == null) return { ok: true, value: {} };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'tipos_cama_invalido', message: 'Tipos de cama inválidos' };
  }

  const out: Record<string, number> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    const id = resolveId(key);
    if (!id) {
      return {
        ok: false,
        error: 'tipos_cama_invalido',
        message: `Tipo de cama desconhecido: ${key}`,
      };
    }
    if (val == null || val === '') continue;
    const n = typeof val === 'number' ? val : Number(val);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      return {
        ok: false,
        error: 'tipos_cama_invalido',
        message: 'Quantidades de cama devem ser inteiros ≥ 0',
      };
    }
    if (n > CAMA_COUNT_MAX) {
      return {
        ok: false,
        error: 'tipos_cama_invalido',
        message: `Máximo de ${CAMA_COUNT_MAX} por tipo de cama`,
      };
    }
    if (n > 0) out[id] = (out[id] ?? 0) + n;
  }

  return { ok: true, value: out };
}

function phraseFor(id: CamaTipoId, n: number): string {
  const label = BY_ID.get(id)?.label ?? id;
  const plural = n === 1 ? '' : 's';

  if (id === 'sofa_cama') return `${n} sofá-cama${plural}`;
  if (id === 'sofa') return `${n} sofá${n === 1 ? '' : 's'}`;
  if (id === 'berco') return `${n} berço${plural}`;
  if (id === 'rede') return `${n} rede${plural}`;
  if (id === 'beliche') return `${n} beliche${plural}`;
  if (id === 'colchao_chao') return `${n} colchão${plural} no chão`;
  if (id === 'colchao_ar') return `${n} colchão${plural} de ar`;
  if (id === 'colchao_agua') return `${n} colchão${plural} de água`;
  if (id === 'cama_infantil') return `${n} cama${plural} infantil${plural ? 'is' : ''}`;

  // Solteiro / Casal / Queen / King / Viúva
  const nome = label.toLowerCase();
  if (n === 1) return `1 cama de ${nome}`;
  return `${n} camas de ${nome}`;
}

export function summarizeTiposCama(raw: unknown): string | null {
  const validated = validateTiposCama(raw);
  if (!validated.ok) return null;
  const parts: string[] = [];
  for (const item of CAMA_CATALOG) {
    const n = validated.value[item.id] ?? 0;
    if (n > 0) parts.push(phraseFor(item.id, n));
  }
  return parts.length ? parts.join(', ') : null;
}

export function totalCamas(raw: unknown): number {
  const validated = validateTiposCama(raw);
  if (!validated.ok) return 0;
  return Object.values(validated.value).reduce((a, b) => a + b, 0);
}

/** Count of a bed type accepting legacy or canonical keys (for oportunidades). */
export function countCamaTipo(raw: unknown, ...keys: string[]): number {
  const validated = validateTiposCama(raw);
  if (!validated.ok) return 0;
  let total = 0;
  for (const key of keys) {
    const id = resolveId(key);
    if (id) total += validated.value[id] ?? 0;
  }
  return total;
}
