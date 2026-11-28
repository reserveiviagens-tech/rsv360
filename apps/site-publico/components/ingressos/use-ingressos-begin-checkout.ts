"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  INGRESSOS_CHECKOUT_DRAFT_STORAGE_KEY,
  buildCheckoutDraft,
} from "@/lib/ingressos/ingressos-checkout-draft"
import { submitIngressosCheckoutDraft } from "@/lib/ingressos/ingressos-checkout-client"
import type { IngressosCartState } from "@/lib/ingressos/ingressos-cart-types"

export function useIngressosBeginCheckout() {
  const router = useRouter()

  return useCallback(
    async (state: IngressosCartState) => {
      const draft = buildCheckoutDraft(state)
      if (!draft) return

      sessionStorage.setItem(INGRESSOS_CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(draft))
      await submitIngressosCheckoutDraft(draft)
      router.push("/ingressos/checkout")
    },
    [router],
  )
}