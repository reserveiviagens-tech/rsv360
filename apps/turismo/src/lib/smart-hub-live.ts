/**
 * Smart Hub — agrega KPIs/funil de APIs reais (Turismo + CRM analytics).
 * Fallback: smart-hub-data.ts (estático) se alguma fonte falhar.
 */

import { fase1Api } from './fase1-api'
import {
  FUNNEL_STAGES,
  SMART_HUB_KPIS,
  type SmartKpi,
} from './smart-hub-data'

const CRM_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CRM_URL) ||
  'http://localhost:5000'

export type FunnelStageLive = {
  id: string
  label: string
  pct: number
  count?: number
}

export type SmartHubLive = {
  kpis: SmartKpi[]
  funnel: FunnelStageLive[]
  source: 'live' | 'partial' | 'fallback'
  loadedAt: string
}

function formatBrlCompact(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return 'R$ 0'
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`
  }
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function pctLabel(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: digits })}%`
}

function toneFromDelta(delta: number): SmartKpi['tone'] {
  if (delta > 0.05) return 'up'
  if (delta < -0.05) return 'down'
  return 'flat'
}

type RelatorioDash = {
  orcamentos?: number
  propostas?: number
  propostasAceitas?: number
  passageiros?: number
  transacoes?: number
  campanhas?: number
  receitaEstimada?: number
}

type FinanceiroDash = {
  receitas?: number
  despesas?: number
  saldo?: number
}

type AnfitriaoResumo = {
  ocupacaoPct?: number | null
  reservas?: number
  receitaTotal?: number
  unidadesPublicadas?: number
  unidadesTotal?: number
}

type CampanhasMetricas = {
  campanhasAtivas?: number
  roi?: number
  usosCupons?: number
}

type CrmAnalyticsStats = {
  total?: number
  byStage?: Record<string, number>
  byEvent?: Record<string, number>
}

async function safeJson<T>(promise: Promise<{ success?: boolean; data?: T }>): Promise<T | null> {
  try {
    const res = await promise
    return (res?.data as T) ?? null
  } catch {
    return null
  }
}

async function fetchCrmAnalytics(): Promise<CrmAnalyticsStats | null> {
  try {
    const res = await fetch(`${CRM_BASE}/api/analytics/recent?limit=1`, {
      credentials: 'omit',
    })
    if (!res.ok) return null
    const json = (await res.json()) as { stats?: CrmAnalyticsStats }
    return json.stats ?? null
  } catch {
    return null
  }
}

function buildFunnel(stats: CrmAnalyticsStats | null, rel: RelatorioDash | null): FunnelStageLive[] {
  const byStage = stats?.byStage ?? {}
  const stageOrder = [
    { id: 'catalog', label: 'Catálogo', keys: ['catalog'] },
    { id: 'cart', label: 'Carrinho', keys: ['cart'] },
    { id: 'checkout', label: 'Checkout', keys: ['checkout'] },
    { id: 'pix', label: 'Pix', keys: ['pix'] },
    { id: 'order', label: 'Pedido', keys: ['order', 'paid'] },
  ] as const

  const counts = stageOrder.map((s) =>
    s.keys.reduce((sum, k) => sum + (byStage[k] ?? 0), 0),
  )
  const hasAnalytics = counts.some((c) => c > 0)

  if (hasAnalytics) {
    const base = Math.max(counts[0], ...counts, 1)
    return stageOrder.map((s, i) => ({
      id: s.id,
      label: s.label,
      count: counts[i],
      pct: Math.round((counts[i] / base) * 100) || (i === 0 ? 100 : 0),
    }))
  }

  // Fallback operacional: orçamentos → propostas → aceitas
  if (rel && (rel.orcamentos || rel.propostas)) {
    const orc = Math.max(rel.orcamentos ?? 0, 1)
    const prop = rel.propostas ?? 0
    const aceitas = rel.propostasAceitas ?? 0
    return [
      { id: 'catalog', label: 'Catálogo', pct: 100, count: orc },
      { id: 'cart', label: 'Carrinho', pct: Math.round((prop / orc) * 100), count: prop },
      {
        id: 'checkout',
        label: 'Checkout',
        pct: Math.round((prop / orc) * 85),
        count: prop,
      },
      {
        id: 'pix',
        label: 'Pix',
        pct: Math.round((aceitas / orc) * 100),
        count: aceitas,
      },
      {
        id: 'order',
        label: 'Pedido',
        pct: Math.round((aceitas / orc) * 90),
        count: aceitas,
      },
    ]
  }

  return FUNNEL_STAGES.map((s) => ({ id: s.id, label: s.label, pct: s.pct }))
}

function buildKpis(
  rel: RelatorioDash | null,
  fin: FinanceiroDash | null,
  anf: AnfitriaoResumo | null,
  camp: CampanhasMetricas | null,
  funnel: FunnelStageLive[],
): SmartKpi[] {
  const base = SMART_HUB_KPIS.map((k) => ({ ...k }))
  const byId = Object.fromEntries(base.map((k) => [k.id, k])) as Record<string, SmartKpi>

  const ocup = anf?.ocupacaoPct
  if (ocup != null && Number.isFinite(ocup)) {
    byId.occupancy.value = pctLabel(ocup, 0)
    byId.occupancy.delta = `${anf?.reservas ?? 0} reservas no período`
    byId.occupancy.tone = toneFromDelta(ocup - 70)
  }

  const gmv = fin?.receitas ?? rel?.receitaEstimada ?? anf?.receitaTotal
  if (gmv != null && Number.isFinite(gmv)) {
    byId['ticket-gmv'].value = formatBrlCompact(gmv)
    byId['ticket-gmv'].delta =
      fin?.saldo != null
        ? `Saldo ${formatBrlCompact(fin.saldo)}`
        : `${rel?.transacoes ?? 0} transações`
    byId['ticket-gmv'].tone = toneFromDelta(gmv)
  }

  const pixStage = funnel.find((f) => f.id === 'pix')
  const catalogStage = funnel.find((f) => f.id === 'catalog')
  if (pixStage && catalogStage && (catalogStage.count ?? 0) > 0) {
    byId.conversion.value = pctLabel(pixStage.pct, 0)
    byId.conversion.delta = 'via analytics / propostas'
    byId.conversion.tone = toneFromDelta(pixStage.pct - 35)
  } else if (rel?.propostas && rel.propostas > 0) {
    const conv = ((rel.propostasAceitas ?? 0) / rel.propostas) * 100
    byId.conversion.value = pctLabel(conv, 0)
    byId.conversion.delta = `${rel.propostasAceitas ?? 0}/${rel.propostas} propostas`
    byId.conversion.tone = toneFromDelta(conv - 35)
  }

  const totalUn = anf?.unidadesTotal ?? 0
  const pub = anf?.unidadesPublicadas ?? 0
  if (totalUn > 0) {
    const incompletasPct = ((totalUn - pub) / totalUn) * 100
    byId['hold-conflict'].label = 'Unidades incompletas'
    byId['hold-conflict'].value = pctLabel(incompletasPct, 1)
    byId['hold-conflict'].delta = `${totalUn - pub} de ${totalUn} unidades`
    byId['hold-conflict'].tone = incompletasPct <= 15 ? 'up' : 'down'
  } else if (camp?.roi != null) {
    byId['hold-conflict'].label = 'ROI campanhas'
    byId['hold-conflict'].value = pctLabel(camp.roi, 0)
    byId['hold-conflict'].delta = `${camp.campanhasAtivas ?? 0} ativas`
    byId['hold-conflict'].tone = toneFromDelta(camp.roi)
  }

  return Object.values(byId)
}

export async function fetchSmartHubLive(): Promise<SmartHubLive> {
  const [rel, fin, desempenho, camp, analytics] = await Promise.all([
    safeJson<RelatorioDash>(fase1Api.relatoriosDashboard() as Promise<{ data?: RelatorioDash }>),
    safeJson<FinanceiroDash>(fase1Api.financeiroDashboard() as Promise<{ data?: FinanceiroDash }>),
    safeJson<{ resumo?: AnfitriaoResumo }>(
      fase1Api.anfitriaoDesempenho() as Promise<{ data?: { resumo?: AnfitriaoResumo } }>,
    ),
    safeJson<CampanhasMetricas>(fase1Api.campanhasMetricas() as Promise<{ data?: CampanhasMetricas }>),
    fetchCrmAnalytics(),
  ])

  const anf = desempenho?.resumo ?? null
  const liveCount = [rel, fin, anf, camp, analytics].filter(Boolean).length
  const funnel = buildFunnel(analytics, rel)
  const kpis = buildKpis(rel, fin, anf, camp, funnel)

  return {
    kpis: liveCount > 0 ? kpis : SMART_HUB_KPIS.map((k) => ({ ...k })),
    funnel,
    source: liveCount === 0 ? 'fallback' : liveCount >= 3 ? 'live' : 'partial',
    loadedAt: new Date().toISOString(),
  }
}
