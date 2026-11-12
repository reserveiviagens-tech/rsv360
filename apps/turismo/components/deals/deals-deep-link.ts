import type { Deal } from './deal-card';

/** Lintel demo slugs → deal ids */
const SLUG_TO_ID: Record<string, string> = {
  dhollisspen: 'deal_hollis_spencer',
  dhollismarc: 'deal_008',
  dhollispriya: 'deal_006',
};

const DEAL_HASH_RE = /^#\/?deals\/([^/?&#]+)/i;

export type DealsDeepLinkContext = 'deals-page' | 'overview';

export function dealDeepLinkSlug(deal: Deal): string {
  if (deal.deepLinkSlug) return deal.deepLinkSlug;
  const prop = deal.propertyName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14);
  const initials = (deal.clientName ?? '')
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .toLowerCase();
  const generated = `d${prop}${initials}`.replace(/^d$/, '');
  return generated || deal.id;
}

export function findDealByDeepLink(key: string, deals: Deal[]): Deal | undefined {
  const normalized = key.toLowerCase().trim();
  if (!normalized) return undefined;

  const mappedId = SLUG_TO_ID[normalized];
  if (mappedId) {
    const hit = deals.find((row) => row.id === mappedId);
    if (hit) return hit;
  }

  const byExplicit = deals.find((row) => row.deepLinkSlug?.toLowerCase() === normalized);
  if (byExplicit) return byExplicit;

  if (normalized.startsWith('deal_')) {
    return deals.find((row) => row.id === normalized);
  }

  return deals.find((row) => dealDeepLinkSlug(row).toLowerCase() === normalized);
}

export function readDealKeyFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const m = window.location.hash.match(DEAL_HASH_RE);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

export function writeDealHash(slug: string | null): void {
  if (typeof window === 'undefined') return;
  const base = `${window.location.pathname}${window.location.search}`;
  if (slug) {
    window.history.replaceState(null, '', `${base}#/deals/${encodeURIComponent(slug)}`);
  } else if (window.location.hash) {
    window.history.replaceState(null, '', base);
  }
}

export function resolveDealDeepLinkKey(queryDeal: string | string[] | undefined): string {
  const fromQuery = typeof queryDeal === 'string' ? queryDeal : '';
  if (fromQuery) return fromQuery;
  return readDealKeyFromHash() ?? '';
}

/** Absolute URL shareable from the current host (query + Lintel-style hash). */
export function buildShareableDealUrl(deal: Deal, context: DealsDeepLinkContext): string {
  if (typeof window === 'undefined') return '';
  const slug = dealDeepLinkSlug(deal);
  const hash = `#/deals/${encodeURIComponent(slug)}`;
  const origin = window.location.origin;

  if (context === 'overview') {
    const params = new URLSearchParams({ tab: 'deals', deal: slug });
    return `${origin}/overview?${params.toString()}${hash}`;
  }

  const params = new URLSearchParams({ deal: slug });
  return `${origin}/deals?${params.toString()}${hash}`;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
