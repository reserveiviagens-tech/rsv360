/**
 * Client-side smart filter for host listings (name, rooms, capacity, amenities).
 * No PII — operates only on accommodation catalog fields.
 */

export type SearchableUnit = {
  id: number;
  titulo?: string | null;
  hotelId?: string | null;
  statusPublicacao?: string | null;
  quartos?: number | null;
  capacidadeMax?: number | null;
  capacidadeBase?: number | null;
  configBanheiro?: string | null;
  configSala?: string | null;
  amenidades?: unknown;
  utensilios?: unknown;
  eletrodomesticos?: unknown;
  precoDiaria?: string | number | null;
};

/** Synonym → canonical tokens used when matching amenity bags / free text. */
const FEATURE_ALIASES: Record<string, string[]> = {
  piscina: ['piscina', 'pool', 'aquecida'],
  wifi: ['wifi', 'wi-fi', 'internet', 'rede'],
  ar: ['ar', 'condicionado', 'climatizacao', 'ac'],
  estacionamento: ['estacionamento', 'garagem', 'vaga', 'parking'],
  pet: ['pet', 'pets', 'animal', 'cachorro', 'gato'],
  academia: ['academia', 'gym', 'fitness'],
  lavanderia: ['lavanderia', 'lavadora', 'maquina de lavar'],
  cozinha: ['cozinha', 'kitchen', 'fogao', 'microondas'],
  tv: ['tv', 'televisao', 'smart tv'],
  jacuzzi: ['jacuzzi', 'hidro', 'hidromassagem', 'spa'],
  vista: ['vista', 'mar', 'lagoa', 'parque'],
  acessivel: ['acessivel', 'acessibilidade', 'cadeirante'],
  cafe: ['cafe', 'cafe da manha', 'breakfast'],
  varanda: ['varanda', 'sacada', 'terrace', 'terraco'],
};

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

export function normalizeSearchText(s: string): string {
  return stripDiacritics(String(s || ''))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function flattenUnknown(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(flattenUnknown).join(' ');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .flatMap(([k, v]) => {
        if (v === true) return [k];
        if (v === false || v == null) return [];
        return [k, flattenUnknown(v)];
      })
      .join(' ');
  }
  return '';
}

function unitHaystack(unit: SearchableUnit): string {
  return normalizeSearchText(
    [
      unit.titulo,
      unit.hotelId,
      unit.statusPublicacao,
      unit.configBanheiro,
      unit.configSala,
      unit.quartos != null ? `${unit.quartos} quartos` : '',
      unit.capacidadeMax != null ? `${unit.capacidadeMax} hospedes capacidade` : '',
      unit.capacidadeBase != null ? `${unit.capacidadeBase} base` : '',
      flattenUnknown(unit.amenidades),
      flattenUnknown(unit.utensilios),
      flattenUnknown(unit.eletrodomesticos),
    ]
      .filter(Boolean)
      .join(' '),
  );
}

export type ParsedUnitQuery = {
  raw: string;
  tokens: string[];
  /** Exact room count when query says "3 quartos" / "2 bedrooms". */
  quartos?: number;
  /** Min rooms when query says "quartos 3+" / "pelo menos 2 quartos". */
  minQuartos?: number;
  /** Exact guest capacity. */
  capacidade?: number;
  minCapacidade?: number;
  /** Feature keys from FEATURE_ALIASES that must match. */
  features: string[];
};

const ROOM_EXACT_RE =
  /(?:^|\s)(?:com\s+)?(\d+)\s*(?:quartos?|qtos?|bedrooms?|beds?|dormitorios?)(?:\s|$)/i;
const ROOM_MIN_RE =
  /(?:^|\s)(?:pelo\s+menos\s+|min(?:imo)?\s+|>=\s*)(\d+)\s*(?:quartos?|qtos?)(?:\s|$)|(?:^|\s)(\d+)\s*\+\s*(?:quartos?|qtos?)(?:\s|$)|(?:^|\s)quartos?\s*(?:>=|:)\s*(\d+)(?:\s|$)/i;
const CAP_EXACT_RE =
  /(?:^|\s)(?:ate\s+|para\s+|cap(?:acidade)?\s*)?(\d+)\s*(?:hospedes?|pessoas?|pax|capacidade)(?:\s|$)/i;
const CAP_MIN_RE =
  /(?:^|\s)(?:pelo\s+menos\s+|min(?:imo)?\s+)(\d+)\s*(?:hospedes?|pessoas?)(?:\s|$)|(?:^|\s)(\d+)\s*\+\s*(?:hospedes?|pessoas?)(?:\s|$)/i;

export function parseUnitSearchQuery(query: string): ParsedUnitQuery {
  const raw = String(query || '').trim();
  const norm = normalizeSearchText(raw);
  const features: string[] = [];
  let rest = norm;
  let quartos: number | undefined;
  let minQuartos: number | undefined;
  let capacidade: number | undefined;
  let minCapacidade: number | undefined;

  const roomMin = rest.match(ROOM_MIN_RE);
  if (roomMin) {
    minQuartos = Number(roomMin[1] || roomMin[2] || roomMin[3]);
    rest = rest.replace(ROOM_MIN_RE, ' ');
  } else {
    const room = rest.match(ROOM_EXACT_RE);
    if (room) {
      quartos = Number(room[1]);
      rest = rest.replace(ROOM_EXACT_RE, ' ');
    }
  }

  const capMin = rest.match(CAP_MIN_RE);
  if (capMin) {
    minCapacidade = Number(capMin[1] || capMin[2]);
    rest = rest.replace(CAP_MIN_RE, ' ');
  } else {
    const cap = rest.match(CAP_EXACT_RE);
    if (cap) {
      capacidade = Number(cap[1]);
      rest = rest.replace(CAP_EXACT_RE, ' ');
    }
  }

  for (const [key, aliases] of Object.entries(FEATURE_ALIASES)) {
    if (aliases.some((a) => rest.includes(normalizeSearchText(a)) || norm.includes(normalizeSearchText(a)))) {
      features.push(key);
      for (const a of aliases) {
        rest = rest.replace(new RegExp(`\\b${normalizeSearchText(a).replace(/\s+/g, '\\s+')}\\b`, 'g'), ' ');
      }
    }
  }

  const tokens = normalizeSearchText(rest)
    .split(' ')
    .filter((t) => t.length >= 2);

  return { raw, tokens, quartos, minQuartos, capacidade, minCapacidade, features };
}

function featureMatches(haystack: string, featureKey: string): boolean {
  const aliases = FEATURE_ALIASES[featureKey] ?? [featureKey];
  return aliases.some((a) => haystack.includes(normalizeSearchText(a)));
}

export function unitMatchesSearch(unit: SearchableUnit, query: string): boolean {
  const q = String(query || '').trim();
  if (!q) return true;

  const parsed = parseUnitSearchQuery(q);
  const hay = unitHaystack(unit);
  const rooms = Number(unit.quartos);
  const cap = Number(unit.capacidadeMax ?? unit.capacidadeBase);

  if (parsed.quartos != null) {
    if (!Number.isFinite(rooms) || rooms !== parsed.quartos) return false;
  }
  if (parsed.minQuartos != null) {
    if (!Number.isFinite(rooms) || rooms < parsed.minQuartos) return false;
  }
  if (parsed.capacidade != null) {
    if (!Number.isFinite(cap) || cap !== parsed.capacidade) return false;
  }
  if (parsed.minCapacidade != null) {
    if (!Number.isFinite(cap) || cap < parsed.minCapacidade) return false;
  }
  for (const f of parsed.features) {
    if (!featureMatches(hay, f)) return false;
  }
  for (const token of parsed.tokens) {
    if (!hay.includes(token)) return false;
  }

  // Query that only had numbers/features already handled; empty leftover is ok.
  if (
    parsed.tokens.length === 0 &&
    parsed.features.length === 0 &&
    parsed.quartos == null &&
    parsed.minQuartos == null &&
    parsed.capacidade == null &&
    parsed.minCapacidade == null
  ) {
    const n = normalizeSearchText(q);
    // Bare number → id only (avoid matching "2" inside "2 quartos" of every unit)
    if (/^\d+$/.test(n)) {
      return Number(unit.id) === Number(n);
    }
    return hay.includes(n);
  }

  return true;
}

export function filterUnitsBySearch<T extends SearchableUnit>(units: T[], query: string): T[] {
  const q = String(query || '').trim();
  if (!q) return units;
  return units.filter((u) => unitMatchesSearch(u, q));
}

export const UNIT_SEARCH_PLACEHOLDER =
  'Buscar: nome, 3 quartos, piscina, 4 hóspedes…';

export const UNIT_SEARCH_HINTS = [
  '3 quartos',
  'piscina',
  'wifi',
  '4 hóspedes',
  'pet',
] as const;
