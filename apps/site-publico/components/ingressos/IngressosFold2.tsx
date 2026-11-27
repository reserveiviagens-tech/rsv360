"use client"

import { useState, type CSSProperties, type ReactNode } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  NumericStepper,
  rsvColors,
} from "@rsv360/ui"
import type { IngressosTicket } from "@/lib/ingressos/catalog-data"

export function IngressosFold2({ tickets }: { tickets: IngressosTicket[] }) {
  const hotPark = tickets.find((t) => t.id === "hot-park")
  const others = tickets.filter((t) => t.id !== "hot-park")
  const [qty, setQty] = useState(2)

  return (
    <section aria-label="Combo e catálogo" data-testid="ingressos-fold-2" className="space-y-6">
      <motionCard
        className="rounded-2xl border p-5 text-white"
        style={{
          backgroundColor: rsvColors.midnight,
          borderColor: rsvColors.amber,
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge variant="amber">Combo IA</Badge>
            <h3 className="mt-2 text-lg font-bold">Economize com o combo inteligente</h3>
            <p className="text-sm text-white/80">Até 15% OFF · placeholder F-022</p>
          </div>
          <Button variant="amber">Adicionar combo</Button>
        </div>
      </motionCard>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <Accordion type="single" defaultValue="hot-park" collapsible>
            {hotPark ? (
              <AccordionItem value="hot-park">
                <AccordionTrigger>{hotPark.name}</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-3 text-sm text-gray-600">{hotPark.description}</p>
                  <NumericStepper value={qty} min={0} max={20} onChange={setQty} />
                </AccordionContent>
              </AccordionItem>
            ) : null}
            {others.map((t) => (
              <AccordionItem key={t.id} value={t.id}>
                <AccordionTrigger>{t.name}</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-gray-600">{t.location}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <aside
          className="hidden lg:block lg:sticky lg:top-24 lg:self-start"
          data-testid="ingressos-cart-sticky-desktop"
        >
          <motionCard className="rounded-xl border bg-white p-4 shadow-sm">
            <h4 className="font-semibold">Resumo de compra</h4>
            <p className="mt-2 text-sm text-gray-600">Placeholder F-024</p>
            <Button variant="primary" className="mt-4 w-full">
              Ir para pagamento →
            </Button>
          </motionCard>
        </aside>
      </div>
    </section>
  )
}

function motionCard({
  className,
  style,
  children,
}: {
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  )
}