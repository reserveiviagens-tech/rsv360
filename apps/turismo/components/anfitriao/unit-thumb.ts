/**
 * Resolve a compact cover URL from acomodacoes.midia JSON.
 * Prefers small WebP/AVIF when the CDN supports transforms.
 */

/** Soft photo-like SVG placeholders (visible even without real midia). */
const PLACEHOLDER_PALETTE = [
  ['#38bdf8', '#0284c7'],
  ['#a78bfa', '#7c3aed'],
  ['#34d399', '#059669'],
  ['#fb923c', '#ea580c'],
  ['#f472b6', '#db2777'],
  ['#94a3b8', '#475569'],
] as const;

function buildPlaceholderSvg(seed = 0, label = ''): string {
  const [c1, c2] = PLACEHOLDER_PALETTE[Math.abs(seed) % PLACEHOLDER_PALETTE.length];
  const initial = (label.trim().charAt(0) || 'A').toUpperCase();
  return (
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">` +
        `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
        `<stop stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>` +
        `</linearGradient></defs>` +
        `<rect width="128" height="128" rx="20" fill="url(#g)"/>` +
        `<circle cx="64" cy="48" r="18" fill="rgba(255,255,255,0.35)"/>` +
        `<path d="M28 98c8-22 24-34 36-34s28 12 36 34" fill="rgba(255,255,255,0.35)"/>` +
        `<text x="64" y="118" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="rgba(255,255,255,0.9)">${initial}</text>` +
        `</svg>`,
    )
  );
}

const PLACEHOLDER_SVG = buildPlaceholderSvg(0, 'A');

export function unitThumbPlaceholder(seed = 0, label = ''): string {
  if (!seed && !label) return PLACEHOLDER_SVG;
  return buildPlaceholderSvg(seed, label);
}

function firstStringUrl(value: unknown): string | null {
  if (typeof value === 'string') {
    const s = value.trim();
    return s.startsWith('http') || s.startsWith('/') || s.startsWith('data:') ? s : null;
  }
  return null;
}

/** Extract first usable photo URL from midia jsonb shapes. */
export function resolveUnitThumbUrl(midia: unknown): string | null {
  if (midia == null) return null;

  if (Array.isArray(midia)) {
    for (const item of midia) {
      const direct = firstStringUrl(item);
      if (direct) return direct;
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        for (const key of ['url', 'src', 'href', 'webp', 'thumbnail', 'thumb']) {
          const u = firstStringUrl(o[key]);
          if (u) return u;
        }
      }
    }
    return null;
  }

  if (typeof midia === 'string') {
    try {
      return resolveUnitThumbUrl(JSON.parse(midia));
    } catch {
      return firstStringUrl(midia);
    }
  }

  if (typeof midia === 'object') {
    const o = midia as Record<string, unknown>;
    for (const key of [
      'trilhoThumb',
      'trilho_thumb',
      'capa',
      'cover',
      'thumbnail',
      'thumb',
      'principal',
      'fotoPrincipal',
      'url',
      'webp',
    ]) {
      const u = firstStringUrl(o[key]);
      if (u) return u;
    }
    for (const key of ['fotos', 'images', 'photos', 'items', 'galeria']) {
      const nested = resolveUnitThumbUrl(o[key]);
      if (nested) return nested;
    }
  }

  return null;
}

/**
 * Ask CDNs for a tiny WebP/AVIF derivative when possible.
 * Falls back to original URL (still displayed at ~56–64px).
 */
export function compactThumbUrl(url: string, size = 128): string {
  if (!url || url.startsWith('data:')) return url;

  // Relative uploads are served by the backend, not the Next app.
  let absolute = url;
  if (url.startsWith('/uploads/')) {
    const base =
      (typeof process !== 'undefined' &&
        (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL)) ||
      'http://localhost:3002';
    absolute = `${String(base).replace(/\/$/, '')}${url}`;
  }

  try {
    const u = new URL(
      absolute,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    );
    const host = u.hostname.toLowerCase();

    // Cloudinary
    if (host.includes('res.cloudinary.com') && u.pathname.includes('/upload/')) {
      u.pathname = u.pathname.replace(
        '/upload/',
        `/upload/f_auto,q_auto:eco,c_fill,w_${size},h_${size},g_auto/`,
      );
      return u.toString();
    }

    // Imgix / similar
    if (host.includes('imgix.net') || host.includes('images.unsplash.com')) {
      u.searchParams.set('auto', 'format,compress');
      u.searchParams.set('w', String(size));
      u.searchParams.set('h', String(size));
      u.searchParams.set('fit', 'crop');
      u.searchParams.set('q', '70');
      return u.toString();
    }
  } catch {
    /* keep original */
  }

  return absolute;
}

export function statusPublicacaoLabel(status: string | null | undefined): string {
  const s = String(status || '').toLowerCase();
  if (s === 'publicado') return 'Anunciado';
  if (s === 'em_aprovacao') return 'Em aprovação';
  if (s === 'completo') return 'Completo';
  if (s === 'rascunho') return 'Rascunho';
  return status || '—';
}
