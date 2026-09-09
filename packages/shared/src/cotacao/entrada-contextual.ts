export type EntradaOrigem = 'deeplink' | 'rascunho' | 'frio';
export type EntradaVariant = 'contextual' | 'frio';

export interface EntradaContextualParams {
  hotel: string | null;
  /** Listing unit id for deep-link preselection (optional). */
  acomodacaoId: number | null;
  checkin: string | null;
  checkout: string | null;
  adults: number | null;
  children: number | null;
  apenasHotel: boolean;
  ref: string | null;
  canal: string | null;
}

export interface EntradaContextual extends EntradaContextualParams {
  origem: EntradaOrigem;
  variant: EntradaVariant;
}

export interface WizardEntradaState {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  hotelId: number | string | null;
  /** Optional — present on full WizardState when deep-linking a unit. */
  selectedAcomodacaoId?: number | null;
  hotelOnlyFlow: boolean;
  ref?: string | null;
  canal?: string | null;
  profile: 'familia' | 'casal' | 'aventura';
}

export const WIZARD_TOTAL_STEPS = 8;

function readParam(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  if (params instanceof URLSearchParams) {
    const v = params.get(key);
    return v?.trim() ? v.trim() : null;
  }
  const raw = params[key];
  if (Array.isArray(raw)) return raw[0]?.trim() || null;
  return raw?.trim() || null;
}

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseIsoDate(value: string | null): string | null {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export function inferProfileFromGuests(adults: number, children: number): WizardEntradaState['profile'] {
  if (children >= 2) return 'familia';
  if (children === 1) return 'familia';
  if (adults === 2 && children === 0) return 'casal';
  if (adults >= 3) return 'familia';
  return 'aventura';
}

export function lerEntradaContextual(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): EntradaContextualParams {
  const hotel =
    readParam(searchParams, 'hotel') ?? readParam(searchParams, 'hotelId');
  const acomodacaoId =
    parsePositiveInt(readParam(searchParams, 'acomodacaoId')) ??
    parsePositiveInt(readParam(searchParams, 'selectedAcomodacaoId'));
  const checkin =
    parseIsoDate(readParam(searchParams, 'checkin')) ??
    parseIsoDate(readParam(searchParams, 'checkIn'));
  const checkout =
    parseIsoDate(readParam(searchParams, 'checkout')) ??
    parseIsoDate(readParam(searchParams, 'checkOut'));
  const adults = parsePositiveInt(readParam(searchParams, 'adults'));
  const children = parsePositiveInt(readParam(searchParams, 'children'));
  const apenasHotelRaw = readParam(searchParams, 'apenasHotel');
  const apenasHotel = apenasHotelRaw === '1' || apenasHotelRaw === 'true';
  const ref = readParam(searchParams, 'ref');
  const canal = readParam(searchParams, 'canal');

  return {
    hotel,
    acomodacaoId,
    checkin,
    checkout,
    adults,
    children,
    apenasHotel,
    ref,
    canal,
  };
}

export function temParamsContextuais(params: EntradaContextualParams): boolean {
  return Boolean(
    params.hotel ||
      params.acomodacaoId != null ||
      params.checkin ||
      params.checkout ||
      params.adults != null ||
      params.children != null ||
      params.apenasHotel ||
      params.ref ||
      params.canal,
  );
}

export function resolverOrigemEntrada(
  params: EntradaContextualParams,
  hasDraft: boolean,
): EntradaOrigem {
  if (temParamsContextuais(params)) return 'deeplink';
  if (hasDraft) return 'rascunho';
  return 'frio';
}

export function montarEntradaContextual(
  params: EntradaContextualParams,
  origem: EntradaOrigem,
): EntradaContextual {
  return {
    ...params,
    origem,
    variant: origem === 'deeplink' ? 'contextual' : 'frio',
  };
}

export function hidratarWizardState<T extends WizardEntradaState>(
  base: T,
  ctx: EntradaContextual,
  draft?: Partial<T> | null,
): { state: T; hotelTravado: boolean } {
  const state: T = { ...base };

  if (ctx.origem === 'deeplink') {
    if (ctx.checkin) state.checkIn = ctx.checkin;
    if (ctx.checkout) state.checkOut = ctx.checkout;
    if (ctx.adults != null) state.adults = Math.max(1, ctx.adults);
    if (ctx.children != null) state.children = Math.max(0, ctx.children);
    if (ctx.hotel) state.hotelId = ctx.hotel;
    if (ctx.acomodacaoId != null && ctx.acomodacaoId > 0) {
      state.selectedAcomodacaoId = ctx.acomodacaoId;
    }
    if (ctx.apenasHotel) state.hotelOnlyFlow = true;
    if (ctx.ref) state.ref = ctx.ref;
    if (ctx.canal) state.canal = ctx.canal;
  } else if (draft) {
    Object.assign(state, draft);
  }

  state.profile = inferProfileFromGuests(state.adults, state.children);
  const hotelTravado = ctx.origem === 'deeplink' && Boolean(ctx.hotel);
  return { state, hotelTravado };
}

export function calcularPassosColapsados(
  ctx: EntradaContextual,
  state: Pick<WizardEntradaState, 'checkIn' | 'checkOut' | 'hotelId' | 'hotelOnlyFlow'>,
  hotelTravado: boolean,
): number[] {
  const colapsados: number[] = [];
  const hasDatas = Boolean(state.checkIn && state.checkOut);

  if (hasDatas && ctx.origem === 'deeplink') {
    colapsados.push(0);
  }
  if (hotelTravado && state.hotelId != null) {
    colapsados.push(1);
  }
  if (state.hotelOnlyFlow || ctx.apenasHotel) {
    colapsados.push(2, 3);
  }

  return [...new Set(colapsados)].sort((a, b) => a - b);
}

export function passoInicialContextual(colapsados: number[]): number {
  for (let i = 0; i < WIZARD_TOTAL_STEPS; i++) {
    if (!colapsados.includes(i)) return i;
  }
  return 0;
}

export function passosVisiveis(colapsados: number[]): number[] {
  return Array.from({ length: WIZARD_TOTAL_STEPS }, (_, i) => i).filter((s) => !colapsados.includes(s));
}

export function ajustarPassoNavegacao(
  step: number,
  colapsados: number[],
  delta: 1 | -1,
): number {
  let next = step + delta;
  while (next >= 0 && next < WIZARD_TOTAL_STEPS) {
    if (!colapsados.includes(next)) return next;
    next += delta;
  }
  return step;
}

export function montarUrlCotacaoContextual(
  siteUrl: string,
  input: {
    hotel: string | number;
    acomodacaoId?: number | null;
    ref?: string | number | null;
    canal?: string | null;
    checkin?: string | null;
    checkout?: string | null;
    adults?: number | null;
    children?: number | null;
    apenasHotel?: boolean;
  },
): string {
  const params = new URLSearchParams();
  params.set('hotel', String(input.hotel));
  if (input.acomodacaoId != null && Number(input.acomodacaoId) > 0) {
    params.set('acomodacaoId', String(input.acomodacaoId));
  }
  if (input.checkin) params.set('checkin', input.checkin);
  if (input.checkout) params.set('checkout', input.checkout);
  if (input.adults != null) params.set('adults', String(input.adults));
  if (input.children != null) params.set('children', String(input.children));
  if (input.apenasHotel) params.set('apenasHotel', '1');
  if (input.ref != null && input.ref !== '') params.set('ref', String(input.ref));
  if (input.canal) params.set('canal', input.canal);
  const base = siteUrl.replace(/\/$/, '');
  const path = `/cotacao?${params.toString()}`;
  return base ? `${base}${path}` : path;
}
