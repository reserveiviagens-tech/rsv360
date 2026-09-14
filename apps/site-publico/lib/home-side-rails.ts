export interface SideRailItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
  image?: string;
  imageAlt?: string;
  highlight?: boolean;
  expiresAt?: string;
}

export interface SideRailSection {
  title: string;
  description: string;
  items: SideRailItem[];
}

export interface HomeSideRailsData {
  left: SideRailSection;
  right: SideRailSection;
}

const fallbackData: HomeSideRailsData = {
  left: {
    title: "Descubra experiencias",
    description: "Produtos para temporada e lazer",
    items: [
      {
        id: "season-rentals",
        title: "Aluguel por temporada",
        subtitle: "Casas e flats para familia e grupos",
        href: "/marketplace",
        badge: "Temporada",
        image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=160&fit=crop",
        imageAlt: "Casa para temporada",
      },
      {
        id: "hotels",
        title: "Reservas de hoteis",
        subtitle: "Hospedagem com melhor custo-beneficio",
        href: "/hoteis",
        badge: "Hotelaria",
        image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=160&fit=crop",
        imageAlt: "Hotel",
      },
      {
        id: "water-parks",
        title: "Parques aquaticos",
        subtitle: "Ingressos e combos para todo o dia",
        href: "/ingressos",
        badge: "Parques",
        image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=400&h=160&fit=crop",
        imageAlt: "Parque aquatico",
      },
      {
        id: "attractions",
        title: "Atracoes e passeios",
        subtitle: "Experiencias para todas as idades",
        href: "/atracoes",
        badge: "Atracoes",
        image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=160&fit=crop",
        imageAlt: "Atracoes e passeios",
      },
      {
        id: "auctions",
        title: "Leiloes de viagem",
        subtitle: "Ofertas com lances e economia real",
        href: "/leiloes",
        badge: "Leiloes",
        image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=160&fit=crop",
        imageAlt: "Leiloes de viagem",
      },
    ],
  },
  right: {
    title: "Oportunidades do dia",
    description: "Urgencia e alto potencial de economia",
    items: [
      {
        id: "flash-deals",
        title: "Flash Deals",
        subtitle: "Precos especiais com tempo limitado",
        href: "/flash-deals",
        badge: "Flash",
        image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=160&fit=crop",
        imageAlt: "Flash Deals",
      },
      {
        id: "group-travel",
        title: "Viagens em grupo",
        subtitle: "Pacotes para amigos, familia e equipes",
        href: "/viagens-grupo",
        badge: "Grupo",
        image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=160&fit=crop",
        imageAlt: "Viagens em grupo",
      },
      {
        id: "excursions",
        title: "Excursoes",
        subtitle: "Roteiros prontos com suporte completo",
        href: "/group-travel",
        badge: "Excursao",
        image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=160&fit=crop",
        imageAlt: "Excursoes",
      },
      {
        id: "weekly-offer",
        title: "Oferta da semana",
        subtitle: "Selecionados com alta procura agora",
        href: "/promocoes",
        badge: "Destaque",
        highlight: true,
        image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=160&fit=crop",
        imageAlt: "Oferta da semana",
      },
    ],
  },
};

function toCountLabel(value: unknown): string | null {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return null;
  return `${count} opcoes ativas`;
}

async function safeGetTotal(url: string): Promise<number | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json();
    const fromPagination = payload?.pagination?.total;
    if (typeof fromPagination === "number") return fromPagination;
    if (Array.isArray(payload?.data)) return payload.data.length;
    return null;
  } catch {
    return null;
  }
}

import { isMarketingLabMode, isTheaterUiPath } from '@/lib/app-mode';

function filterTheaterItems(data: HomeSideRailsData): HomeSideRailsData {
  if (isMarketingLabMode()) return data;
  const filterSection = (section: SideRailSection): SideRailSection => ({
    ...section,
    items: section.items.filter((item) => !isTheaterUiPath(item.href)),
  });
  return {
    left: filterSection(data.left),
    right: filterSection(data.right),
  };
}

export function getHomeSideRailsFallback(): HomeSideRailsData {
  return filterTheaterItems(structuredClone(fallbackData));
}

function getBaseUrl(): string {
  if (typeof window !== "undefined") return "";
  return process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
}

/** Garante que os itens tenham image, imageAlt e highlight do fallback quando a API não retorna */
function enrichWithFallbackImages(data: HomeSideRailsData): HomeSideRailsData {
  const fallback = getHomeSideRailsFallback();
  const enrichSection = (section: SideRailSection, fallbackSection: SideRailSection) => ({
    ...section,
    items: section.items.map((item) => {
      const fb = fallbackSection.items.find((f) => f.id === item.id);
      return {
        ...item,
        image: item.image ?? fb?.image,
        imageAlt: item.imageAlt ?? fb?.imageAlt,
        highlight: item.highlight ?? fb?.highlight,
      };
    }),
  });
  return {
    left: enrichSection(data.left, fallback.left),
    right: enrichSection(data.right, fallback.right),
  };
}

export async function getHomeSideRailsData(): Promise<HomeSideRailsData> {
  let data: HomeSideRailsData;

  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/website/side-rails`, { cache: "no-store" });
    if (response.ok) {
      const result = await response.json();
      if (result?.success && result?.data) {
        data = enrichWithFallbackImages(result.data as HomeSideRailsData);
      } else {
        data = getHomeSideRailsFallback();
      }
    } else {
      data = getHomeSideRailsFallback();
    }
  } catch {
    data = getHomeSideRailsFallback();
  }

  const [hotelsTotal, ticketsTotal, attractionsTotal, promotionsTotal] = await Promise.all([
    safeGetTotal("/api/website/content/hotels?limit=1&status=active"),
    safeGetTotal("/api/website/content/tickets?limit=1&status=active"),
    safeGetTotal("/api/website/content/attractions?limit=1&status=active"),
    safeGetTotal("/api/website/content/promotions?limit=1&status=active"),
  ]);

  const hotelsLabel = toCountLabel(hotelsTotal);
  const ticketsLabel = toCountLabel(ticketsTotal);
  const attractionsLabel = toCountLabel(attractionsTotal);
  const promotionsLabel = toCountLabel(promotionsTotal);

  if (hotelsLabel) {
    const item = data.left.items.find((current) => current.id === "hotels");
    if (item) item.subtitle = hotelsLabel;
  }

  if (ticketsLabel) {
    const item = data.left.items.find((current) => current.id === "water-parks");
    if (item) item.subtitle = ticketsLabel;
  }

  if (attractionsLabel) {
    const item = data.left.items.find((current) => current.id === "attractions");
    if (item) item.subtitle = attractionsLabel;
  }

  if (promotionsLabel) {
    const item = data.right.items.find((current) => current.id === "flash-deals");
    if (item) item.subtitle = promotionsLabel;
  }

  return data;
}
