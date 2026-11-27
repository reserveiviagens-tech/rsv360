"use client"

import { Badge, Button, rsvColors, rsvLayout } from "@rsv360/ui"
import {
  INGRESSOS_CITY_SLUGS,
  citySlugToLabel,
  type IngressosCitySlug,
  type IngressosRapidoSlug,
  type IngressosUrlIntent,
} from "@/lib/ingressos/query-intent"

const RAPIDO_PILLS: { slug: IngressosRapidoSlug; label: string }[] = [
  { slug: "custo-beneficio", label: "Melhor custo-benefício" },
  { slug: "criancas", label: "Vou com crianças" },
  { slug: "popular", label: "Mais popular" },
  { slug: "combo", label: "Quero combo" },
]

type Props = {
  intent: IngressosUrlIntent
  onCityChange: (city: IngressosCitySlug) => void
  onRapidoChange: (rapido: IngressosRapidoSlug) => void
  onClearRapido: () => void
}

export function IngressosFold1({ intent, onCityChange, onRapidoChange, onClearRapido }: Props) {
  return (
    <section aria-label="Topo e filtros" data-testid="ingressos-fold-1">
      <div
        className="rounded-2xl p-6 text-white"
        style={{ backgroundColor: rsvColors.midnight }}
      >
        <p className="text-sm text-white/80">Hero · Parques Rio Quente e Caldas Novas</p>
        <h2 className="mt-2 text-2xl font-bold" style={{ fontSize: "var(--rsv-type-fluid-title, 1.75rem)" }}>
          Sua aventura começa aqui
        </h2>
        <div className="mt-4 flex flex-wrap gap-4 rounded-xl bg-white/10 p-4 backdrop-blur-md">
          <span className="text-sm">Destino · {citySlugToLabel(intent.city)}</span>
          <span className="text-sm">Data de ida</span>
          <span className="text-sm">Prova social</span>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap gap-2">
          {INGRESSOS_CITY_SLUGS.map((slug) => (
            <Button
              key={slug}
              variant={intent.city === slug ? "amber" : "ghost"}
              className="text-sm"
              type="button"
              aria-pressed={intent.city === slug}
              data-testid={`ingressos-city-${slug}`}
              onClick={() => onCityChange(slug)}
            >
              {citySlugToLabel(slug)}
            </Button>
          ))}
        </div>
        <p className="mt-4 text-sm font-semibold" style={{ color: rsvColors.textMuted }}>
          Escolha rápida
        </p>
        {intent.rapido ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="amber" data-testid="ingressos-rapido-active">
              Filtro: {intent.rapido}
            </Badge>
            <Button type="button" variant="outline" className="text-xs" onClick={onClearRapido}>
              Limpar filtros
            </Button>
          </div>
        ) : null}
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RAPIDO_PILLS.map((pill) => (
            <button
              key={pill.slug}
              type="button"
              className="w-full"
              data-testid={`ingressos-rapido-${pill.slug}`}
              onClick={() => onRapidoChange(pill.slug)}
            >
              <Badge
                variant={intent.rapido === pill.slug ? "amber" : "outline"}
                className="w-full justify-center py-2"
              >
                {pill.label}
              </Badge>
            </button>
          ))}
        </div>
        <p className="sr-only">{rsvLayout.containerPaddingClasses}</p>
      </div>
    </section>
  )
}