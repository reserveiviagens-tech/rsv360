"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react"
import type { IngressosTicket } from "@/lib/ingressos/catalog-data"
import type { ComboIaRecommendation } from "@/lib/ingressos/combo-recommendation"
import {
  addComboTicketIds,
  clearAll,
  clearLine,
  getLineQty,
  setLineQty,
  summarizeCart,
} from "@/lib/ingressos/ingressos-cart-reducer"
import {
  initialIngressosCartState,
  type IngressosCartState,
  type IngressosCartSummary,
} from "@/lib/ingressos/ingressos-cart-types"

type IngressosCartContextValue = {
  state: IngressosCartState
  summary: IngressosCartSummary
  getQty: (ticketId: string) => number
  setQty: (ticketId: string, qty: number) => void
  clearLine: (ticketId: string) => void
  clearAll: () => void
  addComboRecommendation: (recommendation: ComboIaRecommendation) => void
}

const IngressosCartContext = createContext<IngressosCartContextValue | null>(null)

function buildCatalogMap(tickets: IngressosTicket[]) {
  return Object.fromEntries(
    tickets.map((t) => [t.id, { unitPrice: t.price, label: t.name }]),
  )
}

type CartAction =
  | { type: "SET_QTY"; ticketId: string; qty: number }
  | { type: "CLEAR_LINE"; ticketId: string }
  | { type: "CLEAR_ALL" }
  | { type: "ADD_COMBO"; ticketIds: string[] }

function cartReducer(
  state: IngressosCartState,
  action: CartAction,
  catalog: ReturnType<typeof buildCatalogMap>,
): IngressosCartState {
  switch (action.type) {
    case "SET_QTY": {
      const meta = catalog[action.ticketId]
      if (!meta) return state
      return setLineQty(state, action.ticketId, action.qty, meta)
    }
    case "CLEAR_LINE":
      return clearLine(state, action.ticketId)
    case "CLEAR_ALL":
      return clearAll(state)
    case "ADD_COMBO":
      return addComboTicketIds(state, action.ticketIds, catalog)
    default:
      return state
  }
}

export function IngressosCartProvider({
  tickets,
  children,
}: {
  tickets: IngressosTicket[]
  children: ReactNode
}) {
  const catalog = useMemo(() => buildCatalogMap(tickets), [tickets])

  const [state, dispatch] = useReducer(
    (prev: IngressosCartState, action: CartAction) => cartReducer(prev, action, catalog),
    initialIngressosCartState,
  )

  const summary = useMemo(() => summarizeCart(state), [state])

  const setQty = useCallback((ticketId: string, qty: number) => {
    dispatch({ type: "SET_QTY", ticketId, qty })
  }, [])

  const clearLineCb = useCallback((ticketId: string) => {
    dispatch({ type: "CLEAR_LINE", ticketId })
  }, [])

  const clearAllCb = useCallback(() => {
    dispatch({ type: "CLEAR_ALL" })
  }, [])

  const addComboRecommendation = useCallback((recommendation: ComboIaRecommendation) => {
    dispatch({ type: "ADD_COMBO", ticketIds: recommendation.ticketIds })
  }, [])

  const getQty = useCallback((ticketId: string) => getLineQty(state, ticketId), [state])

  const value = useMemo(
    (): IngressosCartContextValue => ({
      state,
      summary,
      getQty,
      setQty,
      clearLine: clearLineCb,
      clearAll: clearAllCb,
      addComboRecommendation,
    }),
    [state, summary, getQty, setQty, clearLineCb, clearAllCb, addComboRecommendation],
  )

  return (
    <IngressosCartContext.Provider value={value}>{children}</IngressosCartContext.Provider>
  )
}

export function useIngressosCart(): IngressosCartContextValue {
  const ctx = useContext(IngressosCartContext)
  if (!ctx) {
    throw new Error("useIngressosCart must be used within IngressosCartProvider")
  }
  return ctx
}