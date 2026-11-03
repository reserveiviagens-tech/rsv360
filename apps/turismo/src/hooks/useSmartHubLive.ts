'use client'

import { useEffect, useState } from 'react'
import { fetchSmartHubLive, type SmartHubLive } from '../lib/smart-hub-live'
import { FUNNEL_STAGES, SMART_HUB_KPIS } from '../lib/smart-hub-data'

const FALLBACK: SmartHubLive = {
  kpis: SMART_HUB_KPIS.map((k) => ({ ...k })),
  funnel: FUNNEL_STAGES.map((s) => ({ id: s.id, label: s.label, pct: s.pct })),
  source: 'fallback',
  loadedAt: '',
}

export function useSmartHubLive() {
  const [data, setData] = useState<SmartHubLive>(FALLBACK)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchSmartHubLive()
      .then((live) => {
        if (!cancelled) {
          setData(live)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar Smart Hub')
          setData(FALLBACK)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading, error }
}
