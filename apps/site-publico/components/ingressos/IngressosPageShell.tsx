"use client"

import { rsvColors, rsvLayout } from "@rsv360/ui"
import type { IngressosTicket } from "@/lib/ingressos/catalog-data"
import type { ComboIaRecommendation } from "@/lib/ingressos/combo-recommendation"
import type {
  IngressosCitySlug,
  IngressosRapidoSlug,
  IngressosUrlIntent,
} from "@/lib/ingressos/query-intent"
import { IngressosCartStickyPlaceholder } from "./IngressosCartStickyPlaceholder"
import { IngressosFold1 } from "./IngressosFold1"
import { IngressosFold2 } from "./IngressosFold2"
import { IngressosFold3 } from "./IngressosFold3"

type Props = {
  filteredTickets: IngressosTicket[]
  comboRecommendation: ComboIaRecommendation | null
  intent: IngressosUrlIntent
  onCityChange: (city: IngressosCitySlug) => void
  onRapidoChange: (rapido: IngressosRapidoSlug) => void
  onClearRapido: () => void
}

export function IngressosPageShell({
  filteredTickets,
  comboRecommendation,
  intent,
  onCityChange,
  onRapidoChange,
  onClearRapido,
}: Props) {
  return (
    <div
      data-testid="rsv-ingressos-shell"
      data-rsv-ingressos-shell
      className="min-h-screen"
      style={{ backgroundColor: rsvColors.canvas }}
    >
      <main
        className={`mx-auto w-full ${rsvLayout.containerMaxClass} ${rsvLayout.containerPaddingClasses} space-y-10 py-6`}
      >
        <IngressosFold1
          intent={intent}
          onCityChange={onCityChange}
          onRapidoChange={onRapidoChange}
          onClearRapido={onClearRapido}
        />
        <IngressosFold2
          filteredTickets={filteredTickets}
          comboRecommendation={comboRecommendation}
        />
        <IngressosFold3 />
      </main>
      <IngressosCartStickyPlaceholder cartItemCount={0} />
    </div>
  )
}