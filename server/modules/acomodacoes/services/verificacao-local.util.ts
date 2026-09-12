/**
 * Host listing location verification — sanitize, web GPS, staff decision helpers.
 */

export type VerificacaoLocalStatus = 'pendente' | 'enviado' | 'aprovado' | 'rejeitado';
export type VerificacaoLocalMetodo = 'app' | 'terceiro' | 'videos' | 'web_gps';

export const WEB_GPS_MAX_DISTANCE_M = 500;

const HOST_WRITABLE_STATUS = new Set<VerificacaoLocalStatus>(['pendente', 'enviado']);
const METODO_SET = new Set<string>(['app', 'terceiro', 'videos', 'web_gps']);

export type VerificacaoLocalGeo = {
  lat: number;
  lng: number;
  accuracy?: number;
  capturedAt: string;
};

export type SanitizeVerificacaoOk = { ok: true; value: Record<string, unknown> };
export type SanitizeVerificacaoErr = {
  ok: false;
  error: 'verificacao_local_invalida';
  message: string;
};

export function asVerificacaoLocalRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

/** Great-circle distance in meters (WGS84 sphere approximation). */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function normalizeCoord(raw: unknown, min: number, max: number): number | null {
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && raw.trim()
        ? Number(raw)
        : Number.NaN;
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 1e6) / 1e6;
}

export function validateVerificacaoLocalGeoPayload(
  raw: unknown,
): { ok: true; value: VerificacaoLocalGeo } | { ok: false; message: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, message: 'Evidência GPS inválida' };
  }
  const src = raw as Record<string, unknown>;
  const lat = normalizeCoord(src.lat, -90, 90);
  const lng = normalizeCoord(src.lng, -180, 180);
  if (lat == null || lng == null) {
    return { ok: false, message: 'Latitude/longitude GPS inválidas' };
  }
  const capturedAt =
    typeof src.capturedAt === 'string' && src.capturedAt.trim()
      ? src.capturedAt.trim().slice(0, 40)
      : '';
  if (!capturedAt) {
    return { ok: false, message: 'Timestamp GPS obrigatório' };
  }
  const value: VerificacaoLocalGeo = { lat, lng, capturedAt };
  if (src.accuracy != null && src.accuracy !== '') {
    const accuracy = normalizeCoord(src.accuracy, 0, 100000);
    if (accuracy == null) {
      return { ok: false, message: 'Precisão GPS inválida' };
    }
    value.accuracy = accuracy;
  }
  return { ok: true, value };
}

export function readListingReferenceCoords(
  metadata: unknown,
): { lat: number; lng: number } | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const loc = (metadata as Record<string, unknown>).localizacao;
  if (!loc || typeof loc !== 'object' || Array.isArray(loc)) return null;
  const lat = normalizeCoord((loc as Record<string, unknown>).lat, -90, 90);
  const lng = normalizeCoord((loc as Record<string, unknown>).lng, -180, 180);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

export function validateWebGpsDistance(
  listingCoords: { lat?: number; lng?: number } | null | undefined,
  geo: { lat: number; lng: number },
  maxDistanceM: number = WEB_GPS_MAX_DISTANCE_M,
): { ok: true; distanceM: number } | { ok: false; message: string } {
  const refLat = listingCoords?.lat;
  const refLng = listingCoords?.lng;
  if (
    refLat == null ||
    refLng == null ||
    !Number.isFinite(refLat) ||
    !Number.isFinite(refLng)
  ) {
    return {
      ok: false,
      message:
        'Defina latitude e longitude na seção Localização antes de verificar por GPS no navegador.',
    };
  }
  const distanceM = Math.round(haversineMeters(refLat, refLng, geo.lat, geo.lng));
  if (distanceM > maxDistanceM) {
    return {
      ok: false,
      message: `A localização capturada está a mais de ${maxDistanceM} m do endereço do anúncio.`,
    };
  }
  return { ok: true, distanceM };
}

/**
 * Host PATCH may not self-approve. Invalid statuses are forced to `enviado`.
 * web_gps + enviado requires evidenciaGeo within WEB_GPS_MAX_DISTANCE_M of listing pin.
 */
export function sanitizeVerificacaoLocalHostPatch(
  existingMetadata: Record<string, unknown>,
  patchValue: unknown,
): SanitizeVerificacaoOk | SanitizeVerificacaoErr {
  const prev = asVerificacaoLocalRecord(existingMetadata.verificacaoLocal);
  const incoming = asVerificacaoLocalRecord(patchValue);
  const requested = String(incoming.status ?? prev.status ?? 'pendente') as VerificacaoLocalStatus;
  const status: VerificacaoLocalStatus = HOST_WRITABLE_STATUS.has(requested)
    ? requested
    : 'enviado';

  let metodo = incoming.metodo ?? prev.metodo;
  if (metodo != null && typeof metodo === 'string' && !METODO_SET.has(metodo)) {
    metodo = prev.metodo ?? 'videos';
  }

  const next: Record<string, unknown> = {
    ...prev,
    ...incoming,
    status,
    ...(metodo != null ? { metodo } : {}),
  };

  if (status === 'enviado') {
    delete next.revisadoEm;
    delete next.motivoRejeicao;
  } else if (prev.revisadoEm != null && next.revisadoEm == null) {
    next.revisadoEm = prev.revisadoEm;
  }

  if (metodo === 'web_gps' && status === 'enviado') {
    const geoParsed = validateVerificacaoLocalGeoPayload(next.evidenciaGeo);
    if (!geoParsed.ok) {
      return {
        ok: false,
        error: 'verificacao_local_invalida',
        message: geoParsed.message,
      };
    }
    const loc = readListingReferenceCoords(existingMetadata);
    if (!loc) {
      return {
        ok: false,
        error: 'verificacao_local_invalida',
        message:
          'Defina latitude e longitude na seção Localização antes de verificar por GPS no navegador.',
      };
    }
    const dist = validateWebGpsDistance(loc, geoParsed.value);
    if (!dist.ok) {
      return {
        ok: false,
        error: 'verificacao_local_invalida',
        message: dist.message,
      };
    }
    next.evidenciaGeo = geoParsed.value;
    next.distanciaMetros = dist.distanceM;
  }

  return { ok: true, value: next };
}

export function applyStaffVerificacaoLocalDecision(
  existingMetadata: Record<string, unknown>,
  action: 'aprovar' | 'rejeitar',
  motivo?: string,
): Record<string, unknown> {
  const prev = asVerificacaoLocalRecord(existingMetadata.verificacaoLocal);
  const now = new Date().toISOString();
  return {
    ...existingMetadata,
    verificacaoLocal: {
      ...prev,
      status: action === 'aprovar' ? 'aprovado' : 'rejeitado',
      revisadoEm: now,
      ...(action === 'rejeitar'
        ? { motivoRejeicao: typeof motivo === 'string' ? motivo.slice(0, 500) : null }
        : { motivoRejeicao: null }),
    },
  };
}
