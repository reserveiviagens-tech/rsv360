"use client"

import type { ReactNode } from "react"
import { Badge, Button, rsvColors } from "@rsv360/ui"
import type { ComboIaRecommendation } from "@/lib/ingressos/combo-recommendation"
import { formatIngressosPrice } from "@/lib/ingressos/catalog-data"

type Props = {
  recommendation: ComboIaRecommendation
  onAddCombo?: () => void
}

export function IngressosComboIaCard({ recommendation, onAddCombo }: Props) {
  return (
    <section
      data-testid="ingressos-combo-ia-card"
      className="rounded-2xl border p-5 text-white"
      style={{
        backgroundColor: rsvColors.midnight,
        borderColor: rsvColors.amber,
      }}
    >
      <motionRow className="flex flex-wrap items-start justify-between gap-4">
        <motionCol>
          <Badge variant="amber">{recommendation.discountPercent}% OFF</Badge>
          <h3 className="mt-2 text-lg font-bold">Combo IA</h3>
          <p className="mt-1 text-sm text-white/80">
            {recommendation.titles.join(" + ")}
          </p>
          <p className="mt-3 text-sm">
            <span className="text-white/60 line-through">
              {formatIngressosPrice(recommendation.subtotal)}
            </span>{" "}
            <span className="text-xl font-bold" style={{ color: rsvColors.amberBright }}>
              {formatIngressosPrice(recommendation.discountedTotal)}
            </span>
          </p>
          <p className="text-xs text-white/70">
            Economize {formatIngressosPrice(recommendation.savings)}
          </p>
        </motionCol>
        <Button
          variant="amber"
          type="button"
          onClick={() => onAddCombo?.()}
          data-testid="ingressos-combo-ia-cta"
        >
          Adicionar combo
        </Button>
      </motionRow>
    </section>
  )
}

function motionRow({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={className}>{children}</div>
}

function motionCol({ children }: { children: ReactNode }) {
  return <div>{children}</div>
}