export type IngressosUpsellOffer = {
  id: string
  title: string
  description: string
  badge?: string
}

export const INGRESSOS_UPSELL_OFFERS: IngressosUpsellOffer[] = [
  {
    id: "cabana",
    title: "Cabana premium no parque",
    description: "Mais conforto e sombra o dia inteiro — combine com seus ingressos.",
    badge: "Maior margem",
  },
  {
    id: "transporte",
    title: "Transporte ida e volta",
    description: "Van credenciada Caldas Novas · menos stress no dia da visita.",
    badge: "Conveniência",
  },
  {
    id: "combo-hospedagem",
    title: "Combo hospedagem + ingressos",
    description: "Economize fechando quarto e parque no mesmo pacote.",
    badge: "ECONOMIZE",
  },
]