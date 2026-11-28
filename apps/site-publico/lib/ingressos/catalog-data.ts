export interface IngressosTicket {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  image: string
  features: string[]
  location: string
  duration: string
  ageGroup: string
  discount?: number
  popular?: boolean
}

export const INGRESSOS_TICKETS: IngressosTicket[] = [
  {
    id: "hot-park",
    name: "Ingresso Hot Park",
    description:
      "Aventura e relaxamento no maior parque de águas quentes da América do Sul! Toboáguas emocionantes e piscinas termais naturais.",
    price: 189,
    originalPrice: 220,
    discount: 14,
    image: "/images/lagoa-termas-parque.jpeg",
    features: ["Toboáguas radicais", "Piscinas termais", "Rio lento", "Área infantil", "Restaurantes"],
    location: "Rio Quente - GO",
    duration: "Dia inteiro",
    ageGroup: "Todas as idades",
    popular: true,
  },
  {
    id: "diroma-acqua-park",
    name: "Ingresso diRoma Acqua Park",
    description: "Diversão aquática para todas as idades com toboáguas emocionantes e piscinas de ondas incríveis.",
    price: 90,
    originalPrice: 110,
    discount: 18,
    image: "/images/diroma-acqua-park.jpeg",
    features: ["Toboáguas variados", "Piscina de ondas", "Área kids", "Bar molhado", "Espreguiçadeiras"],
    location: "Caldas Novas - GO",
    duration: "Dia inteiro",
    ageGroup: "Todas as idades",
  },
  {
    id: "lagoa-termas",
    name: "Ingresso Lagoa Termas Parque",
    description: "Relaxe nas águas termais da Lagoa Quente e aproveite a natureza exuberante em um ambiente único.",
    price: 75,
    originalPrice: 95,
    discount: 21,
    image: "/images/hot-park.jpeg",
    features: ["Águas termais naturais", "Trilhas ecológicas", "Área de descanso", "Lanchonete", "Estacionamento"],
    location: "Caldas Novas - GO",
    duration: "Meio dia",
    ageGroup: "Todas as idades",
  },
  {
    id: "water-park",
    name: "Ingresso Water Park",
    description: "Parque aquático moderno com as mais novas atrações e tecnologia de ponta para diversão garantida.",
    price: 120,
    originalPrice: 150,
    discount: 20,
    image: "/images/water-park.jpeg",
    features: ["Toboáguas modernos", "Piscina com ondas", "Tirolesa aquática", "Área gourmet", "Wi-Fi gratuito"],
    location: "Caldas Novas - GO",
    duration: "Dia inteiro",
    ageGroup: "Todas as idades",
  },
  {
    id: "kawana-park",
    name: "Ingresso Kawana Park",
    description:
      "Parque aquático familiar com piscinas termais naturais, toboáguas emocionantes e área de lazer completa. Diversão garantida em águas quentinhas!",
    price: 85,
    originalPrice: 110,
    discount: 23,
    image: "/images/kawana-park.jpeg",
    features: [
      "Piscinas termais naturais",
      "Toboáguas familiares",
      "Área infantil aquática",
      "Bar e restaurante",
      "Deck para relaxamento",
    ],
    location: "Caldas Novas - GO",
    duration: "Dia inteiro",
    ageGroup: "Todas as idades",
  },
]

export function formatIngressosPrice(price: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price)
}