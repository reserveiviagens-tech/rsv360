const STORAGE_KEY = 'rsv360_crm_rental_favorites';

function readIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function isRentalFavorite(id: string): boolean {
  return readIds().includes(id);
}

export function setRentalFavorite(id: string, on: boolean): string[] {
  const ids = new Set(readIds());
  if (on) ids.add(id);
  else ids.delete(id);
  const next = [...ids];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function readRentalFavoriteIds(): string[] {
  return readIds();
}
