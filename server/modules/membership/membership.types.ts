/** Status canonico de uma membership enterprise-level (WS-15 / S2 — CONTRATO).
 *  Nomes reconciliados com o dominio real (AUDIT-B: PropertyUser usa apenas `is_active`).
 *  Regra: SOMENTE `active` e autorizador. Todo o resto -> DENY. */
export type MembershipStatus =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'revoked'
  | 'not_found';

/** Unico status autorizador. */
export const AUTHORIZING_STATUS: MembershipStatus = 'active';

/** Status que NUNCA autorizam, mesmo com identidade e enterprise corretas. */
export const DENYING_STATUSES: readonly MembershipStatus[] = [
  'inactive',
  'suspended',
  'revoked',
  'not_found',
];

/** Verdadeiro somente para `active` (I-05/I-06: status desconhecido nunca autoriza). */
export function isAuthorizingStatus(status: unknown): status is MembershipStatus {
  return status === AUTHORIZING_STATUS;
}

/** Papel canonico de ENTERPRISE RBAC (taxonomia unica — R-3 do Discovery).
 *  Deliberadamente NAO inclui os valores property-level de `PropertyUser.role`
 *  (`housekeeper`, `receptionist`, `staff`, `owner`), que pertencem ao C5 (I-09). */
export type EnterpriseRole = 'owner' | 'admin' | 'manager' | 'viewer';

/** Hierarquia: maior `rank` implica maior capacidade. `viewer` = leitura minima. */
export const ENTERPRISE_ROLE_RANK: Readonly<Record<EnterpriseRole, number>> = Object.freeze({
  viewer: 1,
  manager: 2,
  admin: 3,
  owner: 4,
});

export const ENTERPRISE_ROLES: readonly EnterpriseRole[] = Object.freeze([
  'owner',
  'admin',
  'manager',
  'viewer',
] as const);

/** Capacidades canonicas. Contrato minimo (permission model = opcao B do S2). */
export type EnterprisePermission =
  | 'enterprise.read'
  | 'enterprise.manage'
  | 'user.read'
  | 'user.manage';

const ROLE_PERMISSIONS: Readonly<Record<EnterpriseRole, readonly EnterprisePermission[]>> =
  Object.freeze({
    viewer: Object.freeze(['enterprise.read'] as EnterprisePermission[]),
    manager: Object.freeze([
      'enterprise.read',
      'user.read',
    ] as EnterprisePermission[]),
    admin: Object.freeze([
      'enterprise.read',
      'enterprise.manage',
      'user.read',
      'user.manage',
    ] as EnterprisePermission[]),
    owner: Object.freeze([
      'enterprise.read',
      'enterprise.manage',
      'user.read',
      'user.manage',
    ] as EnterprisePermission[]),
  });

/** Conjunto de capacidades de um papel enterprise. Papel desconhecido => vazio (nao ALLOW). */
export function permissionsForRole(role: unknown): readonly EnterprisePermission[] {
  return isCanonicalRole(role) ? ROLE_PERMISSIONS[role] : Object.freeze([] as EnterprisePermission[]);
}

export function isCanonicalRole(role: unknown): role is EnterpriseRole {
  return typeof role === 'string' && Object.prototype.hasOwnProperty.call(ENTERPRISE_ROLE_RANK, role);
}
