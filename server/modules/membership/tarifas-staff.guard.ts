/**
 * WS-15 / G-C.9b.1 — Tarifas Staff canonical role guard (camada complementar).
 *
 * Mesmo desenho aprovado em G-B / G-C.1..G-C.9a, aplicado EXCLUSIVAMENTE ao alvo
 * acomodacoes/routes/tarifas.routes.ts (array staffAuth: `requireRole('admin',
 * 'manager')`). Papel mínimo REAL determinado por leitura => mínimo canônico = manager.
 * Escopo: sub-gate G-C.9b.1 (rotas staffAuth apenas — NÃO /simular nem politica-desconto).
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
export function createRequireTarifasStaffManager(
  repository: PgEnterpriseUsersRepository = defaultRepository,
) {
  return async function requireTarifasStaffManagerGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
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

/** Guard canonico Tarifas Staff montado no array staffAuth local (default unconfigured — fail-closed). */
export const requireTarifasStaffManager = createRequireTarifasStaffManager();
