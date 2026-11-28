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
  visitDateIso: string | null
}

export type IngressosCartSummary = {
  totalItems: number
  subtotal: number
}

export const initialIngressosCartState: IngressosCartState = {
  lines: {},
  visitDateIso: null,
}

export const INGRESSOS_CART_STORAGE_KEY = "rsv-ingressos-cart-v1" as const

export const INGRESSOS_SALVA_VENDAS_WHATSAPP_E164 = "5564993197555" as const