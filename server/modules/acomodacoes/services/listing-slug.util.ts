/**
 * Public listing slug helpers (Reservei Viagens /h/[slug]).
 */

export function normalizeListingSlug(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 116);
}

export function isValidListingSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-_]{0,114}[a-z0-9])?$/.test(slug) || /^[a-z0-9]$/.test(slug);
}

/** Card preview for custom listing link section. */
export function summarizeListingSlug(slug: unknown): string {
  return normalizeListingSlug(slug);
}

export type ModoReservaListing = 'instantanea' | 'aprovar';

export function resolveModoReserva(raw: unknown): ModoReservaListing {
  return raw === 'aprovar' ? 'aprovar' : 'instantanea';
}

/** Client accept path: hold+accepted vs wait for host. */
export function clientAcceptNeedsHostApproval(modo: ModoReservaListing): boolean {
  return modo === 'aprovar';
}
