/**
 * WS-15 / G-B.2 — Guest Portal Admin canonical role guard (camada complementar, NAO substitui o legado).
 *
 * Mesmo desenho aprovado em G-B.1 (crm.guard.ts), aplicado EXCLUSIVAMENTE ao alvo
 * guest-portal/admin.routes.ts (S9 A-11). O `requireRole('admin','manager')` legado
 * PERMANECE na rota; este guard ADICIONA a exigencia canonica (enterprise_users +
 * CanonicalRoleContext) SOMENTE quando a flag WS15_MEMBERSHIP_AUTHORITY=true esta
 * LIGADA. Flag OFF/ausente => next() (legacy governa, comportamento S8 preservado
 * bit-a-bit). Flag ON: sem membership verificada ou sem role >= manager => 403
 * fail-closed. NUNCA le claim/body/query/header como autoridade; enterprise vem
 * EXCLUSIVAMENTE de authorizedEnterpriseContext (D10).
 */
import type { NextFunction, Request, Response } from 'express';
import { isMembershipAuthorityEnabled } from './membership.plug';
import { PgEnterpriseUsersRepository } from './role-assignment.repository';
import { resolveCanonicalRoleContext } from './role-assignment.adapter';
import { requireEnterpriseRole } from './role.guards';

/** Repository sem runner = unconfigured (fail-closed); wiring real (Pool) = M-composition futura. */
const defaultRepository = new PgEnterpriseUsersRepository(null);

const guardManager = requireEnterpriseRole('manager');

/** Factory: permite injetar repository (testes/wiring futuro). Default = unconfigured (DENY com flag ON). */
export function createRequirePortalAdminManager(
  repository: PgEnterpriseUsersRepository = defaultRepository,
) {
  return async function requirePortalAdminManagerGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!isMembershipAuthorityEnabled(process.env as Record<string, unknown>)) {
        next(); // flag OFF: camada canonica inativa — o requireRole legado ja decidiu
        return;
      }
      const resolution = req.authorizedEnterpriseContext;
      if (!resolution || resolution.membershipVerified !== true) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }
      const userId = (req as { user?: { id?: unknown } }).user?.id;
      const ctx = await resolveCanonicalRoleContext(repository, {
        subjectUserId: userId,
        internalEnterpriseId: resolution.internalEnterpriseId,
        membershipVerified: true,
      });
      const outcome = guardManager(ctx);
      if (!outcome.allowed) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }
      next();
    } catch {
      res.status(403).json({ success: false, error: 'Acesso negado' });
    }
  };
}

/** Guard canonico Guest Portal Admin montado na rota (default unconfigured — fail-closed com flag ON). */
export const requirePortalAdminManager = createRequirePortalAdminManager();
