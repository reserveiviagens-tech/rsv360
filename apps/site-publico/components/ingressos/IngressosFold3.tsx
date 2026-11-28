"use client"

import type { ReactNode } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  rsvColors,
} from "@rsv360/ui"

export function IngressosFold3() {
  return (
    <section aria-label="Cross-sell e rodapé" data-testid="ingressos-fold-3" className="space-y-8 pb-28 md:pb-12">
      <motionBlock>
        <h3 className="text-lg font-bold" style={{ color: rsvColors.textPrimary }}>
          Quem comprou ingressos também reservou
        </h3>
        <div className="mt-4 min-w-0 max-w-full">
          <div className="flex gap-4 overflow-x-auto overscroll-x-contain pb-2 [-webkit-overflow-scrolling:touch]">
          {["Hotel A", "Pousada B", "Resort C", "Flat D"].map((name) => (
            <div
              key={name}
              className="min-w-[200px] shrink-0 rounded-lg border bg-white p-4 shadow-sm"
            >
              <p className="font-medium">{name}</p>
              <p className="text-sm text-gray-600">a partir de R$ 199,00</p>
            </div>
          ))}
          </div>
        </div>
      </motionBlock>

      <Accordion type="single" collapsible>
        <AccordionItem value="faq">
          <AccordionTrigger>Dúvidas frequentes</AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-gray-600">
              <li>Ingressos digitais com validação no parque — apresente QR ou código na entrada.</li>
              <li>Meia-entrada exige comprovante no balcão, conforme regras do parque.</li>
              <li>Cancelamento e reembolso seguem a política exibida antes do pagamento.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="map">
          <AccordionTrigger>Localização</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-gray-600">
              Rio Quente (GO) e Caldas Novas (GO). Use o rodapé para contato ou{" "}
              <a href="/mapa-caldas-novas" className="font-medium underline">
                mapa de Caldas Novas
              </a>
              .
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="rounded-lg bg-gray-100 p-4 text-center text-sm text-gray-700">
        <p className="font-semibold">Precisa de Ajuda?</p>
        <p className="mt-2">
          Central GO (64) 2127-0415 · WhatsApp (64) 99319-7555 · Sede administrativa Cuiabá-MT
        </p>
      </div>
    </section>
  )
}

function motionBlock({ children }: { children: ReactNode }) {
  return <div>{children}</div>
}