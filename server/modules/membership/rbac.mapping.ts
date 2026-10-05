/**
 * WS-15 / S2 — Mapeamento LEGADO -> CANONICO (contrato, sem I/O, sem DB).
 *
 * R-3 do Discovery: existem 3 vocabularios divergentes. NENHUM e promovido diretamente.
 * Este mapa e declarativo: nao concede autoridade, nao consulta DB, nao promove claim.
 * I-07: `req.user.role` (claim do JWT) NUNCA entra aqui como fonte de papel autorizado.
 */
import {
  ENTERPRISE_ROLES,
  type EnterpriseRole,
  isCanonicalRole,
} from './membership.types';

/** Valor property-level NAO pode virar papel enterprise (I-04 / I-09 — pertence ao C5). */
export type LegacyRoleSource = 'property-user' | 'propostas-rbac' | 'jwt-claim';

export interface LegacyRoleMapping {
  readonly source: LegacyRoleSource;
  readonly legacyValue: string;
  /** null => sem equivalente enterprise-level (property-level ou descarte). */
  readonly canonical: EnterpriseRole | null;
  readonly note: string;
}

export const LEGACY_ROLE_MAPPINGS: readonly LegacyRoleMapping[] = Object.freeze([
  // PropertyUser.role — property-level. 'admin'/'manager'/'owner' tem equivalente conceitual,
  // mas a RELACAO e property-scoped: nao prova membership enterprise (I-04).
  { source: 'property-user', legacyValue: 'owner', canonical: 'owner', note: 'conceitual; relacao property-scoped' },
  { source: 'property-user', legacyValue: 'admin', canonical: 'admin', note: 'conceitual; relacao property-scoped' },
  { source: 'property-user', legacyValue: 'manager', canonical: 'manager', note: 'conceitual; relacao property-scoped' },
  { source: 'property-user', legacyValue: 'staff', canonical: 'viewer', note: 'minimo: leitura' },
  { source: 'property-user', legacyValue: 'housekeeper', canonical: null, note: 'property-level — C5' },
  { source: 'property-user', legacyValue: 'receptionist', canonical: null, note: 'property-level — C5' },

  // propostas/rbac.ts ROLE_RANK — convencao local C36, NAO contrato global.
  { source: 'propostas-rbac', legacyValue: 'admin', canonical: 'admin', note: 'rank 4 na convencao C36' },
  { source: 'propostas-rbac', legacyValue: 'supervisor', canonical: 'manager', note: 'rank 3 → manager' },
  { source: 'propostas-rbac', legacyValue: 'manager', canonical: 'manager', note: 'rank 2' },
  { source: 'propostas-rbac', legacyValue: 'operador', canonical: 'viewer', note: 'rank 2 local → leitura' },
  { source: 'propostas-rbac', legacyValue: 'user', canonical: 'viewer', note: 'rank 1 local → leitura' },
] as LegacyRoleMapping[]);

/**
 * Traduz um valor legado em papel enterprise.
 * Fonte `jwt-claim` e RECUSADA por design (I-07): claim nao promove papel.
 * Valor desconhecido => null => sem autoridade.
 */
export function mapLegacyRoleToCanonical(
  value: unknown,
  source: LegacyRoleSource,
): EnterpriseRole | null {
  if (source === 'jwt-claim') return null; // I-07 — claim nunca e fonte de role autorizado
  if (typeof value !== 'string') return null;
  const found = LEGACY_ROLE_MAPPINGS.find(
    (m) => m.source === source && m.legacyValue === value,
  );
  return found ? found.canonical : null;
}

/** Papel enterprise valido (ja canonico) ou null. */
export function asCanonicalEnterpriseRole(value: unknown): EnterpriseRole | null {
  return isCanonicalRole(value) ? value : null;
}

/** Todos os papeis canonicos, para auditoria/documentacao. */
export function listCanonicalRoles(): readonly EnterpriseRole[] {
  return ENTERPRISE_ROLES;
}
