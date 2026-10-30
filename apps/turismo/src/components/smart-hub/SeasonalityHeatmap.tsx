'use client'

import {
  HEATMAP_DESTINATIONS,
  HEATMAP_MONTHS,
  SEASONALITY_MATRIX,
  intensityClass,
  intensityLabel,
  type HeatIntensity,
} from '../../lib/smart-hub-data'

export function SeasonalityHeatmap() {
  return (
    <section
      className="h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6"
      data-testid="seasonality-heatmap"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Heatmap de sazonalidade</h2>
          <p className="text-sm text-slate-500">
            Demanda relativa por parque / mês — Caldas Novas &amp; Rio Quente
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
          {([0, 1, 2, 3, 4] as HeatIntensity[]).map((level) => (
            <span
              key={level}
              className={`inline-flex min-h-[28px] items-center rounded-lg px-2 ${intensityClass(level)}`}
            >
              {intensityLabel(level)}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-center text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white px-2 py-2 text-left font-semibold text-slate-500">
                Destino
              </th>
              {HEATMAP_MONTHS.map((m) => (
                <th key={m} className="px-1 py-2 font-semibold text-slate-500">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HEATMAP_DESTINATIONS.map((dest) => {
              const row = SEASONALITY_MATRIX[dest.id] ?? []
              return (
                <tr key={dest.id} data-testid={`heatmap-row-${dest.id}`}>
                  <td className="sticky left-0 bg-white px-2 py-1.5 text-left font-semibold text-slate-800">
                    {dest.label}
                  </td>
                  {HEATMAP_MONTHS.map((month, i) => {
                    const level = (row[i] ?? 0) as HeatIntensity
                    return (
                      <td key={`${dest.id}-${month}`} className="p-1">
                        <div
                          title={`${dest.label} · ${month}: ${intensityLabel(level)}`}
                          data-testid={`heat-cell-${dest.id}-${i}`}
                          className={`mx-auto flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-lg ${intensityClass(level)}`}
                        >
                          {level}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
