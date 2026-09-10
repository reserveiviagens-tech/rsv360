/** Client mirror of server listing-comodidades.util catalog. */

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

export const AMENITY_ID_SET = new Set<string>(AMENITY_CATALOG.map((a) => a.id));
