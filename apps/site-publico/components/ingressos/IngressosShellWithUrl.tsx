"use client"

import { useMemo } from "react"
import type { IngressosTicket } from "@/lib/ingressos/catalog-data"
import { buildComboIaRecommendation } from "@/lib/ingressos/combo-recommendation"
import { filterTicketsByIntent } from "@/lib/ingressos/filter-tickets"
import { useIngressosUrlIntent } from "@/hooks/use-ingressos-url-intent"
import { IngressosCartProvider } from "./IngressosCartProvider"
import { IngressosPageShell } from "./IngressosPageShell"

export function IngressosShellWithUrl({ tickets }: { tickets: IngressosTicket[] }) {
  const { intent, setCity, setRapido, clearRapido } = useIngressosUrlIntent()

  const filteredTickets = useMemo(
    () => filterTicketsByIntent(tickets, intent.city, intent.rapido),
    [tickets, intent.city, intent.rapido],
  )

  const comboRecommendation = useMemo(
    () => buildComboIaRecommendation(tickets, intent.city),
    [tickets, intent.city],
  )

  return (
    <IngressosCartProvider tickets={tickets}>
      <IngressosPageShell
        filteredTickets={filteredTickets}
        comboRecommendation={comboRecommendation}
        intent={intent}
        onCityChange={setCity}
        onRapidoChange={setRapido}
        onClearRapido={clearRapido}
      />
    </IngressosCartProvider>
  )
}