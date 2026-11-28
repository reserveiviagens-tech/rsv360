'use client'

import Link from 'next/link'
import { LayoutDashboard, Gauge, Radio } from 'lucide-react'
import ProtectedRoute from '../../src/components/ProtectedRoute'
import { SmartHubKpis } from '../../src/components/smart-hub/SmartHubKpis'
import { SeasonalityHeatmap } from '../../src/components/smart-hub/SeasonalityHeatmap'
import { SmartHubAutomations } from '../../src/components/smart-hub/SmartHubAutomations'
import { ConversionFunnelStrip } from '../../src/components/smart-hub/ConversionFunnelStrip'
import { useSmartHubLive } from '../../src/hooks/useSmartHubLive'

function SourceBadge({ source }: { source: 'live' | 'partial' | 'fallback' }) {
  const label =
    source === 'live' ? 'API ao vivo' : source === 'partial' ? 'Parcial + fallback' : 'Demo estático'
  const tone =
    source === 'live'
      ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100'
      : source === 'partial'
        ? 'border-amber-400/40 bg-amber-500/20 text-amber-100'
        : 'border-white/20 bg-white/10 text-blue-100'
  return (
    <span
      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold backdrop-blur-md ${tone}`}
      data-testid="smart-hub-data-source"
    >
      <Radio className="h-3 w-3" />
      {label}
    </span>
  )
}

export default function SmartHubPage() {
  const { data, loading, error } = useSmartHubLive()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50" data-testid="page-smart-hub">
        <header
          className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E3A8A] to-[#2563EB] px-4 pb-8 pt-6 text-white sm:px-6 lg:px-8 lg:pb-10 lg:pt-8"
          data-testid="smart-hub-hero"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18), transparent 40%), radial-gradient(circle at 80% 0%, rgba(249,115,22,0.25), transparent 35%)',
            }}
          />
          <div className="relative mx-auto max-w-7xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                  <Gauge className="h-3.5 w-3.5" />
                  PHASE_16 · Smart Dashboard V8/V13
                </div>
                <SourceBadge source={data.source} />
              </div>
              <Link
                href="/dashboard/home-sections"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold backdrop-blur-md transition hover:bg-white/20"
                data-testid="link-control-center"
              >
                <LayoutDashboard className="h-4 w-4" />
                Control Center
              </Link>
            </div>
            <div className="lg:flex lg:items-end lg:justify-between lg:gap-8">
              <div className="max-w-2xl">
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                  Smart Hub — Reservei Viagens
                </h1>
                <p className="mt-2 text-sm text-blue-100 sm:text-base">
                  Heatmaps de sazonalidade, KPIs de conversão e atalhos operacionais em um painel
                  glass para Caldas Novas e Rio Quente.
                </p>
                {error ? (
                  <p className="mt-2 text-xs text-amber-200" data-testid="smart-hub-error">
                    {error} — exibindo fallback.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-6 lg:mt-8">
              <SmartHubKpis kpis={data.kpis} loading={loading} />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-stretch">
            <div className="lg:col-span-5">
              <ConversionFunnelStrip stages={data.funnel} loading={loading} />
            </div>
            <div className="lg:col-span-7">
              <SeasonalityHeatmap />
            </div>
          </div>
          <SmartHubAutomations />
        </main>
      </div>
    </ProtectedRoute>
  )
}
