"use client"

import type { CSSProperties, ReactNode } from "react"
import { rsvColors } from "@rsv360/ui"
import type { IngressosTicket } from "@/lib/ingressos/catalog-data"
import type { ComboIaRecommendation } from "@/lib/ingressos/combo-recommendation"
import { IngressosComboIaCard } from "./IngressosComboIaCard"
import { IngressosCartSummaryPanel } from "./IngressosCartSummaryPanel"
import { IngressosParkAccordion } from "./IngressosParkAccordion"
import { useIngressosCart } from "./IngressosCartProvider"

type Props = {
  filteredTickets: IngressosTicket[]
  comboRecommendation: ComboIaRecommendation | null
}

export function IngressosFold2({ filteredTickets, comboRecommendation }: Props) {
  const { addComboRecommendation } = useIngressosCart()

  return (
    <section aria-label="Combo e catálogo" data-testid="ingressos-fold-2" className="space-y-6">
      {comboRecommendation ? (
        <IngressosComboIaCard
          recommendation={comboRecommendation}
          onAddCombo={() => addComboRecommendation(comboRecommendation)}
        />
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <IngressosParkAccordion filteredTickets={filteredTickets} />
        </div>

        <aside
          className="hidden lg:block lg:sticky lg:top-24 lg:self-start"
          data-testid="ingressos-cart-sticky-desktop"
        >
          <motionCard
            className="rounded-xl border bg-white p-4 shadow-sm"
            style={{ borderColor: rsvColors.textMuted }}
          >
            <IngressosCartSummaryPanel />
          </motionCard>
        </aside>
      </div>
    </section>
  )
}

function motionCard({
  className,
  style,
  children,
}: {
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  )
}