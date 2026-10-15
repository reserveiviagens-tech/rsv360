export const HOME_SECTIONS = [
  { id: 'escolhas', label: 'Escolhas Personalizadas', defaultPath: '/experiencias' },
  { id: 'destinos', label: 'Destinos em Destaque', defaultPath: '/parques' },
  { id: 'ofertas', label: 'Ofertas Estratégicas', defaultPath: '/ofertas' },
  { id: 'tempo', label: 'Previsão / Semana', defaultPath: '/previsao' },
] as const;

export type HomeSectionId = (typeof HOME_SECTIONS)[number]['id'];

export const HOME_ENTITY_TYPES = [
  'promotion',
  'enterprise',
  'park',
  'attraction',
  'combo',
] as const;

export type HomeEntityType = (typeof HOME_ENTITY_TYPES)[number];

export type HomeSectionPlacement = {
  id?: number;
  section?: string;
  entityType: HomeEntityType;
  entityId: string;
  titleOverride?: string | null;
  subtitleOverride?: string | null;
  badgeText?: string | null;
  imageUrl?: string | null;
  ctaHref?: string | null;
  orderIndex: number;
  isActive: boolean;
};

/** Sugestões de entity_id por tipo (autocomplete no drawer). */
export const ENTITY_ID_SUGGESTIONS: Record<HomeEntityType, string[]> = {
  park: ['hot-park', 'diroma', 'lagoa-termas', 'kawana'],
  combo: ['familia', 'destaque', 'para-voce', 'romantico'],
  promotion: ['destaque', 'semana', 'flash'],
  enterprise: [],
  attraction: [],
};

export function isVideoUrl(url?: string | null): boolean {
  return Boolean(url && /\.(mp4|webm)(\?.*)?$/i.test(url));
}

export function defaultCtaFor(section: HomeSectionId, entityType: HomeEntityType, entityId: string): string {
  switch (section) {
    case 'escolhas':
      return `/experiencias?perfil=${encodeURIComponent(entityId)}`;
    case 'destinos':
      return `/parques?parque=${encodeURIComponent(entityId)}`;
    case 'ofertas':
      return `/ofertas?combo=${encodeURIComponent(entityId)}`;
    case 'tempo':
      return '/previsao';
    default:
      return entityType === 'enterprise' ? `/hoteis/${entityId}` : `/${entityType}/${entityId}`;
  }
}
