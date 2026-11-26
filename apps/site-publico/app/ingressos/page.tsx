"use client"

import { ImageTelemetrySentinel } from "@/components/telemetry/ImageTelemetrySentinel"
import { IngressosLegacyCatalog } from "@/components/ingressos/IngressosLegacyCatalog"
import { IngressosPageShell } from "@/components/ingressos/IngressosPageShell"
import { isIngressosLegacyCatalogEnabled } from "@/lib/ingressos/feature-flags"
import { useIngressosCatalog } from "@/lib/ingressos/use-ingressos-catalog"

export default function IngressosPage() {
  const { isLoading, tickets, reportTicketImageError } = useIngressosCatalog()
  const showLegacy = isIngressosLegacyCatalogEnabled()

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 flex flex-col items-center justify-center z-50">
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-full bg-white/20 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl animate-bounce">🎟️</div>
          </div>
        </div>
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Carregando Ingressos</h2>
          <p className="text-cyan-100">Preparando as melhores atrações para você...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <ImageTelemetrySentinel />
      {showLegacy ? (
        <IngressosLegacyCatalog tickets={tickets} reportTicketImageError={reportTicketImageError} />
      ) : (
        <IngressosPageShell tickets={tickets} />
      )}
    </>
  )
}