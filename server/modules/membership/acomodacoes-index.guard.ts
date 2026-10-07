/**
 * WS-15 / G-C.9c.1 — Acomodacoes Index canonical role guard (camada complementar).
 *
 * Modelo A (staff-only). Alvo EXCLUSIVO: acomodacoes/routes/index.ts — rotas `/admin/*`
 * montadas em `adminAuth` (`requireRole('admin')`). Papel mínimo REAL = admin.
 *
 * NÃO aplicar a rotas públicas (health, /publico/*, /disponiveis, /addons).
 * NÃO aplicar a anfitriao.routes.ts (G-C.9c.2 / 9c.3 — NOT OPENED).
 * NÃO aplicar a import/sync/tarifas (9a / 9b).
 *
 * Flag WS15_MEMBERSHIP_AUTHORITY OFF/ausente => next() (legado bit-a-bit).
 * Flag ON: membership verificada + role >= admin. Fail-closed.
 * Enterprise vem EXCLUSIVAMENTE de authorizedEnterpriseContext (D10).
 */
import type { NextFunction, Request, Response } from 'express';
import { isMembershipAuthorityEnabled } from './membership.plug';
import { PgEnterpriseUsersRepository } from './role-assignment.repository';
import { resolveCanonicalRoleContext } from './role-assignment.adapter';
import { requireEnterpriseRole } from './role.guards';

/** Repository sem runner = unconfigured (fail-closed); wiring real (Pool) = M-composition futura. */
const defaultRepository = new PgEnterpriseUsersRepository(null);

const guardAdmin = requireEnterpriseRole('admin');

/** Factory: permite injetar repository (testes/wiring futuro). Default = unconfigured (DENY com flag ON). */
export function createRequireAcomodacoesIndexAdmin(
  repository: PgEnterpriseUsersRepository = defaultRepository,
) {
  return async function requireAcomodacoesIndexAdminGuard(
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
      const outcome = guardAdmin(ctx);
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

/** Guard canônico Index Admin montado no array acomodacoesAdminAuth (default unconfigured — fail-closed). */
export const requireAcomodacoesIndexAdmin = createRequireAcomodacoesIndexAdmin();
