export const INGRESSOS_CART_QTY_MIN = 0 as const
export const INGRESSOS_CART_QTY_MAX = 20 as const

export type IngressosLineItem = {
  ticketId: string
  qty: number
  unitPrice: number
  label: string
}

export type IngressosCartState = {
  lines: Record<string, IngressosLineItem>
}

export type IngressosCartSummary = {
  totalItems: number
  subtotal: number
}

export const initialIngressosCartState: IngressosCartState = {
  lines: {},
}