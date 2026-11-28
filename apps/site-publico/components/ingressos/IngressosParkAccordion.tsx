"use client"

import { useMemo } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  NumericStepper,
  rsvColors,
} from "@rsv360/ui"
import type { IngressosTicket } from "@/lib/ingressos/catalog-data"
import { formatIngressosPrice } from "@/lib/ingressos/catalog-data"
import { useIngressosCart } from "./IngressosCartProvider"

export function IngressosParkAccordion({ filteredTickets }: { filteredTickets: IngressosTicket[] }) {
  const { getQty, setQty } = useIngressosCart()

  const accordionDefault = useMemo(() => {
    if (filteredTickets.length === 0) return undefined
    const hot = filteredTickets.find((t) => t.id === "hot-park")
    return hot?.id ?? filteredTickets[0]?.id
  }, [filteredTickets])

  if (filteredTickets.length === 0) {
    return (
      <p
        className="rounded-lg border border-dashed bg-white p-6 text-center text-sm text-gray-600"
        data-testid="ingressos-catalog-empty"
      >
        Nenhum ingresso para esse filtro. O Combo IA acima sugere a melhor opção para você.
      </p>
    )
  }

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={accordionDefault}
      key={accordionDefault ?? "empty-accordion"}
    >
      {filteredTickets.map((ticket) => (
        <AccordionItem key={ticket.id} value={ticket.id}>
          <AccordionTrigger>
            <span className="flex flex-1 flex-wrap items-center justify-between gap-2 pr-2">
              <span>{ticket.name}</span>
              <span className="text-sm font-semibold" style={{ color: rsvColors.action }}>
                {formatIngressosPrice(ticket.price)}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Individual / Padrão
            </p>
            <p className="mb-2 mt-1 text-sm text-gray-600">{ticket.description}</p>
            <button
              type="button"
              className="mb-4 text-sm font-medium underline"
              style={{ color: rsvColors.midnight }}
            >
              + Ver detalhes
            </button>
            <NumericStepper
              value={getQty(ticket.id)}
              min={0}
              max={20}
              onChange={(qty) => setQty(ticket.id, qty)}
              aria-label={`Quantidade ${ticket.name}`}
            />
            <button
              type="button"
              className="mt-3 text-left text-sm text-gray-600 underline"
            >
              Ver opções de meia-entrada
            </button>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}