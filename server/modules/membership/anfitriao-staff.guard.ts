/**
 * WS-15 / G-C.9c.3 — Anfitrião Staff Approval canonical role guard (Modelo A).
 *
 * OD-9c-A APPROVED: staffAprovacao = Staff Authority / Modelo A — NÃO Partner Authority.
 * Alvo EXCLUSIVO: 6 rotas `staffAprovacao` em anfitriao.routes.ts
 * (`requireRole('admin', 'manager')` legado => mínimo canônico = manager).
 *
 * Flag OFF => next() (legado bit-a-bit).
 * Flag ON => membership verificada + role >= manager. Fail-closed.
 * Sem composição Partner × Enterprise. Sem mapear anfitriao → Enterprise Role.
 */
import type { NextFunction, Request, Response } from 'express';
import { isMembershipAuthorityEnabled } from './membership.plug';
import { PgEnterpriseUsersRepository } from './role-assignment.repository';
import { resolveCanonicalRoleContext } from './role-assignment.adapter';
import { requireEnterpriseRole } from './role.guards';

const defaultRepository = new PgEnterpriseUsersRepository(null);
const guardManager = requireEnterpriseRole('manager');

export function createRequireAnfitriaoStaffManager(
  repository: PgEnterpriseUsersRepository = defaultRepository,
) {
  return async function requireAnfitriaoStaffManagerGuard(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!isMembershipAuthorityEnabled(process.env as Record<string, unknown>)) {
        next();
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

export const requireAnfitriaoStaffManager = createRequireAnfitriaoStaffManager();
