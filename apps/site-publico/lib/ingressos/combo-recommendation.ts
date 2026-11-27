import type { IngressosTicket } from "./catalog-data"
import type { IngressosCitySlug } from "./query-intent"
import { filterTicketsByIntent } from "./filter-tickets"

const COMBO_DISCOUNT_RATE = 0.15

export type ComboIaRecommendation = {
  ticketIds: string[]
  titles: string[]
  subtotal: number
  discountedTotal: number
  savings: number
  discountPercent: number
}

function pickTicketsForCombo(
  tickets: IngressosTicket[],
  city: IngressosCitySlug,
): IngressosTicket[] {
  const pool = filterTicketsByIntent(tickets, city, null)
  const hotPark = pool.find((t) => t.id === "hot-park")
  const second =
    pool.find((t) => t.id !== "hot-park" && (t.discount ?? 0) >= 18) ??
    pool.find((t) => t.id !== hotPark?.id)

  if (hotPark && second) return [hotPark, second]
  if (pool.length >= 2) return pool.slice(0, 2)
  if (pool.length === 1) return pool
  return tickets.slice(0, Math.min(2, tickets.length))
}

export function buildComboIaRecommendation(
  tickets: IngressosTicket[],
  city: IngressosCitySlug,
): ComboIaRecommendation | null {
  const selected = pickTicketsForCombo(tickets, city)
  if (selected.length === 0) return null

  const subtotal = selected.reduce((sum, t) => sum + t.price, 0)
  const savings = Math.round(subtotal * COMBO_DISCOUNT_RATE * 100) / 100
  const discountedTotal = Math.round((subtotal - savings) * 100) / 100

  return {
    ticketIds: selected.map((t) => t.id),
    titles: selected.map((t) => t.name.replace(/^Ingresso\s+/i, "")),
    subtotal,
    discountedTotal,
    savings,
    discountPercent: Math.round(COMBO_DISCOUNT_RATE * 100),
  }
}