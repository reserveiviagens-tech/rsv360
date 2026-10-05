/**
 * WS-15 / S6 — Enterprise Role Guards (FRONTEIRA NOVA, nao substitui o legado).
 *
 * Regra estrutural: um guard recebe **somente** `CanonicalRoleContext` (produzido por S5 a
 * partir da autoridade de membership). Ele NUNCA recebe `Request`, nunca le
 * `req.user.role`, `req.user`, `req.body`, `req.query`, headers ou `PropertyUser.role`.
 * A assinatura nao tem como aceitar carrier HTTP: nao ha parametro para isso.
 *
 * I-S6-04/05/06: role desconhecido, contexto ausente ou `roleVerified=false` => DENY.
 * I-S6-07..10: hierarquia owner(4) > admin(3) > manager(2) > viewer(1).
 * I-S6-11: contexto construido sobre `membershipVerified=false` nunca autoriza.
 * I-S6-12: `permission` nao vem do cliente — e argumento do codigo, nunca do request.
 *
 * O legado (`requireRole` em auth.middleware e `propostas/rbac.ts`) NAO e importado,
 * substituido ou reescrito aqui. Migracao = S9.
 */
import {
  ENTERPRISE_ROLE_RANK,
  isCanonicalRole,
  type EnterprisePermission,
  type EnterpriseRole,
} from './membership.types';
import type { CanonicalRoleContext } from './role.context';

export interface RoleGuardOutcome {
  readonly allowed: boolean;
  /** Motivo da negacao — auditavel. */
  readonly reason: 'ok' | 'missing-context' | 'unverified-role' | 'unknown-role' | 'insufficient-role' | 'missing-permission';
  readonly role: EnterpriseRole | null;
}

const DENY = (reason: RoleGuardOutcome['reason'], role: EnterpriseRole | null = null): RoleGuardOutcome =>
  Object.freeze({ allowed: false, reason, role });

/**
 * Guard de papel minimo. Consome APENAS o contexto canonico.
 * Contexto ausente/null/invalido => DENY (I-S6-05).
 */
export function requireEnterpriseRole(minimum: EnterpriseRole) {
  return (context: CanonicalRoleContext | null | undefined): RoleGuardOutcome => {
    if (context === null || context === undefined || typeof context !== 'object') {
      return DENY('missing-context');
    }
    if (context.roleVerified !== true) return DENY('unverified-role'); // I-S6-06
    const role = context.role;
    if (!isCanonicalRole(role)) return DENY('unknown-role', null); // I-S6-04
    const requiredRank = ENTERPRISE_ROLE_RANK[minimum];
    const actualRank = ENTERPRISE_ROLE_RANK[role];
    if (actualRank < requiredRank) return DENY('insufficient-role', role); // I-S6-07..09
    return { allowed: true, reason: 'ok', role };
  };
}

/**
 * Guard de capacidade. `permission` e constante do CODIGO chamador (I-S6-12);
 * nunca provem de request. Usa a lista derivada do papel canonico (S5), que por sua vez
 * deriva do contrato S2 — `roleContextAllows` NAO e fonte de autoridade independente.
 */
export function requireEnterprisePermission(permission: EnterprisePermission) {
  return (context: CanonicalRoleContext | null | undefined): RoleGuardOutcome => {
    const base = requireEnterpriseRole('viewer')(context);
    if (!base.allowed) return base;
    const ctx = context as CanonicalRoleContext;
    if (!Array.isArray(ctx.permissions) || !ctx.permissions.includes(permission)) {
      return DENY('missing-permission', base.role);
    }
    return base;
  };
}

/** Atalho booleano para uso em expressoes. Preserva a mesma matriz. */
export function isAllowed(
  guard: (c: CanonicalRoleContext | null | undefined) => RoleGuardOutcome,
  context: CanonicalRoleContext | null | undefined,
): boolean {
  return guard(context).allowed;
}
