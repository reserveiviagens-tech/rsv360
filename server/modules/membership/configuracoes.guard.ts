/**
 * WS-15 / G-C.3 — Configuracoes canonical role guard (camada complementar).
 *
 * Mesmo desenho aprovado em G-B / G-C.1..G-C.2, aplicado EXCLUSIVAMENTE ao alvo
 * configuracoes/routes/index.ts (literal adminAuth:7). Papel mínimo REAL determinado
 * por leitura: `requireRole('admin')` => mínimo canônico = admin (módulo de configuração
 * global de propostas — sem subseto manager). /health é público (não usa o array).
 *
 * O array legado PERMANECE; este guard e o TERCEIRO elemento, rodando SOMENTE apos o
 * requireRole legado em cada rota `...adminAuth`. Flag WS15_MEMBERSHIP_AUTHORITY
 * OFF/ausente => next() (legacy governa, S8 preservado bit-a-bit). Flag ON: exige
 * membership verificada + role >= admin. Ausência/erro/unconfigured => 403 fail-closed.
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
export function createRequireConfigAdmin(
  repository: PgEnterpriseUsersRepository = defaultRepository,
) {
  return async function requireConfigAdminGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
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

/** Guard canonico Configuracoes montado no array adminAuth (default unconfigured — fail-closed). */
export const requireConfigAdmin = createRequireConfigAdmin();
