"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { evaluateIngressosCheckoutGate } from "@/lib/ingressos/ingressos-checkout-gate"
import {
  markIngressosUpsellSeenInSession,
  readUpsellDismissedFromSessionStorage,
  shouldShowIngressosUpsellModal,
} from "@/lib/ingressos/ingressos-upsell-session"
import { IngressosPreCheckoutUpsellModal } from "./IngressosPreCheckoutUpsellModal"
import { useIngressosCart } from "./IngressosCartProvider"
import { useIngressosBeginCheckout } from "./use-ingressos-begin-checkout"

type IngressosCheckoutFlowContextValue = {
  requestCheckout: () => void
  dateRequiredVisible: boolean
  dismissDateHint: () => void
}

const IngressosCheckoutFlowContext = createContext<IngressosCheckoutFlowContextValue | null>(null)

export function IngressosCheckoutFlowProvider({ children }: { children: ReactNode }) {
  const { state, summary } = useIngressosCart()
  const finalizeCheckout = useIngressosBeginCheckout()
  const [upsellOpen, setUpsellOpen] = useState(false)
  const [dateRequiredVisible, setDateRequiredVisible] = useState(false)

  const runFinalize = useCallback(() => {
    void finalizeCheckout(state)
  }, [finalizeCheckout, state])

  const continueAfterUpsell = useCallback(() => {
    markIngressosUpsellSeenInSession()
    setUpsellOpen(false)
    runFinalize()
  }, [runFinalize])

  const requestCheckout = useCallback(() => {
    const gate = evaluateIngressosCheckoutGate(state, summary)
    if (!gate.ok) {
      if (gate.reason === "missing-visit-date") {
        setDateRequiredVisible(true)
      }
      return
    }
    setDateRequiredVisible(false)
    const dismissed = readUpsellDismissedFromSessionStorage()
    if (shouldShowIngressosUpsellModal(dismissed)) {
      setUpsellOpen(true)
      return
    }
    runFinalize()
  }, [state, summary, runFinalize])

  const value = useMemo(
    (): IngressosCheckoutFlowContextValue => ({
      requestCheckout,
      dateRequiredVisible,
      dismissDateHint: () => setDateRequiredVisible(false),
    }),
    [requestCheckout, dateRequiredVisible],
  )

  return (
    <IngressosCheckoutFlowContext.Provider value={value}>
      {children}
      <IngressosPreCheckoutUpsellModal
        open={upsellOpen}
        onOpenChange={(open) => {
          if (!open) {
            markIngressosUpsellSeenInSession()
          }
          setUpsellOpen(open)
        }}
        onContinue={continueAfterUpsell}
      />
    </IngressosCheckoutFlowContext.Provider>
  )
}

export function useIngressosCheckoutFlow(): IngressosCheckoutFlowContextValue {
  const ctx = useContext(IngressosCheckoutFlowContext)
  if (!ctx) {
    throw new Error("useIngressosCheckoutFlow must be used within IngressosCheckoutFlowProvider")
  }
  return ctx
}