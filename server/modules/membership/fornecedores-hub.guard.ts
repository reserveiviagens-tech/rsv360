/**
 * WS-15 / G-C.1 — Fornecedores Hub canonical role guard (camada complementar).
 *
 * Mesmo desenho aprovado em G-B.1..G-B.5, aplicado EXCLUSIVAMENTE ao alvo
 * fornecedores-hub/routes/index.ts (S9 A-10, literal adminAuth:10). O array
 * `adminAuth = [authenticateJwt, requireRole('admin')]` legado PERMANECE; este guard
 * e o TERCEIRO elemento do array, portanto roda SOMENTE apos o requireRole legado,
 * em cada rota que usa `...adminAuth` (a rota /health e publica e nao usa o array).
 *
 * Flag WS15_MEMBERSHIP_AUTHORITY OFF/ausente => next() (legacy governa, S8 preservado
 * bit-a-bit). Flag ON: exige membership verificada + role >= ADMIN (minimalidade:
 * catálogo legado deste módulo e apenas 'admin'). Ausência/erro/unconfigured => 403
 * fail-closed. Enterprise vem EXCLUSIVAMENTE de authorizedEnterpriseContext (D10).
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
export function createRequireFornecedoresAdmin(
  repository: PgEnterpriseUsersRepository = defaultRepository,
) {
  return async function requireFornecedoresAdminGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
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

/** Guard canonico Fornecedores Hub montado no array adminAuth (default unconfigured — fail-closed). */
export const requireFornecedoresAdmin = createRequireFornecedoresAdmin();
