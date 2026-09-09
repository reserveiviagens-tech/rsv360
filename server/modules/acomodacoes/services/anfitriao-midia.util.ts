/**
 * Normalize acomodacoes.midia JSON into { capa, fotos, trilhoThumb, itens }.
 * PropertySwitcher reads capa / cover / first foto via resolveUnitThumbUrl.
 * Gallery items may be legacy string[] or rich { url, categoria, caption }.
 */

export const FOTO_CATEGORIAS = [
  { id: 'quarto', label: 'Quarto' },
  { id: 'sala', label: 'Sala' },
  { id: 'cozinha', label: 'Cozinha' },
  { id: 'banheiro', label: 'Banheiro' },
  { id: 'exterior', label: 'Exterior' },
  { id: 'piscina', label: 'Piscina' },
  { id: 'vista', label: 'Vista' },
  { id: 'entrada', label: 'Entrada' },
  { id: 'area_comum', label: 'Área comum' },
  { id: 'outro', label: 'Outro' },
] as const;

export type FotoCategoriaId = (typeof FOTO_CATEGORIAS)[number]['id'];

export type FotoItem = {
  url: string;
  categoria?: string | null;
  caption?: string | null;
  ordem?: number;
};

export type MidiaBag = {
  capa: string | null;
  /** Lightweight rail derivative (WebP), preferred for thumbnails. */
  trilhoThumb: string | null;
  /** URL list for legacy consumers (always synced from itens). */
  fotos: string[];
  /** Rich gallery — source of truth for categories/captions. */
  itens: FotoItem[];
};

const CATEGORIA_IDS = new Set<string>(FOTO_CATEGORIAS.map((c) => c.id));

export function isFotoCategoriaId(value: unknown): value is FotoCategoriaId {
  return typeof value === 'string' && CATEGORIA_IDS.has(value);
}

export function labelFotoCategoria(id: string | null | undefined): string | null {
  if (!id) return null;
  return FOTO_CATEGORIAS.find((c) => c.id === id)?.label ?? null;
}

function asUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!s) return null;
  if (s.startsWith('http') || s.startsWith('/') || s.startsWith('data:')) return s;
  return null;
}

function asFotoItem(value: unknown): FotoItem | null {
  if (typeof value === 'string') {
    const url = asUrl(value);
    return url ? { url, categoria: null, caption: null } : null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  const url = asUrl(o.url) || asUrl(o.src) || asUrl(o.href);
  if (!url) return null;
  const categoriaRaw = o.categoria ?? o.category ?? o.room;
  const categoria =
    typeof categoriaRaw === 'string' && categoriaRaw.trim()
      ? categoriaRaw.trim().toLowerCase()
      : null;
  const captionRaw = o.caption ?? o.legenda ?? o.titulo;
  const caption = typeof captionRaw === 'string' && captionRaw.trim() ? captionRaw.trim() : null;
  return { url, categoria, caption };
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
    for (const key of ['fotos', 'images', 'photos', 'items', 'galeria', 'itens']) {
      if (o[key] != null) collectUrls(o[key], out);
    }
  }
}

function collectItens(value: unknown, out: FotoItem[], seen: Set<string>): void {
  if (value == null) return;
  if (Array.isArray(value)) {
    for (const item of value) collectItens(item, out, seen);
    return;
  }
  const parsed = asFotoItem(value);
  if (parsed && !seen.has(parsed.url)) {
    seen.add(parsed.url);
    out.push(parsed);
  }
}

function pack(capa: string | null, trilhoThumb: string | null, itens: FotoItem[]): MidiaBag {
  const ordered = itens.map((it, ordem) => ({
    url: it.url,
    categoria: it.categoria ?? null,
    caption: it.caption ?? null,
    ordem,
  }));
  return {
    capa,
    trilhoThumb,
    fotos: ordered.map((it) => it.url),
    itens: ordered,
  };
}

export function normalizeMidia(raw: unknown): MidiaBag {
  const itens: FotoItem[] = [];
  const seen = new Set<string>();
  let capa: string | null = null;
  let trilhoThumb: string | null = null;

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    capa = asUrl(o.capa) || asUrl(o.cover) || asUrl(o.principal) || asUrl(o.fotoPrincipal);
    trilhoThumb = asUrl(o.trilhoThumb) || asUrl(o.trilho_thumb) || asUrl(o.thumb);

    // Prefer explicit itens, then fotos/images arrays (may be strings or objects).
    if (o.itens != null) collectItens(o.itens, itens, seen);
    collectItens(o.fotos ?? o.images ?? o.photos ?? o.galeria ?? o.items, itens, seen);

    // Gather other string fields that look like urls (legacy loose midia).
    for (const [k, v] of Object.entries(o)) {
      if (
        [
          'capa',
          'cover',
          'trilhoThumb',
          'trilho_thumb',
          'thumb',
          'fotos',
          'images',
          'photos',
          'galeria',
          'items',
          'itens',
        ].includes(k)
      ) {
        continue;
      }
      const urls: string[] = [];
      collectUrls(v, urls);
      for (const u of urls) {
        if (!seen.has(u)) {
          seen.add(u);
          itens.push({ url: u, categoria: null, caption: null });
        }
      }
    }
  } else {
    collectItens(raw, itens, seen);
  }

  if (!capa && itens.length > 0) capa = itens[0].url;
  return pack(capa, trilhoThumb, itens);
}

export function midiaWithTrilhoThumb(
  raw: unknown,
  trilhoThumbUrl: string,
  originalUrl?: string | null,
): MidiaBag & Record<string, unknown> {
  const base = normalizeMidia(raw);
  const itens = [...base.itens];
  if (originalUrl && !itens.some((it) => it.url === originalUrl)) {
    itens.unshift({ url: originalUrl, categoria: null, caption: null });
  }
  return {
    ...pack(originalUrl || base.capa || trilhoThumbUrl, trilhoThumbUrl, itens),
  };
}

export function midiaWithCapa(raw: unknown, capaUrl: string): MidiaBag & Record<string, unknown> {
  const base = normalizeMidia(raw);
  const itens = [...base.itens];
  if (!itens.some((it) => it.url === capaUrl)) {
    itens.unshift({ url: capaUrl, categoria: null, caption: null });
  }
  return { ...pack(capaUrl, base.trilhoThumb, itens) };
}

export function midiaAddFoto(raw: unknown, fotoUrl: string): MidiaBag & Record<string, unknown> {
  const base = normalizeMidia(raw);
  const itens = base.itens.some((it) => it.url === fotoUrl)
    ? [...base.itens]
    : [...base.itens, { url: fotoUrl, categoria: null, caption: null }];
  return {
    ...pack(base.capa || fotoUrl, base.trilhoThumb, itens),
  };
}

export function midiaRemoveFoto(raw: unknown, fotoUrl: string): MidiaBag & Record<string, unknown> {
  const base = normalizeMidia(raw);
  const itens = base.itens.filter((it) => it.url !== fotoUrl);
  const capa = base.capa === fotoUrl ? itens[0]?.url || null : base.capa;
  const trilhoThumb = base.trilhoThumb === fotoUrl ? null : base.trilhoThumb;
  return { ...pack(capa, trilhoThumb, itens) };
}

export function midiaMoveFoto(
  raw: unknown,
  fotoUrl: string,
  direction: 'left' | 'right',
): MidiaBag & Record<string, unknown> {
  const base = normalizeMidia(raw);
  const itens = [...base.itens];
  const idx = itens.findIndex((it) => it.url === fotoUrl);
  if (idx < 0) return { ...base };
  const swap = direction === 'left' ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= itens.length) return { ...base };
  const tmp = itens[idx];
  itens[idx] = itens[swap];
  itens[swap] = tmp;
  return { ...pack(base.capa, base.trilhoThumb, itens) };
}

export function midiaSetCategoria(
  raw: unknown,
  fotoUrl: string,
  categoria: string | null,
): MidiaBag & Record<string, unknown> {
  const base = normalizeMidia(raw);
  const normalized =
    categoria && categoria.trim() ? categoria.trim().toLowerCase() : null;
  if (normalized && !isFotoCategoriaId(normalized)) {
    throw new Error('Categoria de foto inválida');
  }
  const itens = base.itens.map((it) =>
    it.url === fotoUrl ? { ...it, categoria: normalized } : it,
  );
  if (!itens.some((it) => it.url === fotoUrl)) {
    throw new Error('Foto não encontrada na galeria');
  }
  return { ...pack(base.capa, base.trilhoThumb, itens) };
}

export function midiaSetCaption(
  raw: unknown,
  fotoUrl: string,
  caption: string | null,
): MidiaBag & Record<string, unknown> {
  const base = normalizeMidia(raw);
  const clean = caption && caption.trim() ? caption.trim().slice(0, 120) : null;
  const itens = base.itens.map((it) => (it.url === fotoUrl ? { ...it, caption: clean } : it));
  if (!itens.some((it) => it.url === fotoUrl)) {
    throw new Error('Foto não encontrada na galeria');
  }
  return { ...pack(base.capa, base.trilhoThumb, itens) };
}

/** Prefer lightweight rail thumb, then capa, then first photo. */
export function resolveTrilhoUrl(raw: unknown): string | null {
  const m = normalizeMidia(raw);
  return m.trilhoThumb || m.capa || m.fotos[0] || null;
}

export function countFotosPorCategoria(raw: unknown): Record<string, number> {
  const m = normalizeMidia(raw);
  const counts: Record<string, number> = {};
  for (const it of m.itens) {
    const key = it.categoria || 'sem_categoria';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}
