import type { NextFunction, Request, Response } from 'express';

/**
 * G-D.0 + G-D.2 / OD-GD-01 — RANK LOCAL ADAPTER (formalizado)
 * ============================================================
 * `PROPOSTAS_LOCAL_ROLE_RANK` / `rankRole` / `hasMinRole` são um **adapter local**
 * de classificação operacional do módulo Propostas.
 *
 * NÃO é:
 * - contrato global de autorização RSV360;
 * - `ENTERPRISE_ROLE_RANK` (membership / RoleAssignment);
 * - Partner Authority (role `agente` / corretor / promotor);
 * - `agentAuth` (alias HTTP legado ≡ staffAuth — OD-GD-03 / G-D.1);
 * - allowlist de aprovação (isso é `isPropostasAprovador` — OD-GD-04 / G-D.1).
 *
 * G-D.2: mapa exportado como constante congelada para proveniência/testes;
 * predicates `rankRole`/`hasMinRole` permanecem bit-a-bit legado.
 * Aprovação/negação HTTP NÃO usa mais `hasMinRole` (G-D.1).
 *
 * NÃO promover este mapa a autoridade canônica enterprise sem Owner Decision.
 */

/** Frozen local rank map — do not mutate; do not treat as enterprise contract. */
export const PROPOSTAS_LOCAL_ROLE_RANK: Readonly<Record<string, number>> = Object.freeze({
  user: 1,
  operador: 2,
  manager: 2,
  supervisor: 3,
  admin: 4,
});

/** Marker: this module exposes a local adapter, not global authz. */
export const PROPOSTAS_RANK_IS_LOCAL_ADAPTER = true as const;

export class ForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(message = 'Acesso negado') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export function rankRole(role?: string): number {
  if (!role) return 0;
  return PROPOSTAS_LOCAL_ROLE_RANK[role] ?? 0;
}

/**
 * WS-15 S9 G-A — `requireRoleMin` MORTO (def sem chamadas em runtime).
 * Evidência: zero referências a `requireRoleMin` fora desta definição.
 * `hasMinRole`/`rankRole` seguem disponíveis como adapter local (classificação),
 * mas rotas de aprovação usam `isPropostasAprovador` (G-D.1) — não este middleware.
 *
 * @deprecated morto — sem chamadas; não usar em código novo.
 */

export function hasMinRole(userRole: string | undefined, minimo: string): boolean {
  return rankRole(userRole) >= rankRole(minimo);
}

/**
 * G-D.1 / OD-GD-04 — Allowlist real de aprovação/negação em Propostas.
 *
 * Autoridade canônica: **somente `admin`**.
 * Nota histórica: sob `staffAuth` ∈ {admin, manager, user},
 * `hasMinRole(role, 'supervisor')` já era efetivamente admin-only
 * (manager/user falhavam; supervisor nem entra no allowlist do staffAuth).
 * G-D.1 materializa a allowlist explícita — sem promover `supervisor`.
 * G-D.2: RANK adapter ≠ esta allowlist (namespaces distintos).
 */
export function isPropostasAprovador(role?: string | null): boolean {
  return role === 'admin';
}

export function requireRoleMin(minimo: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!hasMinRole(req.user?.role, minimo)) {
      return next(new ForbiddenError());
    }
    return next();
  };
}
