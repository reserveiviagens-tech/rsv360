/** Minimal className merge (no dependency on apps/site-publico). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}