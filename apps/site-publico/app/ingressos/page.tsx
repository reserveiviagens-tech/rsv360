"use client"

import { Suspense } from "react"
import { ImageTelemetrySentinel } from "@/components/telemetry/ImageTelemetrySentinel"
import { IngressosLegacyCatalog } from "@/components/ingressos/IngressosLegacyCatalog"
import { IngressosShellWithUrl } from "@/components/ingressos/IngressosShellWithUrl"
import { isIngressosLegacyCatalogEnabled } from "@/lib/ingressos/feature-flags"
import { useIngressosCatalog } from "@/lib/ingressos/use-ingressos-catalog"

function IngressosShellFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 text-center text-sm text-gray-600" aria-busy="true">
      Carregando filtros e ofertas…
    </div>
  )
}

export default function IngressosPage() {
  const { isLoading, tickets, reportTicketImageError } = useIngressosCatalog()
  const showLegacy = isIngressosLegacyCatalogEnabled()

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600">
        <div className="relative mb-8">
          <div className="h-32 w-32 animate-pulse rounded-full bg-white/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-bounce text-6xl">🎟️</div>
          </div>
        </div>
        <div className="text-center text-white">
          <h2 className="mb-2 text-2xl font-bold">Carregando Ingressos</h2>
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
        <Suspense fallback={<IngressosShellFallback />}>
          <IngressosShellWithUrl tickets={tickets} />
        </Suspense>
      )}
    </>
  )
}