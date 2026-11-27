import {
  INGRESSOS_CART_QTY_MAX,
  INGRESSOS_CART_QTY_MIN,
  type IngressosCartState,
  type IngressosCartSummary,
  type IngressosLineItem,
} from "./ingressos-cart-types"

export type SetLineMeta = {
  unitPrice: number
  label: string
}

function clampQty(qty: number): number {
  return Math.min(INGRESSOS_CART_QTY_MAX, Math.max(INGRESSOS_CART_QTY_MIN, qty))
}

export function setLineQty(
  state: IngressosCartState,
  ticketId: string,
  qty: number,
  meta?: SetLineMeta,
): IngressosCartState {
  const nextQty = clampQty(qty)
  if (nextQty === 0) {
    return clearLine(state, ticketId)
  }

  const existing = state.lines[ticketId]
  const line: IngressosLineItem = {
    ticketId,
    qty: nextQty,
    unitPrice: meta?.unitPrice ?? existing?.unitPrice ?? 0,
    label: meta?.label ?? existing?.label ?? ticketId,
  }

  return {
    lines: {
      ...state.lines,
      [ticketId]: line,
    },
  }
}

export function clearLine(state: IngressosCartState, ticketId: string): IngressosCartState {
  if (!state.lines[ticketId]) return state
  const { [ticketId]: _removed, ...rest } = state.lines
  return { lines: rest }
}

export function clearAll(state: IngressosCartState): IngressosCartState {
  return { lines: {} }
}

export function addComboTicketIds(
  state: IngressosCartState,
  ticketIds: string[],
  catalog: Record<string, SetLineMeta>,
): IngressosCartState {
  let next = state
  for (const ticketId of ticketIds) {
    const meta = catalog[ticketId]
    if (!meta) continue
    const current = next.lines[ticketId]?.qty ?? 0
    next = setLineQty(next, ticketId, Math.min(INGRESSOS_CART_QTY_MAX, current + 1), meta)
  }
  return next
}

export function summarizeCart(state: IngressosCartState): IngressosCartSummary {
  const values = Object.values(state.lines)
  const totalItems = values.reduce((sum, line) => sum + line.qty, 0)
  const subtotal = values.reduce((sum, line) => sum + line.qty * line.unitPrice, 0)
  return { totalItems, subtotal }
}

export function getLineQty(state: IngressosCartState, ticketId: string): number {
  return state.lines[ticketId]?.qty ?? 0
}