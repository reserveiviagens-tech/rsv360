/**
 * Normalize acomodacoes.midia JSON into { capa, fotos, trilhoThumb }.
 * PropertySwitcher reads capa / cover / first foto via resolveUnitThumbUrl.
 */

export type MidiaBag = {
  capa: string | null;
  /** Lightweight rail derivative (WebP), preferred for thumbnails. */
  trilhoThumb: string | null;
  fotos: string[];
};

function asUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!s) return null;
  if (s.startsWith('http') || s.startsWith('/') || s.startsWith('data:')) return s;
  return null;
}

function collectUrls(value: unknown, out: string[]): void {
  if (value == null) return;
  const direct = asUrl(value);
  if (direct) {
    out.push(direct);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUrls(item, out);
    return;
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    for (const key of ['url', 'src', 'href', 'webp', 'thumbnail', 'thumb']) {
      const u = asUrl(o[key]);
      if (u) out.push(u);
    }
    for (const key of ['fotos', 'images', 'photos', 'items', 'galeria']) {
      if (o[key] != null) collectUrls(o[key], out);
    }
  }
}

export function normalizeMidia(raw: unknown): MidiaBag {
  const fotos: string[] = [];
  let capa: string | null = null;
  let trilhoThumb: string | null = null;

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    capa = asUrl(o.capa) || asUrl(o.cover) || asUrl(o.principal) || asUrl(o.fotoPrincipal);
    trilhoThumb = asUrl(o.trilhoThumb) || asUrl(o.trilho_thumb) || asUrl(o.thumb);
    collectUrls(o.fotos ?? o.images ?? o.photos ?? o.galeria ?? o.items, fotos);
    // also gather other string fields that look like urls
    for (const [k, v] of Object.entries(o)) {
      if (['capa', 'cover', 'trilhoThumb', 'trilho_thumb', 'thumb', 'fotos', 'images', 'photos', 'galeria', 'items'].includes(k)) {
        continue;
      }
      collectUrls(v, fotos);
    }
  } else {
    collectUrls(raw, fotos);
  }

  const unique = Array.from(new Set(fotos));
  if (!capa && unique.length > 0) capa = unique[0];
  return { capa, trilhoThumb, fotos: unique };
}

export function midiaWithTrilhoThumb(raw: unknown, trilhoThumbUrl: string, originalUrl?: string | null): MidiaBag & Record<string, unknown> {
  const base = normalizeMidia(raw);
  const fotos = [...base.fotos];
  if (originalUrl && !fotos.includes(originalUrl)) fotos.unshift(originalUrl);
  if (!fotos.includes(trilhoThumbUrl)) {
    /* keep trilho derivative separate from gallery originals */
  }
  return {
    ...base,
    capa: originalUrl || base.capa || trilhoThumbUrl,
    trilhoThumb: trilhoThumbUrl,
    fotos,
  };
}

export function midiaWithCapa(raw: unknown, capaUrl: string): MidiaBag & Record<string, unknown> {
  const base = normalizeMidia(raw);
  const fotos = [...base.fotos];
  if (!fotos.includes(capaUrl)) fotos.unshift(capaUrl);
  return {
    ...base,
    capa: capaUrl,
    trilhoThumb: base.trilhoThumb,
    fotos,
  };
}

export function midiaAddFoto(raw: unknown, fotoUrl: string): MidiaBag & Record<string, unknown> {
  const base = normalizeMidia(raw);
  const fotos = base.fotos.includes(fotoUrl) ? [...base.fotos] : [...base.fotos, fotoUrl];
  return {
    ...base,
    capa: base.capa || fotoUrl,
    trilhoThumb: base.trilhoThumb,
    fotos,
  };
}

export function midiaRemoveFoto(raw: unknown, fotoUrl: string): MidiaBag & Record<string, unknown> {
  const base = normalizeMidia(raw);
  const fotos = base.fotos.filter((u) => u !== fotoUrl);
  const capa = base.capa === fotoUrl ? fotos[0] || null : base.capa;
  const trilhoThumb = base.trilhoThumb === fotoUrl ? null : base.trilhoThumb;
  return { ...base, capa, trilhoThumb, fotos };
}

export function midiaMoveFoto(
  raw: unknown,
  fotoUrl: string,
  direction: 'left' | 'right',
): MidiaBag & Record<string, unknown> {
  const base = normalizeMidia(raw);
  const fotos = [...base.fotos];
  const idx = fotos.indexOf(fotoUrl);
  if (idx < 0) return { ...base };
  const swap = direction === 'left' ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= fotos.length) return { ...base };
  const tmp = fotos[idx];
  fotos[idx] = fotos[swap];
  fotos[swap] = tmp;
  return { ...base, fotos };
}

/** Prefer lightweight rail thumb, then capa, then first photo. */
export function resolveTrilhoUrl(raw: unknown): string | null {
  const m = normalizeMidia(raw);
  return m.trilhoThumb || m.capa || m.fotos[0] || null;
}
