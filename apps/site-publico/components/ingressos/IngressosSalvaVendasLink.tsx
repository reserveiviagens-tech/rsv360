"use client"

import { buildSalvaVendasWhatsAppUrl } from "@/lib/ingressos/ingressos-salva-vendas"
import { useIngressosCart } from "./IngressosCartProvider"

type Props = {
  className?: string
  label?: string
}

export function IngressosSalvaVendasLink({
  className,
  label = "Salva-Vendas no WhatsApp",
}: Props) {
  const { state, summary } = useIngressosCart()
  if (summary.totalItems === 0) return null

  const href = buildSalvaVendasWhatsAppUrl(state)

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? "text-sm font-medium underline"}
      data-testid="ingressos-salva-vendas-link"
    >
      {label}
    </a>
  )
}