"use client"

import {
  Button,
  rsvAssistantCartOffsetPx,
  rsvColors,
  rsvZIndex,
} from "@rsv360/ui"
import { formatIngressosPrice } from "@/lib/ingressos/catalog-data"
import { IngressosSalvaVendasLink } from "./IngressosSalvaVendasLink"
import { IngressosVisitDateChips } from "./IngressosVisitDateChips"
import { useIngressosCart } from "./IngressosCartProvider"
import { useIngressosCheckoutFlow } from "./IngressosCheckoutFlowProvider"

export function IngressosCartStickyPlaceholder() {
  const { summary } = useIngressosCart()
  const { requestCheckout } = useIngressosCheckoutFlow()
  const cartItemCount = summary.totalItems

  if (cartItemCount === 0) {
    return (
      <div
        data-rsv-assistant-offset-px={undefined}
        aria-hidden
        className="hidden"
      />
    )
  }

  return (
    <>
      <div
        data-rsv-assistant-offset-px={rsvAssistantCartOffsetPx}
        aria-hidden
        className="hidden"
      />
      <div
        role="region"
        aria-label="Resumo de compra"
        data-testid="ingressos-cart-sticky-placeholder"
        className="fixed bottom-0 left-0 right-0 border-t bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm md:hidden"
        style={{ zIndex: rsvZIndex.cartBar, backgroundColor: rsvColors.canvas }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-2">
          <IngressosVisitDateChips />
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{cartItemCount}</span> itens ·{" "}
              {formatIngressosPrice(summary.subtotal)}
            </p>
            <Button
              variant="primary"
              className="text-sm"
              type="button"
              data-testid="ingressos-begin-checkout-mobile"
              onClick={requestCheckout}
            >
              Pagar
            </Button>
          </div>
          <IngressosSalvaVendasLink
            className="text-xs font-medium underline"
            label="Salva-Vendas"
          />
        </div>
      </div>
    </>
  )
}