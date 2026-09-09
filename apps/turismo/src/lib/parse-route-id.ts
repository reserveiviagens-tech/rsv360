/**
 * Parse a Next.js dynamic route param into a positive integer id.
 * Rejects undefined, arrays, "[id]" literals, and non-numeric strings.
 */
export function parseRouteId(raw: unknown): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return null;
  }
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}
