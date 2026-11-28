/** Fase 16 — dados do Smart Dashboard (Caldas Novas / Rio Quente) */

export type HeatIntensity = 0 | 1 | 2 | 3 | 4

export const HEATMAP_MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
] as const

export const HEATMAP_DESTINATIONS = [
  { id: 'hot-park', label: 'Hot Park' },
  { id: 'diroma', label: 'diRoma Acqua' },
  { id: 'lagoa', label: 'Lagoa Termas' },
  { id: 'kawana', label: 'Kawana Park' },
  { id: 'hoteis', label: 'Hotéis / Resorts' },
] as const

/** Intensidade sazonal 0–4 (baixa → pico) — padrão Caldas GO */
export const SEASONALITY_MATRIX: Record<string, HeatIntensity[]> = {
  'hot-park': [1, 1, 2, 3, 3, 2, 4, 3, 2, 2, 3, 4],
  diroma: [1, 2, 2, 3, 3, 2, 4, 3, 2, 2, 3, 4],
  lagoa: [2, 2, 2, 3, 3, 2, 4, 3, 3, 2, 3, 4],
  kawana: [1, 1, 2, 2, 3, 2, 4, 3, 2, 2, 3, 3],
  hoteis: [2, 2, 3, 3, 3, 2, 4, 3, 3, 3, 3, 4],
}

export type SmartKpi = {
  id: string
  label: string
  value: string
  delta: string
  tone: 'up' | 'down' | 'flat'
  testId: string
}

export const SMART_HUB_KPIS: SmartKpi[] = [
  {
    id: 'occupancy',
    label: 'Ocupação projetada',
    value: '78%',
    delta: '+6 pts vs mês ant.',
    tone: 'up',
    testId: 'kpi-occupancy',
  },
  {
    id: 'ticket-gmv',
    label: 'GMV ingressos (30d)',
    value: 'R$ 186 mil',
    delta: '+12% MoM',
    tone: 'up',
    testId: 'kpi-ticket-gmv',
  },
  {
    id: 'conversion',
    label: 'Conv. checkout Pix',
    value: '41%',
    delta: '+3 pts',
    tone: 'up',
    testId: 'kpi-conversion',
  },
  {
    id: 'hold-conflict',
    label: 'Conflitos de hold',
    value: '2,1%',
    delta: '-0,4 pts',
    tone: 'up',
    testId: 'kpi-hold-conflict',
  },
]

export type SmartAutomation = {
  id: string
  title: string
  description: string
  href: string
  badge: string
  badgeTone: 'blue' | 'emerald' | 'amber' | 'orange'
  testId: string
}

export const SMART_HUB_AUTOMATIONS: SmartAutomation[] = [
  {
    id: 'home-sections',
    title: 'Control Center — Home',
    description: 'Ativar/ordenar faixas da landing (Hero, Ofertas, Destinos).',
    href: '/dashboard/home-sections',
    badge: 'V13',
    badgeTone: 'blue',
    testId: 'auto-home-sections',
  },
  {
    id: 'flash-deals',
    title: 'Flash Deals',
    description: 'Revisar ofertas com urgência e estoque baixo.',
    href: '/dashboard/leiloes/flash-deals',
    badge: 'Urgente',
    badgeTone: 'orange',
    testId: 'auto-flash-deals',
  },
  {
    id: 'ota-sync',
    title: 'Sincronização OTA',
    description: 'Disparar sync de tarifas e disponibilidade.',
    href: '/dashboard/ota-sync',
    badge: 'Ops',
    badgeTone: 'emerald',
    testId: 'auto-ota-sync',
  },
  {
    id: 'financeiro',
    title: 'Analytics financeiro',
    description: 'GMV, margem e canais (leilão, flash, OTA).',
    href: '/dashboard/analytics-financeiro',
    badge: 'KPI',
    badgeTone: 'amber',
    testId: 'auto-financeiro',
  },
  {
    id: 'excursoes',
    title: 'Excursões ativas',
    description: 'Grupos, vagas e status de publicação.',
    href: '/dashboard/excursoes',
    badge: 'Grupos',
    badgeTone: 'blue',
    testId: 'auto-excursoes',
  },
  {
    id: 'crm-ingressos',
    title: 'CRM — Funil ingressos',
    description: 'Abrir catálogo/checkout com tracking Fase 12.',
    href: 'http://localhost:5000/ingressos',
    badge: 'CRM',
    badgeTone: 'emerald',
    testId: 'auto-crm-ingressos',
  },
]

export const FUNNEL_STAGES = [
  { id: 'catalog', label: 'Catálogo', pct: 100 },
  { id: 'cart', label: 'Carrinho', pct: 62 },
  { id: 'checkout', label: 'Checkout', pct: 48 },
  { id: 'pix', label: 'Pix', pct: 41 },
  { id: 'order', label: 'Pedido', pct: 38 },
] as const

export function intensityClass(level: HeatIntensity): string {
  switch (level) {
    case 0:
      return 'bg-slate-100 text-slate-400'
    case 1:
      return 'bg-blue-100 text-blue-700'
    case 2:
      return 'bg-blue-200 text-blue-800'
    case 3:
      return 'bg-orange-300 text-orange-950'
    case 4:
      return 'bg-orange-500 text-white font-bold'
    default:
      return 'bg-slate-100'
  }
}

export function intensityLabel(level: HeatIntensity): string {
  return ['Baixa', 'Suave', 'Média', 'Alta', 'Pico'][level] ?? '—'
}
