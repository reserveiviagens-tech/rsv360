"use client"

import { Button } from "@rsv360/ui"
import { formatIngressosPrice } from "@/lib/ingressos/catalog-data"
import { useIngressosCart } from "./IngressosCartProvider"

export function IngressosCartSummaryPanel({ className }: { className?: string }) {
  const { summary, state } = useIngressosCart()
  const lineEntries = Object.values(state.lines)

  return (
    <div className={className} data-testid="ingressos-cart-summary-panel">
      <h4 className="font-semibold">Resumo de compra</h4>
      {lineEntries.length === 0 ? (
        <p className="mt-2 text-sm text-gray-600">Nenhum ingresso selecionado.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-gray-700">
          {lineEntries.map((line) => (
            <li key={line.ticketId} className="flex justify-between gap-2">
              <span className="truncate">
                {line.qty}× {line.label.replace(/^Ingresso\s+/i, "")}
              </span>
              <span className="shrink-0 tabular-nums">
                {formatIngressosPrice(line.qty * line.unitPrice)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm font-semibold">
        Total: {formatIngressosPrice(summary.subtotal)}
      </p>
      <Button variant="primary" className="mt-4 w-full" type="button">
        Ir para pagamento →
      </Button>
    </div>
  )
}