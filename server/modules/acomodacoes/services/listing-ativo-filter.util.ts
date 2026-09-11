import { eq, sql, type SQL } from 'drizzle-orm';
import { acomodacoes } from '../../../../backend/src/db/schema/acomodacoes';

export type AtivoFilter = 'true' | 'false' | 'all';

/** Whitelist query `ativo`; default active-only when omitted. Invalid → null (400). */
export function parseAtivoFilter(raw: unknown): AtivoFilter | null {
  if (raw == null || raw === '') return 'true';
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  if (v === 'true' || v === 'false' || v === 'all') return v;
  return null;
}

export function resolveAtivoFilter(raw?: AtivoFilter): AtivoFilter {
  return raw ?? 'true';
}

/** Drizzle WHERE fragment for listing filter; undefined when `all`. */
export function ativoFilterWhere(filter: AtivoFilter): SQL | undefined {
  switch (filter) {
    case 'false':
      return eq(acomodacoes.ativo, false);
    case 'true':
      return sql`${acomodacoes.ativo} IS DISTINCT FROM false`;
    case 'all':
      return undefined;
  }
}
