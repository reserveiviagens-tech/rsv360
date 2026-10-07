/**
 * WS-15 / G-B.4 — Revenue canonical role guard (camada complementar, NAO substitui o legado).
 *
 * Mesmo desenho aprovado em G-B.1/G-B.2/G-B.3, aplicado EXCLUSIVAMENTE ao alvo
 * revenue/routes/index.ts (S9 A-21, pricing/calendar). O `requireRole('admin','manager')`
 * legado PERMANECE na rota; este guard ADICIONA a exigencia canonica (enterprise_users +
 * CanonicalRoleContext) SOMENTE quando a flag WS15_MEMBERSHIP_AUTHORITY=true esta LIGADA.
 * Flag OFF/ausente => next() (legacy governa, S8 preservado bit-a-bit). Flag ON: sem
 * membership verificada ou sem role >= manager => 403 fail-closed.
 *
 * ATENCAO G-B.4 (domínio econômico): este guard altera SOMENTE autoridade de acesso.
 * NENHUMA lógica de pricing, calendar, forecast, kpis, engine ou cálculo financeiro é
 * importada, chamada ou modificada aqui. Enterprise vem EXCLUSIVAMENTE de
 * authorizedEnterpriseContext (D10); claim/body/query/header nunca são autoridade.
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
export function createRequireRevenueManager(
  repository: PgEnterpriseUsersRepository = defaultRepository,
) {
  return async function requireRevenueManagerGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
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

/** Guard canonico Revenue montado na rota (default unconfigured — fail-closed com flag ON). */
export const requireRevenueManager = createRequireRevenueManager();
