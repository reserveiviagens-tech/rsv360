/**
 * WS-15 / S5 — Canonical Role Context (ENRIQUECIMENTO, SEM EFEITO SOBRE `verified`).
 *
 * REGRA CENTRAL (invariante da fatia):
 *     verified  <- membership ACTIVE + subject valido + enterprise resolvido   (S2/S3)
 *     role      <- contexto derivado, transportado no contexto autorizado
 * Um `owner` NUNCA ressuscita membership invalida; um `role` ausente NUNCA invalida
 * membership valida. `role` nao participa da decisao de `verified`.
 *
 * I-07: `req.user.role` (JWT claim) NUNCA e fonte de role autorizado — recusado aqui.
 * I-11: PropertyUser.role nao e fonte de role enterprise (recusado pelo mapeamento S2).
 * I-12: este modulo nao concede `permissions` como autoridade; expoe capacidades derivadas
 *       do papel para consumo posterior (S6), sempre fail-closed.
 */
import {
  asCanonicalEnterpriseRole,
  mapLegacyRoleToCanonical,
  type LegacyRoleSource,
} from './rbac.mapping';
import {
  isCanonicalRole,
  permissionsForRole,
  type EnterprisePermission,
  type EnterpriseRole,
} from './membership.types';

/** Origem auditavel do papel. `jwt-claim` nunca produz papel. */
export type RoleSource = 'membership-record' | 'legacy-mapping';

export interface CanonicalRoleContext {
  readonly role: EnterpriseRole | null;
  readonly source: RoleSource | null;
  /** Capacidades derivadas do papel. Papel ausente/desconhecido => vazio. */
  readonly permissions: readonly EnterprisePermission[];
  /** Auditavel. `verified` NAO aparece aqui: sao dimensoes independentes. */
  readonly roleVerified: boolean;
}

const EMPTY: CanonicalRoleContext = Object.freeze({
  role: null,
  source: null,
  permissions: Object.freeze([] as EnterprisePermission[]),
  roleVerified: false,
});

export interface RoleContextInput {
  /** Papel vindo do REGISTRO de membership (fonte autoritativa futura). */
  recordRole?: unknown;
  /** Papel legado a reconciliar. `source: 'jwt-claim'` e recusado. */
  legacyRole?: unknown;
  legacySource?: LegacyRoleSource;
  /** Membership verificada? Afeta apenas se o contexto deve expor papel. */
  membershipVerified?: boolean;
}

/**
 * Enriquece o contexto com o papel canonico.
 * NAO recebe nem altera `verified`: apenas ousa `membershipVerified` para nao expor
 * papel sobre uma membership nao verificada (fail-closed de apresentacao).
 */
export function buildRoleContext(input: RoleContextInput = {}): CanonicalRoleContext {
  if (input.membershipVerified === false) return EMPTY; // sem prova, sem papel

  let role: EnterpriseRole | null = null;
  let source: RoleSource | null = null;

  if (isCanonicalRole(input.recordRole)) {
    role = input.recordRole;
    source = 'membership-record';
  } else if (input.legacySource === 'jwt-claim') {
    return EMPTY; // I-07: claim do JWT nunca produz papel autorizado, mesmo se canonico
  } else if (input.legacySource !== undefined) {
    const mapped = mapLegacyRoleToCanonical(input.legacyRole, input.legacySource);
    if (mapped !== null) {
      role = mapped;
      source = 'legacy-mapping';
    }
  } else {
    const mapped = asCanonicalEnterpriseRole(input.legacyRole);
    if (mapped !== null) {
      role = mapped;
      source = 'legacy-mapping';
    }
  }

  if (role === null) return EMPTY; // papel ausente/desconhecido => contexto vazio, nunca erro

  return { role, source, permissions: permissionsForRole(role), roleVerified: true };
}

/** Atalho: a capacidade pedida existe no contexto? Papel ausente => false (I-12). */
export function roleContextAllows(
  ctx: CanonicalRoleContext,
  permission: EnterprisePermission,
): boolean {
  return ctx.permissions.includes(permission);
}
