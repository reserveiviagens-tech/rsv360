"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react"
import type { IngressosTicket } from "@/lib/ingressos/catalog-data"
import type { ComboIaRecommendation } from "@/lib/ingressos/combo-recommendation"
import {
  mergeHydratedCart,
  readCartFromSessionStorage,
  writeCartToSessionStorage,
} from "@/lib/ingressos/ingressos-cart-persistence"
import {
  addComboTicketIds,
  clearAll,
  clearLine,
  getLineQty,
  setLineQty,
  setVisitDate,
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
  setVisitDate: (visitDateIso: string | null) => void
  addComboRecommendation: (recommendation: ComboIaRecommendation) => void
}

const IngressosCartContext = createContext<IngressosCartContextValue | null>(null)

function buildCatalogMap(tickets: IngressosTicket[]) {
  return Object.fromEntries(
    tickets.map((t) => [t.id, { unitPrice: t.price, label: t.name }]),
  )
}

type CartAction =
  | { type: "HYDRATE"; state: IngressosCartState }
  | { type: "SET_QTY"; ticketId: string; qty: number }
  | { type: "CLEAR_LINE"; ticketId: string }
  | { type: "CLEAR_ALL" }
  | { type: "SET_VISIT_DATE"; visitDateIso: string | null }
  | { type: "ADD_COMBO"; ticketIds: string[] }

function cartReducer(
  state: IngressosCartState,
  action: CartAction,
  catalog: ReturnType<typeof buildCatalogMap>,
): IngressosCartState {
  switch (action.type) {
    case "HYDRATE":
      return action.state
    case "SET_QTY": {
      const meta = catalog[action.ticketId]
      if (!meta) return state
      return setLineQty(state, action.ticketId, action.qty, meta)
    }
    case "CLEAR_LINE":
      return clearLine(state, action.ticketId)
    case "CLEAR_ALL":
      return clearAll(state)
    case "SET_VISIT_DATE":
      return setVisitDate(state, action.visitDateIso)
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

  useEffect(() => {
    const hydrated = mergeHydratedCart(readCartFromSessionStorage())
    dispatch({ type: "HYDRATE", state: hydrated })
  }, [])

  useEffect(() => {
    writeCartToSessionStorage(state)
  }, [state])

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

  const setVisitDateCb = useCallback((visitDateIso: string | null) => {
    dispatch({ type: "SET_VISIT_DATE", visitDateIso })
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
      setVisitDate: setVisitDateCb,
      addComboRecommendation,
    }),
    [state, summary, getQty, setQty, clearLineCb, clearAllCb, setVisitDateCb, addComboRecommendation],
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