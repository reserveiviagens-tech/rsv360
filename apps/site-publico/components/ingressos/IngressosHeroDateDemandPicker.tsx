"use client"

import { useId, useMemo, useRef, useState } from "react"
import { Badge, Button, rsvColors, rsvZIndex } from "@rsv360/ui"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  buildDemandCalendarDays,
  type VisitDemandLevel,
} from "@/lib/ingressos/ingressos-visit-demand"
import type { IngressosCitySlug } from "@/lib/ingressos/query-intent"
import { useIngressosCart } from "./IngressosCartProvider"

const DEMAND_LABEL: Record<VisitDemandLevel, string> = {
  available: "Disponível",
  high: "Alta demanda",
  sold_out: "Esgotado",
}

type Props = {
  city: IngressosCitySlug
}

const dropdownZ = rsvZIndex.dropdown

export function IngressosHeroDateDemandPicker({ city }: Props) {
  const { state, setVisitDate } = useIngressosCart()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const legendId = useId()
  const [open, setOpen] = useState(false)
  const days = useMemo(() => buildDemandCalendarDays(new Date(), city, 35), [city])

  const selectedLabel = state.visitDateIso
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(`${state.visitDateIso}T12:00:00.000Z`))
    : "Escolher data de ida"

  return (
    <div className="flex min-w-[10rem] flex-col gap-1 text-sm text-white/90">
      <span className="text-xs uppercase tracking-wide text-white/70">Data de ida</span>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            requestAnimationFrame(() => triggerRef.current?.focus())
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            variant="outline"
            className="w-full justify-start border-white/20 bg-white/10 text-sm text-white backdrop-blur-sm hover:bg-white/20"
            data-testid="ingressos-hero-date-trigger"
            aria-haspopup="dialog"
            aria-expanded={undefined}
          >
            {selectedLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(100vw-2rem,22rem)] p-4"
          style={{ zIndex: dropdownZ }}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            triggerRef.current?.focus()
          }}
        >
          <p id={legendId} className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Demanda no destino
          </p>
          <ul className="mb-3 flex flex-wrap gap-2 text-xs text-gray-600" aria-hidden>
            <li className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: rsvColors.action }} />
              Disponível
            </li>
            <li className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: rsvColors.amberBright }} />
              Alta demanda
            </li>
            <li className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: rsvColors.textMuted }} />
              Esgotado / manutenção
            </li>
          </ul>
          <div
            className="grid grid-cols-7 gap-1"
            role="grid"
            aria-labelledby={legendId}
            data-testid="ingressos-hero-demand-calendar"
          >
            {days.map((day) => {
              const dayNum = day.iso.slice(8, 10)
              const selected = state.visitDateIso === day.iso
              const label =
                day.demand.level === "sold_out" && day.demand.maintenance
                  ? `${dayNum} — Esgotado / manutenção`
                  : `${dayNum} — ${DEMAND_LABEL[day.demand.level]}`
              return (
                <button
                  key={day.iso}
                  type="button"
                  role="gridcell"
                  disabled={!day.selectable}
                  data-testid={`ingressos-hero-demand-day-${day.iso}`}
                  aria-label={label}
                  aria-pressed={selected}
                  className="relative flex h-10 flex-col items-center justify-center rounded-md border text-xs disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    borderColor: selected ? rsvColors.action : rsvColors.textMuted,
                    backgroundColor: selected ? "rgba(22, 163, 74, 0.12)" : undefined,
                  }}
                  onClick={() => {
                    setVisitDate(day.iso)
                    setOpen(false)
                    requestAnimationFrame(() => triggerRef.current?.focus())
                  }}
                >
                  <span className="font-semibold tabular-nums">{dayNum}</span>
                  {day.demand.level === "high" ? (
                    <Badge variant="amber" className="absolute -right-1 -top-1 px-1 py-0 text-[9px]">
                      Alta
                    </Badge>
                  ) : null}
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}