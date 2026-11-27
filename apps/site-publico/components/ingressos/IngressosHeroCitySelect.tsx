"use client"

import { rsvColors } from "@rsv360/ui"
import {
  INGRESSOS_CITY_SLUGS,
  citySlugToLabel,
  type IngressosCitySlug,
} from "@/lib/ingressos/query-intent"

type Props = {
  value: IngressosCitySlug
  onChange: (city: IngressosCitySlug) => void
}

export function IngressosHeroCitySelect({ value, onChange }: Props) {
  return (
    <label className="flex min-w-[10rem] flex-col gap-1 text-sm text-white/90">
      <span className="text-xs uppercase tracking-wide text-white/70">Destino</span>
      <select
        className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white backdrop-blur-sm"
        data-testid="ingressos-hero-city-select"
        value={value}
        onChange={(e) => onChange(e.target.value as IngressosCitySlug)}
        style={{ borderColor: "rgba(255,255,255,0.25)" }}
      >
        {INGRESSOS_CITY_SLUGS.map((slug) => (
          <option key={slug} value={slug} className="text-gray-900">
            {citySlugToLabel(slug)}
          </option>
        ))}
      </select>
      <span className="sr-only" style={{ color: rsvColors.canvas }}>
        Sincronizado com filtros de cidade da página
      </span>
    </label>
  )
}