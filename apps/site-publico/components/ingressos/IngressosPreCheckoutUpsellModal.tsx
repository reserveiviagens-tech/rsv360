"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { Badge, Button, rsvColors, rsvZIndex } from "@rsv360/ui"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog"
import { INGRESSOS_UPSELL_OFFERS } from "@/lib/ingressos/ingressos-upsell-offers"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinue: () => void
}

const modalZ = rsvZIndex.modal

export function IngressosPreCheckoutUpsellModal({ open, onOpenChange, onContinue }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          style={{ zIndex: modalZ }}
        />
        <DialogPrimitive.Content
          data-testid="ingressos-pre-checkout-upsell-modal"
          className={cn(
            "fixed left-[50%] top-[50%] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg",
            "max-h-[85vh] overflow-y-auto",
          )}
          style={{ zIndex: modalZ + 1 }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: rsvColors.midnight }}>
              Aproveite antes de pagar
            </DialogTitle>
            <DialogDescription>
              Cabanas, transporte e combos aumentam sua experiência — opcional, sem alterar seus
              ingressos.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-3">
            {INGRESSOS_UPSELL_OFFERS.map((offer) => (
              <li
                key={offer.id}
                className="rounded-lg border bg-white p-3"
                data-testid={`ingressos-upsell-offer-${offer.id}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-900">{offer.title}</p>
                  {offer.badge ? (
                    <Badge variant="amber" className="text-xs">
                      {offer.badge}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-gray-600">{offer.description}</p>
              </li>
            ))}
          </ul>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              data-testid="ingressos-upsell-continue"
              onClick={onContinue}
            >
              Continuar só com ingressos
            </Button>
          </DialogFooter>
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}