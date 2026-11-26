"use client"

import {
  Button,
  rsvAssistantCartOffsetPx,
  rsvColors,
  rsvZIndex,
} from "@rsv360/ui"

export function IngressosCartStickyPlaceholder({ cartItemCount = 0 }: { cartItemCount?: number }) {
  return (
  <>
    <div
      data-rsv-assistant-offset-px={cartItemCount > 0 ? rsvAssistantCartOffsetPx : undefined}
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
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{cartItemCount}</span> itens · R$ 0,00
        </p>
        <Button variant="primary" className="text-sm">
          Ver resumo / Pagar
        </Button>
      </div>
    </div>
  </>
  )
}