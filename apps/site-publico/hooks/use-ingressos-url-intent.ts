"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  type IngressosCitySlug,
  type IngressosRapidoSlug,
  buildIngressosPath,
  parseIngressosSearchParams,
  stripRapidoFromSearchParams,
} from "@/lib/ingressos/query-intent"

export function useIngressosUrlIntent() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const rapidoCleanupDone = useRef(false)

  const intent = useMemo(
    () => parseIngressosSearchParams(searchParams),
    [searchParams],
  )

  const updateParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString())
      mutate(next)
      router.replace(buildIngressosPath(pathname, next), { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const setCity = useCallback(
    (city: IngressosCitySlug) => {
      updateParams((params) => {
        params.set("city", city)
      })
    },
    [updateParams],
  )

  const setRapido = useCallback(
    (rapido: IngressosRapidoSlug) => {
      updateParams((params) => {
        params.set("rapido", rapido)
      })
    },
    [updateParams],
  )

  const clearRapido = useCallback(() => {
    updateParams((params) => {
      params.delete("rapido")
    })
  }, [updateParams])

  useEffect(() => {
    if (rapidoCleanupDone.current) return
    if (!searchParams.get("rapido")) return

    rapidoCleanupDone.current = true
    const next = stripRapidoFromSearchParams(new URLSearchParams(searchParams.toString()))
    const href = buildIngressosPath(pathname, next)
    if (typeof window !== "undefined") {
      window.history.replaceState(window.history.state, "", href)
    }
  }, [pathname, searchParams])

  return {
    intent,
    setCity,
    setRapido,
    clearRapido,
  }
}