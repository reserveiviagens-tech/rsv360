"use client"

import { ArrowLeft, Phone, Users, Clock, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import Link from "next/link"
import { getCrossSellItemByIndex, COTACAO_ITEM } from "@/lib/cross-sell-matrix"
import { getContextualSubtitle } from "@/lib/cross-sell-context-messages"
import { MobileCrossSellCard } from "@/components/home/mobile-cross-sell-card"
import { getHomeSideRailsFallback } from "@/lib/home-side-rails"
import { formatIngressosPrice, type IngressosTicket } from "@/lib/ingressos/catalog-data"

type Props = {
  tickets: IngressosTicket[]
  reportTicketImageError: (ticket: IngressosTicket) => void
}

/** Legacy mobile catalog — hidden unless NEXT_PUBLIC_INGRESSOS_LEGACY_CATALOG=true */
export function IngressosLegacyCatalog({ tickets, reportTicketImageError }: Props) {
  return (
    <div
      className="max-w-md mx-auto bg-gray-50 min-h-screen relative"
      data-testid="ingressos-legacy-catalog"
    >
      <div className="animate-in fade-in duration-500">
        <header className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white p-6 rounded-b-3xl shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 p-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/favicon-reservei-viagens-VVm0zxcolWbkv9Lf5Yj0PUoxLJrARl.png"
              alt="Reservei Viagens"
              width={40}
              height={40}
              className="rounded-full bg-white/20 p-1"
            />
            <h1 className="text-2xl font-bold tracking-tight">Ingressos para Parques</h1>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-4">
            <h2 className="text-lg font-bold mb-2">🎢 Diversão Garantida!</h2>
            <p className="text-sm mb-3">Até 25% OFF + Entrada prioritária</p>
            <Badge className="bg-yellow-500 text-black animate-pulse">🎫 Ingressos limitados!</Badge>
          </div>
        </header>

        <div className="p-6 space-y-6">
          <Card className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
            <CardContent className="p-4 text-center">
              <h3 className="font-bold text-lg mb-2">🎯 COMPRE ONLINE E ECONOMIZE!</h3>
              <p className="text-sm mb-3">Evite filas e garanta entrada prioritária</p>
              <Badge className="bg-white text-green-600 font-bold">Desconto exclusivo online!</Badge>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {tickets.map((ticket, index) => {
              const crossSellItem =
                (index + 1) % 4 === 0
                  ? getCrossSellItemByIndex("parks", Math.floor((index + 1) / 4) - 1, getHomeSideRailsFallback())
                  : null
              return (
                <div key={ticket.id} className="space-y-6">
                  <Card
                    className={`overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02] relative ${
                      ticket.popular
                        ? "border-4 border-yellow-400 shadow-lg"
                        : "border-2 border-transparent hover:border-cyan-200"
                    }`}
                  >
                    {ticket.popular && (
                      <div className="absolute top-0 left-0 right-0 bg-yellow-400 text-black text-center py-1 text-sm font-bold z-20">
                        🏆 MAIS POPULAR 🏆
                      </div>
                    )}
                    {ticket.discount && (
                      <Badge className="absolute top-3 right-3 bg-red-500 text-white z-10 animate-pulse">
                        -{ticket.discount}% OFF
                      </Badge>
                    )}
                    <div className={`aspect-video relative overflow-hidden ${ticket.popular ? "mt-8" : ""}`}>
                      <img
                        src={ticket.image || "/placeholder.svg"}
                        alt={ticket.name}
                        className="w-full h-full object-cover"
                        onError={() => reportTicketImageError(ticket)}
                      />
                    </div>
                    <CardContent className="p-6">
                      <h3 className="font-bold text-xl mb-2">{ticket.name}</h3>
                      <p className="text-gray-600 text-sm mb-4 leading-relaxed">{ticket.description}</p>
                      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-500" />
                          <span className="text-gray-600">{ticket.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-green-500" />
                          <span className="text-gray-600">{ticket.duration}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-500" />
                          <span className="text-gray-600">{ticket.ageGroup}</span>
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <div className="text-3xl font-bold text-green-600">{formatIngressosPrice(ticket.price)}</div>
                        <Button
                          className="w-full mt-4 bg-cyan-500 hover:bg-cyan-600 text-white"
                          onClick={() =>
                            window.open(
                              `https://wa.me/5564993197555?text=Olá! Quero comprar o ${ticket.name}`,
                              "_blank",
                            )
                          }
                        >
                          Comprar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  {crossSellItem && crossSellItem.id !== "monte-suas-ferias" && (
                    <MobileCrossSellCard
                      item={crossSellItem}
                      variant="compact"
                      randomImage
                      animation="fade"
                      contextualSubtitle={getContextualSubtitle("parks", crossSellItem.id, crossSellItem.subtitle)}
                    />
                  )}
                </div>
              )
            })}
          </div>

          <MobileCrossSellCard
            item={COTACAO_ITEM}
            variant="full"
            ctaText="Completar pacote"
            contextualSubtitle={getContextualSubtitle("parks", "monte-suas-ferias", COTACAO_ITEM.subtitle)}
          />
        </div>
      </div>

      <a
        href="https://wa.me/5564993197555?text=Olá! Gostaria de informações sobre ingressos para parques."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 right-4 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg z-50"
      >
        <Phone className="w-7 h-7 text-white" />
      </a>
    </div>
  )
}