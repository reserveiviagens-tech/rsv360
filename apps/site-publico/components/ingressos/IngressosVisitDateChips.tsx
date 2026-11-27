"use client"

import { useMemo } from "react"
import { Button, rsvColors } from "@rsv360/ui"
import { buildVisitDateChips } from "@/lib/ingressos/ingressos-visit-dates"
import { useIngressosCart } from "./IngressosCartProvider"
import { useIngressosCheckoutFlow } from "./IngressosCheckoutFlowProvider"

export function IngressosVisitDateChips() {
  const { state, setVisitDate, summary } = useIngressosCart()
  const { dateRequiredVisible } = useIngressosCheckoutFlow()
  const chips = useMemo(() => buildVisitDateChips(new Date(), 5), [])

  if (summary.totalItems === 0) return null

  return (
    <div className="mt-3" data-testid="ingressos-visit-date-chips">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Data da visita</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {chips.map((chip) => {
          const selected = state.visitDateIso === chip.iso
          return (
            <Button
              key={chip.iso}
              type="button"
              variant={selected ? "primary" : "outline"}
              className="h-9 px-3 text-xs"
              aria-pressed={selected}
              data-testid={`ingressos-visit-date-${chip.iso}`}
              onClick={() => {
                setVisitDate(chip.iso)
              }}
              style={
                selected
                  ? undefined
                  : { borderColor: rsvColors.textMuted, color: rsvColors.textPrimary }
              }
            >
              {chip.label}
            </Button>
          )
        })}
      </div>
      {dateRequiredVisible && !state.visitDateIso ? (
        <p
          className="mt-2 text-sm text-red-700"
          role="alert"
          data-testid="ingressos-checkout-date-required"
        >
          Selecione a data da visita para continuar.
        </p>
      ) : null}
    </div>
  )
}