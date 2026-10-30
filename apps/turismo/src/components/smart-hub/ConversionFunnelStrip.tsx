'use client'

import type { FunnelStageLive } from '../../lib/smart-hub-live'

type Props = {
  stages: FunnelStageLive[]
  loading?: boolean
}

export function ConversionFunnelStrip({ stages, loading }: Props) {
  return (
    <section
      className="h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6"
      data-testid="conversion-funnel-strip"
      data-loading={loading ? 'true' : 'false'}
    >
      <h2 className="text-lg font-bold text-slate-900 md:text-xl">Funil de conversão (ingressos)</h2>
      <p className="mb-4 text-sm text-slate-500">
        Visão operacional alinhada ao tracking Fase 12 do CRM
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end lg:flex-col xl:flex-row">
        {stages.map((stage, i) => (
          <div key={stage.id} className="flex-1" data-testid={`funnel-stage-${stage.id}`}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="font-semibold text-slate-700">
                {i + 1}. {stage.label}
                {typeof stage.count === 'number' ? (
                  <span className="ml-1 font-normal text-slate-400">({stage.count})</span>
                ) : null}
              </span>
              <span className="font-bold text-blue-600">{loading ? '—' : `${stage.pct}%`}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100 md:h-3.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-500"
                style={{ width: loading ? '30%' : `${stage.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
