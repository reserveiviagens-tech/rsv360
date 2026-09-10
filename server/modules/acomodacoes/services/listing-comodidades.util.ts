/**
 * Listing amenities catalog — amenidades array on acomodacoes.
 */

export const AMENITY_CATALOG = [
  { id: 'wifi', label: 'Wi-Fi', desc: 'Internet sem fio disponível', icon: '📶' },
  { id: 'ar', label: 'Ar-condicionado', desc: 'Climatização no espaço', icon: '❄️' },
  { id: 'tv', label: 'TV', desc: 'Televisão para entretenimento', icon: '📺' },
  { id: 'cozinha', label: 'Cozinha', desc: 'Espaço para preparar refeições', icon: '🍳' },
  {
    id: 'estacionamento',
    label: 'Estacionamento gratuito no local',
    desc: 'Vaga gratuita no local',
    icon: '🅿️',
  },
  { id: 'piscina', label: 'Piscina', desc: 'Área de lazer aquática', icon: '🏊' },
  { id: 'academia', label: 'Academia', desc: 'Equipamentos de exercício', icon: '🏋️' },
  { id: 'aquecedor', label: 'Aquecedor', desc: 'Aquecimento disponível', icon: '🔥' },
  { id: 'secador', label: 'Secador de cabelo', desc: 'Secador no banheiro', icon: '💨' },
  {
    id: 'basicos',
    label: 'Itens básicos',
    desc: 'Toalhas, lençóis, sabonete e papel higiênico',
    icon: '🧴',
  },
  {
    id: 'detector_fumaca',
    label: 'Detector de fumaça',
    desc: 'Alarme de fumaça instalado',
    icon: '🚨',
  },
  {
    id: 'detector_monoxido',
    label: 'Detector de monóxido de carbono',
    desc: 'Alarme de CO instalado',
    icon: '☢️',
  },
  {
    id: 'moveis_externos',
    label: 'Móveis na área externa',
    desc: 'Mobiliário ao ar livre',
    icon: '🪑',
  },
  { id: 'refrigerador', label: 'Refrigerador', desc: 'Geladeira disponível', icon: '🧊' },
  { id: 'agua_quente', label: 'Água quente', desc: 'Água quente no banheiro/cozinha', icon: '🚿' },
] as const;

export type AmenityId = (typeof AMENITY_CATALOG)[number]['id'];

export const AMENITY_IDS: ReadonlySet<string> = new Set(AMENITY_CATALOG.map((a) => a.id));

const LEGACY_LABEL_TO_ID: Record<string, AmenityId> = {
  wifi: 'wifi',
  'wi-fi': 'wifi',
  internet: 'wifi',
  ar: 'ar',
  'ar-condicionado': 'ar',
  arcondicionado: 'ar',
  'ar condicionado': 'ar',
  tv: 'tv',
  televisao: 'tv',
  televisão: 'tv',
  cozinha: 'cozinha',
  kitchen: 'cozinha',
  estacionamento: 'estacionamento',
  'estacionamento gratuito': 'estacionamento',
  'estacionamento gratuito no local': 'estacionamento',
  parking: 'estacionamento',
  piscina: 'piscina',
  pool: 'piscina',
  academia: 'academia',
  gym: 'academia',
  aquecedor: 'aquecedor',
  heating: 'aquecedor',
  secador: 'secador',
  'secador de cabelo': 'secador',
  basicos: 'basicos',
  'itens básicos': 'basicos',
  'itens basicos': 'basicos',
  detector_fumaca: 'detector_fumaca',
  'detector de fumaça': 'detector_fumaca',
  'detector de fumaca': 'detector_fumaca',
  detector_monoxido: 'detector_monoxido',
  'detector de monóxido de carbono': 'detector_monoxido',
  'detector de monoxido de carbono': 'detector_monoxido',
  moveis_externos: 'moveis_externos',
  'móveis na área externa': 'moveis_externos',
  'moveis na area externa': 'moveis_externos',
  refrigerador: 'refrigerador',
  geladeira: 'refrigerador',
  agua_quente: 'agua_quente',
  'água quente': 'agua_quente',
  'agua quente': 'agua_quente',
};

export type AmenidadesValidationOk = { ok: true; value: string[] };
export type AmenidadesValidationErr = {
  ok: false;
  error: 'amenidades_invalidas';
  message: string;
};

function resolveAmenityId(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  if (AMENITY_IDS.has(key)) return key;
  return LEGACY_LABEL_TO_ID[key] ?? null;
}

export function validateListingAmenidades(raw: unknown): AmenidadesValidationOk | AmenidadesValidationErr {
  if (raw == null) {
    return { ok: true, value: [] };
  }
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      error: 'amenidades_invalidas',
      message: 'Comodidades devem ser uma lista',
    };
  }

  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    let id: string | null = null;
    if (typeof item === 'string') {
      id = resolveAmenityId(item);
      if (!id && /^[a-z0-9_]{1,40}$/i.test(item.trim())) {
        // Preserve legacy/custom tokens already stored on units.
        id = item.trim().toLowerCase();
      }
    } else if (item && typeof item === 'object' && 'id' in item) {
      id = resolveAmenityId(String((item as { id: unknown }).id));
    } else {
      return {
        ok: false,
        error: 'amenidades_invalidas',
        message: 'Item de comodidade inválido',
      };
    }
    if (!id) {
      return {
        ok: false,
        error: 'amenidades_invalidas',
        message: `Comodidade desconhecida: ${typeof item === 'string' ? item : 'objeto'}`,
      };
    }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }

  out.sort((a, b) => {
    const ia = AMENITY_CATALOG.findIndex((x) => x.id === a);
    const ib = AMENITY_CATALOG.findIndex((x) => x.id === b);
    const sa = ia === -1 ? 999 : ia;
    const sb = ib === -1 ? 999 : ib;
    if (sa !== sb) return sa - sb;
    return a.localeCompare(b);
  });

  return { ok: true, value: out };
}

/** Card: “Wi-Fi, TV, Cozinha + 2 mais” */
export function summarizeAmenidades(
  ids: Iterable<string>,
  previewCount = 3,
): string | null {
  const ordered = AMENITY_CATALOG.filter((a) => {
    for (const id of ids) {
      if (String(id).toLowerCase() === a.id) return true;
    }
    return false;
  });
  if (ordered.length === 0) return null;
  const labels = ordered.slice(0, previewCount).map((a) => a.label);
  const rest = ordered.length - labels.length;
  if (rest > 0) return `${labels.join(', ')} + ${rest} mais`;
  return labels.join(', ');
}
