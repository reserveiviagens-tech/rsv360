"use client"

import type { ReactNode } from "react"
import { rsvColors, rsvLayout } from "@rsv360/ui"
import type { IngressosTicket } from "@/lib/ingressos/catalog-data"
import { IngressosCartStickyPlaceholder } from "./IngressosCartStickyPlaceholder"
import { IngressosFold1 } from "./IngressosFold1"
import { IngressosFold2 } from "./IngressosFold2"
import { IngressosFold3 } from "./IngressosFold3"

export function IngressosPageShell({ tickets }: { tickets: IngressosTicket[] }) {
  return (
    <div
      data-testid="rsv-ingressos-shell"
      data-rsv-ingressos-shell
      className="min-h-screen"
      style={{ backgroundColor: rsvColors.canvas }}
    >
      <motionMain
        className={`mx-auto w-full ${rsvLayout.containerMaxClass} ${rsvLayout.containerPaddingClasses} py-6 space-y-10`}
      >
        <IngressosFold1 />
        <IngressosFold2 tickets={tickets} />
        <IngressosFold3 />
      </motionMain>
      <IngressosCartStickyPlaceholder cartItemCount={0} />
    </div>
  )
}

function motionMain({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <main className={className}>{children}</main>
}