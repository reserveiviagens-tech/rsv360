"use client"

import { useMemo, useState, type CSSProperties, type ReactNode } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  NumericStepper,
  rsvColors,
} from "@rsv360/ui"
import type { IngressosTicket } from "@/lib/ingressos/catalog-data"
import type { ComboIaRecommendation } from "@/lib/ingressos/combo-recommendation"
import { IngressosComboIaCard } from "./IngressosComboIaCard"

type Props = {
  filteredTickets: IngressosTicket[]
  comboRecommendation: ComboIaRecommendation | null
}

export function IngressosFold2({ filteredTickets, comboRecommendation }: Props) {
  const [qty, setQty] = useState(2)

  const accordionDefault = useMemo(() => {
    if (filteredTickets.length === 0) return undefined
    const hot = filteredTickets.find((t) => t.id === "hot-park")
    return hot?.id ?? filteredTickets[0]?.id
  }, [filteredTickets])

  const firstOpen = filteredTickets.length > 0 ? accordionDefault : undefined

  return (
    <section aria-label="Combo e catálogo" data-testid="ingressos-fold-2" className="space-y-6">
      {comboRecommendation ? (
        <IngressosComboIaCard recommendation={comboRecommendation} />
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {filteredTickets.length === 0 ? (
            <p
              className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-gray-600"
              data-testid="ingressos-catalog-empty"
            >
              Nenhum ingresso para esse filtro. O Combo IA acima sugere a melhor opção para você.
            </p>
          ) : (
            <Accordion
              type="single"
              collapsible
              defaultValue={firstOpen}
              key={firstOpen ?? "empty-accordion"}
            >
              {filteredTickets.map((ticket, index) => (
                <AccordionItem key={ticket.id} value={ticket.id}>
                  <AccordionTrigger>{ticket.name}</AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-3 text-sm text-gray-600">{ticket.description}</p>
                    {index === 0 ? (
                      <NumericStepper value={qty} min={0} max={20} onChange={setQty} />
                    ) : null}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

        <aside
          className="hidden lg:block lg:sticky lg:top-24 lg:self-start"
          data-testid="ingressos-cart-sticky-desktop"
        >
          <motionCard className="rounded-xl border bg-white p-4 shadow-sm">
            <h4 className="font-semibold">Resumo de compra</h4>
            <p className="mt-2 text-sm text-gray-600">Placeholder F-024</p>
            <Button variant="primary" className="mt-4 w-full">
              Ir para pagamento →
            </Button>
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