import {
  mapRoteiroParaDailySchedule,
  montarRoteiroInteligente,
  sumUpgradeVaranda,
} from '@rsv360/shared';
import { listRoteiroAtracoes } from './roteiro-atracoes.service';

export function isRoteiroInteligenteEnabled(): boolean {
  return process.env.ROTEIRO_INTELIGENTE_ENABLED === 'true';
}

export type RoteiroMood = 'relaxamento' | 'diversao' | 'natureza' | 'gastronomia';

export interface DailyScheduleItem {
  id?: string;
  day: number;
  title: string;
  description: string;
  image?: string;
  videoUrl?: string;
  actionLabel?: string;
  type?: string;
  mood?: RoteiroMood;
  behaviorTag?: string;
}

export interface CatalogItemPayload {
  id: string | number;
  title: string;
  price: number;
  images?: string[];
  metadata?: Record<string, unknown>;
  location?: string;
}

export interface WizardPayloadItem {
  id?: string | number;
  title: string;
  price: number;
  type: string;
  quantity?: number;
}

/** Snapshot imutável gravado na proposta (auditoria PR+1). */
export interface PropostaAcomodacaoSnapshot {
  arquetipoId?: string;
  codigoExterno?: string;
  upgradeVaranda: boolean;
  upgradeVarandaValorResolvido: number;
}

export interface GerarPropostaPayload {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  hotelId?: string | number | null;
  ticketIds?: (string | number)[];
  attractionIds?: (string | number)[];
  breakfastId?: string | null;
  accommodationMode?: string;
  accommodationKitId?: string | null;
  accommodationItemIds?: string[];
  name: string;
  email?: string;
  phone: string;
  notes?: string;
  paymentMethod?: string;
  profile?: string;
  total?: number;
  /** Legado — mapeado para upgradeVaranda no server (não somar). */
  suiteUpgrade?: boolean;
  travelInsurance?: boolean;
  hotelOnlyFlow?: boolean;
  selectedAcomodacaoId?: number | null;
  /** Desconto proposto por parceiro (CRM) — validado server-side pelo teto. */
  descontoParceiroPercentual?: number;
  /** Role efetiva para teto (corretor|agente|promotor). */
  descontoParceiroRole?: string;
  /** Intenção client: upgrade varanda (sem valor monetário). */
  upgradeVaranda?: boolean;
  arquetipoId?: string;
  codigoExterno?: string;
  wizardAddonIds?: number[];
  catalog?: {
    hotels?: CatalogItemPayload[];
    tickets?: CatalogItemPayload[];
    attractions?: CatalogItemPayload[];
  };
  /** Preenchido server-side antes de buildOrcamentoItens (snapshot auditoria). */
  acomodacaoSnapshot?: PropostaAcomodacaoSnapshot;
}

const FALLBACK_IMAGES = {
  hotel: 'https://images.unsplash.com/photo-1571508601633-63bfea190214?w=600&h=400&fit=crop',
  ticket: 'https://images.unsplash.com/photo-1549887534-f2cb8ff16145?w=600&h=400&fit=crop',
  attraction: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop',
  free: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop',
};

function countNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
}

function getImage(item: CatalogItemPayload | undefined, fallback: string): string | undefined {
  if (!item) return fallback;
  const metaImages = item.metadata?.images;
  if (Array.isArray(metaImages) && metaImages.length) return String(metaImages[0]);
  if (item.images?.length) return item.images[0];
  return fallback;
}

function getVideoUrl(item: CatalogItemPayload | undefined): string | undefined {
  const url = item?.metadata?.videoUrl;
  return typeof url === 'string' && url.length ? url : undefined;
}

function moodForType(type: string): RoteiroMood {
  if (type === 'hotel' || type === 'free') return 'relaxamento';
  if (type === 'ticket') return 'diversao';
  if (type === 'attraction') return 'natureza';
  return 'relaxamento';
}

function moodLabel(mood: RoteiroMood): string {
  const map: Record<RoteiroMood, string> = {
    relaxamento: 'Relaxamento',
    diversao: 'Diversão',
    natureza: 'Natureza',
    gastronomia: 'Gastronomia',
  };
  return map[mood];
}

function buildItem(
  day: number,
  item: CatalogItemPayload | undefined,
  opts: {
    title: string;
    description: string;
    actionLabel: string;
    type: string;
    profile?: string;
    fallback: string;
  },
): DailyScheduleItem {
  const mood = moodForType(opts.type);
  const tags = item?.metadata?.behaviorTags;
  const profile = opts.profile ?? 'casal';
  let behaviorTag = moodLabel(mood);
  if (Array.isArray(tags) && tags.includes(profile)) {
    behaviorTag = profile === 'familia' ? 'Ideal para famílias' : 'Perfeito para casais';
  }
  const premium = item?.metadata?.premiumLabel;
  if (premium && profile === 'casal') behaviorTag = String(premium);

  return {
    id: `${day}-${opts.type}-${item?.id ?? 'default'}`,
    day,
    title: opts.title,
    description: opts.description,
    image: getImage(item, opts.fallback),
    videoUrl: getVideoUrl(item),
    actionLabel: opts.actionLabel,
    type: opts.type,
    mood,
    behaviorTag,
  };
}

export function montarDailyScheduleLegado(payload: GerarPropostaPayload): DailyScheduleItem[] {
  const nights = countNights(payload.checkIn, payload.checkOut);
  const schedule: DailyScheduleItem[] = [];
  const catalog = payload.catalog ?? {};
  const profile = payload.profile ?? 'casal';
  const hotel = catalog.hotels?.find(
    (h) => h.id === payload.hotelId || String(h.id) === String(payload.hotelId),
  );
  const tickets = (catalog.tickets ?? []).filter((t) =>
    (payload.ticketIds ?? []).some((id) => id === t.id || String(id) === String(t.id)),
  );
  const attractions = (catalog.attractions ?? []).filter((a) =>
    (payload.attractionIds ?? []).some((id) => id === a.id || String(id) === String(a.id)),
  );

  for (let day = 1; day <= nights; day++) {
    if (day === 1 && hotel) {
      schedule.push(
        buildItem(day, hotel, {
          title: `Chegada & Relaxamento — ${hotel.title}`,
          description: 'Check-in e noite livre nas águas termais',
          actionLabel: 'Ver hotel',
          type: 'hotel',
          profile,
          fallback: FALLBACK_IMAGES.hotel,
        }),
      );
    } else if (tickets.length > 0) {
      const ticket = tickets[(day - 2) % tickets.length];
      schedule.push(
        buildItem(day, ticket, {
          title: `Diversão Aquática — ${ticket.title}`,
          description: 'Acesso imediato ao parque',
          actionLabel: 'Explorar atrações',
          type: 'ticket',
          profile,
          fallback: FALLBACK_IMAGES.ticket,
        }),
      );
    } else if (attractions.length > 0) {
      const attr = attractions[(day - 2) % attractions.length];
      schedule.push(
        buildItem(day, attr, {
          title: attr.title,
          description: 'Natureza e trilhas',
          actionLabel: 'Ver detalhes',
          type: 'attraction',
          profile,
          fallback: FALLBACK_IMAGES.attraction,
        }),
      );
    } else {
      schedule.push(
        buildItem(day, undefined, {
          title: `Dia ${day} — Caldas Novas`,
          description: 'Tempo livre para relaxar',
          actionLabel: 'Ver sugestões',
          type: 'free',
          profile,
          fallback: FALLBACK_IMAGES.free,
        }),
      );
    }
  }

  if (attractions.length && schedule.length <= nights) {
    const attr = attractions[0];
    schedule.push(
      buildItem(schedule.length + 1, attr, {
        title: attr.title,
        description: 'Natureza e trilhas',
        actionLabel: 'Ver detalhes',
        type: 'attraction',
        profile,
        fallback: FALLBACK_IMAGES.attraction,
      }),
    );
  }

  return schedule;
}

function resolveAmenidadesHotel(payload: GerarPropostaPayload): string[] {
  const hotel = payload.catalog?.hotels?.find(
    (h) => h.id === payload.hotelId || String(h.id) === String(payload.hotelId),
  );
  const raw = hotel?.metadata?.amenidades ?? hotel?.metadata?.amenities;
  if (Array.isArray(raw)) return raw.map(String);
  return [];
}

function ticketIncluiParque(payload: GerarPropostaPayload): boolean {
  const tickets = payload.catalog?.tickets ?? [];
  const ids = payload.ticketIds ?? [];
  return tickets
    .filter((t) => ids.some((id) => id === t.id || String(id) === String(t.id)))
    .some((t) => /parque|aqu[aá]tico|hot park|acqua/i.test(t.title));
}

export async function montarDailyScheduleInteligente(
  payload: GerarPropostaPayload,
): Promise<DailyScheduleItem[]> {
  const atracoes = await listRoteiroAtracoes();
  const perfil = (payload.profile as 'casal' | 'familia') ?? 'casal';
  const roteiro = montarRoteiroInteligente({
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    perfil,
    amenidadesHotel: resolveAmenidadesHotel(payload),
    catalogoAtracoes: atracoes,
    incluirParqueAquatico: perfil === 'familia' && ticketIncluiParque(payload),
  });

  return mapRoteiroParaDailySchedule(roteiro, atracoes, perfil).map((item) => ({
    id: item.id,
    day: item.day,
    title: item.title,
    description: item.description,
    image: item.image,
    actionLabel: item.actionLabel,
    type: item.type,
    mood: item.mood,
    behaviorTag: item.behaviorTag,
  }));
}

export function montarDailySchedule(payload: GerarPropostaPayload): DailyScheduleItem[] {
  if (!isRoteiroInteligenteEnabled()) {
    return montarDailyScheduleLegado(payload);
  }
  throw new Error(
    'montarDailySchedule com ROTEIRO_INTELIGENTE_ENABLED=true requer montarDailyScheduleAsync',
  );
}

export async function montarDailyScheduleAsync(
  payload: GerarPropostaPayload,
): Promise<DailyScheduleItem[]> {
  if (isRoteiroInteligenteEnabled()) {
    return montarDailyScheduleInteligente(payload);
  }
  return montarDailyScheduleLegado(payload);
}

export function buildOrcamentoItens(payload: GerarPropostaPayload): Array<{
  nome: string;
  categoria: string;
  quantidade: number;
  precoUnitario: string;
  precoTotal: string;
  ordem: number;
}> {
  const nights = countNights(payload.checkIn, payload.checkOut);
  const guests = payload.adults + payload.children;
  const items: Array<{
    nome: string;
    categoria: string;
    quantidade: number;
    precoUnitario: string;
    precoTotal: string;
    ordem: number;
  }> = [];
  let ordem = 0;
  const catalog = payload.catalog ?? {};

  const hotel = catalog.hotels?.find(
    (h) => h.id === payload.hotelId || String(h.id) === String(payload.hotelId),
  );
  if (hotel) {
    items.push({
      nome: hotel.title,
      categoria: 'hotel',
      quantidade: nights,
      precoUnitario: String(hotel.price),
      precoTotal: String(hotel.price * nights),
      ordem: ordem++,
    });
  }

  for (const ticketId of payload.ticketIds ?? []) {
    const ticket = catalog.tickets?.find(
      (t) => t.id === ticketId || String(t.id) === String(ticketId),
    );
    if (ticket) {
      items.push({
        nome: ticket.title,
        categoria: 'ticket',
        quantidade: guests,
        precoUnitario: String(ticket.price),
        precoTotal: String(ticket.price * guests),
        ordem: ordem++,
      });
    }
  }

  for (const attrId of payload.attractionIds ?? []) {
    const attr = catalog.attractions?.find(
      (a) => a.id === attrId || String(a.id) === String(attrId),
    );
    if (attr) {
      items.push({
        nome: attr.title,
        categoria: 'attraction',
        quantidade: guests,
        precoUnitario: String(attr.price),
        precoTotal: String(attr.price * guests),
        ordem: ordem++,
      });
    }
  }

  if (payload.breakfastId) {
    const prices: Record<string, number> = { continental: 25, executivo: 45, completo: 65 };
    const price = prices[payload.breakfastId] ?? 25;
    items.push({
      nome: `Café da manhã — ${payload.breakfastId}`,
      categoria: 'breakfast',
      quantidade: guests * nights,
      precoUnitario: String(price),
      precoTotal: String(price * guests * nights),
      ordem: ordem++,
    });
  }

  if (payload.accommodationMode === 'kit' && payload.accommodationKitId) {
    const kitPrices: Record<string, number> = { 'kit-casal': 70, 'kit-familia': 120, 'kit-individual': 40 };
    const price = kitPrices[payload.accommodationKitId] ?? 70;
    items.push({
      nome: `Kit acomodação — ${payload.accommodationKitId}`,
      categoria: 'accommodation',
      quantidade: 1,
      precoUnitario: String(price),
      precoTotal: String(price),
      ordem: ordem++,
    });
  }

  if (payload.accommodationMode === 'items' && (payload.accommodationItemIds?.length ?? 0) > 0) {
    const itemPrices: Record<string, number> = {
      lencol: 10,
      fronha: 5,
      toalha: 8,
      cobertor: 15,
      travesseiro: 12,
    };
    const itemLabels: Record<string, string> = {
      lencol: 'Lençol',
      fronha: 'Fronha',
      toalha: 'Toalha de banho',
      cobertor: 'Cobertor',
      travesseiro: 'Travesseiro extra',
    };
    for (const itemId of payload.accommodationItemIds ?? []) {
      const price = itemPrices[itemId] ?? 0;
      items.push({
        nome: itemLabels[itemId] ?? `Item acomodação — ${itemId}`,
        categoria: 'accommodation',
        quantidade: 1,
        precoUnitario: String(price),
        precoTotal: String(price),
        ordem: ordem++,
      });
    }
  }

  const snapshot = payload.acomodacaoSnapshot;
  if (snapshot?.upgradeVaranda && snapshot.upgradeVarandaValorResolvido > 0) {
    const upgradeTotal = sumUpgradeVaranda(
      true,
      snapshot.upgradeVarandaValorResolvido,
      nights,
    );
    items.push({
      nome: 'Upgrade varanda/vista',
      categoria: 'hotel',
      quantidade: nights,
      precoUnitario: String(snapshot.upgradeVarandaValorResolvido),
      precoTotal: String(upgradeTotal),
      ordem: ordem++,
    });
  }

  if (payload.travelInsurance) {
    items.push({
      nome: 'Seguro Assistência Local',
      categoria: 'insurance',
      quantidade: guests,
      precoUnitario: '15',
      precoTotal: String(15 * guests),
      ordem: ordem++,
    });
  }

  return items;
}
