'use client'

import type { SmartKpi } from '../../lib/smart-hub-data'

function Delta({ kpi }: { kpi: SmartKpi }) {
  const color =
    kpi.tone === 'up' ? 'text-emerald-300' : kpi.tone === 'down' ? 'text-red-300' : 'text-slate-300'
  return <span className={`text-xs font-semibold ${color}`}>{kpi.delta}</span>
}

type Props = {
  kpis: SmartKpi[]
  loading?: boolean
}

export function SmartHubKpis({ kpis, loading }: Props) {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      data-testid="smart-hub-kpis"
      data-loading={loading ? 'true' : 'false'}
    >
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          data-testid={kpi.testId}
          className={`min-h-[96px] rounded-2xl border border-white/20 bg-white/10 px-4 py-3 shadow-lg backdrop-blur-md transition-transform duration-200 hover:-translate-y-0.5 md:min-h-[108px] ${
            loading ? 'animate-pulse' : ''
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-blue-100/80">
            {kpi.label}
          </p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
            {loading ? '—' : kpi.value}
          </p>
          <div className="mt-1">{loading ? null : <Delta kpi={kpi} />}</div>
        </div>
      ))}
    </div>
  )
}
