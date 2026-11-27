"use client"

import { Button } from "@rsv360/ui"
import { formatIngressosPrice } from "@/lib/ingressos/catalog-data"
import { IngressosSalvaVendasLink } from "./IngressosSalvaVendasLink"
import { IngressosVisitDateChips } from "./IngressosVisitDateChips"
import { useIngressosCart } from "./IngressosCartProvider"
import { useIngressosCheckoutFlow } from "./IngressosCheckoutFlowProvider"

export function IngressosCartSummaryPanel({ className }: { className?: string }) {
  const { summary, state, clearAll } = useIngressosCart()
  const { requestCheckout } = useIngressosCheckoutFlow()
  const lineEntries = Object.values(state.lines)

  return (
    <div className={className} data-testid="ingressos-cart-summary-panel">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold">Resumo de compra</h4>
        {lineEntries.length > 0 ? (
          <button
            type="button"
            className="text-xs font-medium text-gray-600 underline"
            data-testid="ingressos-cart-clear-all"
            onClick={clearAll}
          >
            Limpar
          </button>
        ) : null}
      </div>
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
      <IngressosVisitDateChips />
      {summary.totalItems > 0 ? (
        <p className="mt-3 text-xs text-gray-600">
          Ofertas de cabana, transporte e combo aparecem ao avançar para o pagamento.
        </p>
      ) : null}
      <p className="mt-3 text-sm font-semibold">
        Total: {formatIngressosPrice(summary.subtotal)}
      </p>
      <IngressosSalvaVendasLink className="mt-3 inline-block text-sm font-medium underline" />
      <Button
        variant="primary"
        className="mt-4 w-full"
        type="button"
        data-testid="ingressos-begin-checkout"
        disabled={summary.totalItems === 0}
        onClick={requestCheckout}
      >
        Ir para pagamento →
      </Button>
    </div>
  )
}