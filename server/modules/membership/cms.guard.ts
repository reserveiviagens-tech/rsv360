/**
 * WS-15 / G-C.2 — CMS canonical role guard (camada complementar).
 *
 * Mesmo desenho aprovado em G-B.1..G-B.5 / G-C.1, aplicado EXCLUSIVAMENTE ao alvo
 * cms/routes.ts (literal staffAuth:13). Papel mínimo REAL determinado por leitura do
 * módulo: `requireRole('admin', 'manager')` em TODAS as rotas (sem subseto admin-only,
 * sem rota pública) => mínimo canônico = manager (e NÃO admin por analogia a G-C.1).
 *
 * O array legado PERMANECE; este guard e o TERCEIRO elemento, rodando SOMENTE apos o
 * requireRole legado em cada rota `...staffAuth`. Flag WS15_MEMBERSHIP_AUTHORITY
 * OFF/ausente => next() (legacy governa, S8 preservado bit-a-bit). Flag ON: exige
 * membership verificada + role >= manager. Ausência/erro/unconfigured => 403
 * fail-closed. Enterprise vem EXCLUSIVAMENTE de authorizedEnterpriseContext (D10).
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
export function createRequireCmsManager(
  repository: PgEnterpriseUsersRepository = defaultRepository,
) {
  return async function requireCmsManagerGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
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

/** Guard canonico CMS montado no array staffAuth (default unconfigured — fail-closed com flag ON). */
export const requireCmsManager = createRequireCmsManager();
