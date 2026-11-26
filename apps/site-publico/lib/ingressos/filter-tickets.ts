import type { IngressosTicket } from "./catalog-data"
import type { IngressosCitySlug, IngressosRapidoSlug } from "./query-intent"

function ticketMatchesCity(ticket: IngressosTicket, city: IngressosCitySlug): boolean {
  const loc = ticket.location.toLowerCase()
  if (city === "multi-destino") return true
  if (city === "rio-quente") return loc.includes("rio quente")
  if (city === "caldas-novas") return loc.includes("caldas novas")
  return true
}

function ticketMatchesRapido(ticket: IngressosTicket, rapido: IngressosRapidoSlug): boolean {
  switch (rapido) {
    case "hot-park":
      return ticket.id === "hot-park"
    case "popular":
      return Boolean(ticket.popular)
    case "criancas":
      return ticket.ageGroup.toLowerCase().includes("todas")
    case "combo":
      return (ticket.discount ?? 0) >= 14
    case "custo-beneficio":
      return (ticket.discount ?? 0) >= 18
    default:
      return true
  }
}

export function filterTicketsByIntent(
  tickets: IngressosTicket[],
  city: IngressosCitySlug,
  rapido: IngressosRapidoSlug | null,
): IngressosTicket[] {
  let out = tickets.filter((t) => ticketMatchesCity(t, city))
  if (rapido) {
    out = out.filter((t) => ticketMatchesRapido(t, rapido))
  }
  if (rapido === "custo-beneficio") {
    out = [...out].sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0))
  }
  return out
}