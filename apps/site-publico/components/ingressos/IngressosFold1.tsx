"use client"

import { Badge, Button, rsvColors, rsvLayout } from "@rsv360/ui"

const DESTINOS = ["Rio Quente", "Caldas Novas", "Multi-Destino"] as const
const ESCOLHA_RAPIDA = [
  "Melhor custo-benefício",
  "Vou com crianças",
  "Mais popular",
  "Quero combo",
] as const

export function IngressosFold1() {
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
          <span className="text-sm">Destino · Clima</span>
          <span className="text-sm">Data de ida</span>
          <span className="text-sm">Prova social</span>
        </div>
      </div>

      <div className={`mt-6 ${rsvLayout.containerPaddingClasses}`.replace(/px-\S+/g, "")}>
        <div className="flex flex-wrap gap-2">
          {DESTINOS.map((d) => (
            <Button key={d} variant="ghost" className="text-sm">
              {d}
            </Button>
          ))}
        </div>
        <p className="mt-4 text-sm font-semibold" style={{ color: rsvColors.textMuted }}>
          Escolha rápida
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ESCOLHA_RAPIDA.map((pill) => (
            <Badge key={pill} variant="outline" className="justify-center py-2">
              {pill}
            </Badge>
          ))}
        </div>
      </div>
    </section>
  )
}