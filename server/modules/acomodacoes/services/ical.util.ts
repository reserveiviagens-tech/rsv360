/**
 * iCal helpers for anfitrião calendar sync (export merge + import parse + SSRF URL gate).
 */

const PRIVATE_HOST_RE =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|0\.0\.0\.0|\[::1\]|metadata\.google|169\.254\.)/i;

/** Observation marker for blocks created by external iCal import. */
export const ICAL_IMPORT_OBS = '[ical-import]';

export function assertSafeIcalUrl(raw: string): URL {
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    throw new Error('URL do calendário é obrigatória');
  }
  if (trimmed.length > 2048) {
    throw new Error('URL do calendário muito longa');
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('URL do calendário inválida');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('URL deve usar http ou https');
  }
  // Production-safe: block obvious private/metadata hosts (SSRF).
  // Localhost http allowed only in non-production for lab feeds.
  const host = url.hostname.toLowerCase();
  const isLocal =
    host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  if (PRIVATE_HOST_RE.test(host) && !(isLocal && process.env.NODE_ENV !== 'production')) {
    throw new Error('URL de calendário não permitida');
  }
  if (isLocal && url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('URL de calendário não permitida');
  }
  return url;
}

function unfoldIcal(text: string): string {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

function parseIcalDateValue(raw: string): string | null {
  const v = raw.trim();
  // DATE: 20260907
  if (/^\d{8}$/.test(v)) {
    return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  }
  // DATETIME: 20260907T120000Z or 20260907T120000
  const m = v.match(/^(\d{8})T/);
  if (m) {
    const d = m[1];
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  }
  return null;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function enumerateNights(startIso: string, endExclusiveIso: string): string[] {
  const out: string[] = [];
  if (!startIso || !endExclusiveIso || endExclusiveIso <= startIso) {
    // Single all-day without DTEND → one night
    if (startIso) out.push(startIso);
    return out;
  }
  for (let cur = startIso; cur < endExclusiveIso; cur = addDaysIso(cur, 1)) {
    out.push(cur);
  }
  return out;
}

/**
 * Extract busy night dates (YYYY-MM-DD) from ICS text.
 * DTEND for VALUE=DATE is exclusive (RFC 5545).
 */
export function parseIcalBusyDates(icsText: string, de: string, ate: string): string[] {
  const text = unfoldIcal(String(icsText || ''));
  const blocks = text.split(/BEGIN:VEVENT/i).slice(1);
  const busy = new Set<string>();

  for (const block of blocks) {
    const body = block.split(/END:VEVENT/i)[0] || '';
    const startLine = body.match(/DTSTART(?:;VALUE=DATE)?(?:;[^:]*)?:([^\r\n]+)/i);
    if (!startLine) continue;
    const start = parseIcalDateValue(startLine[1]);
    if (!start) continue;
    const endLine = body.match(/DTEND(?:;VALUE=DATE)?(?:;[^:]*)?:([^\r\n]+)/i);
    const endExclusive = endLine ? parseIcalDateValue(endLine[1]) : addDaysIso(start, 1);
    if (!endExclusive) continue;

    for (const night of enumerateNights(start, endExclusive)) {
      if (night >= de && night <= ate) busy.add(night);
    }
  }

  return [...busy].sort();
}

/** Merge consecutive YYYY-MM-DD nights into [start, endExclusive) ranges for VEVENT. */
export function mergeBusyRanges(
  dates: string[],
): Array<{ start: string; endExclusive: string }> {
  if (dates.length === 0) return [];
  const sorted = [...dates].sort();
  const ranges: Array<{ start: string; endExclusive: string }> = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i += 1) {
    const cur = sorted[i];
    if (cur === addDaysIso(prev, 1)) {
      prev = cur;
      continue;
    }
    ranges.push({ start, endExclusive: addDaysIso(prev, 1) });
    start = cur;
    prev = cur;
  }
  ranges.push({ start, endExclusive: addDaysIso(prev, 1) });
  return ranges;
}

export function toIcalDate(iso: string): string {
  return iso.replace(/-/g, '');
}
