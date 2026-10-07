import type { InstrutorPapel } from './tipos';

const ANFITRIAO_ROLES = new Set(['anfitriao', 'corretor', 'host']);

export function papelFromRole(role?: string | null): Exclude<InstrutorPapel, 'ambos'> {
  if (role && ANFITRIAO_ROLES.has(String(role).toLowerCase())) return 'anfitriao';
  return 'staff';
}

/**
 * G-D.8 / OD-GD-07 — body nunca é autoridade.
 *
 * authenticated claim/context → papel canônico via `papelFromRole`
 * body.papel (staff|anfitriao) → hint opcional
 *   match  → continue
 *   diverge → DENY
 * body ausente ou `ambos` → sem hint específico; usa claim
 */
export type ResolvePapelResult =
  | { ok: true; papel: Exclude<InstrutorPapel, 'ambos'> }
  | { ok: false; status: 403; reason: 'papel_mismatch' };

export function resolvePapel(
  role: string | null | undefined,
  bodyPapel?: InstrutorPapel,
): ResolvePapelResult {
  const fromClaim = papelFromRole(role);
  if (bodyPapel === 'staff' || bodyPapel === 'anfitriao') {
    if (bodyPapel !== fromClaim) {
      return { ok: false, status: 403, reason: 'papel_mismatch' };
    }
    return { ok: true, papel: fromClaim };
  }
  return { ok: true, papel: fromClaim };
}
