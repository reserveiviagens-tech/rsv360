"use client"

import { useEffect, useState } from "react"
import {
  buildLoadAttemptKey,
  reportImageError,
} from "@/lib/image-error-telemetry"
import { INGRESSOS_TICKETS, type IngressosTicket } from "./catalog-data"

export function useIngressosCatalog() {
  const [isLoading, setIsLoading] = useState(true)
  const tickets: IngressosTicket[] = INGRESSOS_TICKETS

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500)
    return () => clearTimeout(timer)
  }, [])

  const reportTicketImageError = (ticket: IngressosTicket) => {
    const attemptKey = buildLoadAttemptKey({
      component_name: "IngressosPage",
      url: ticket.image,
      attempt_id: `${ticket.id}:${ticket.image}`,
    })
    void reportImageError(attemptKey, {
      url: ticket.image,
      component_name: "IngressosPage",
      image_id: ticket.id,
      parque_id: ticket.id,
      ingresso_id: ticket.id,
      page_route: "/ingressos",
    })
  }

  return { isLoading, tickets, reportTicketImageError }
}