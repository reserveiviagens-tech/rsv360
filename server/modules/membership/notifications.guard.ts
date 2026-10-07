/**
 * WS-15 / G-C.4 — Notifications Settings canonical role guard (camada complementar).
 *
 * Mesmo desenho aprovado em G-B / G-C.1..G-C.3, aplicado EXCLUSIVAMENTE ao alvo
 * notifications/settings-routes.js (literal adminAuth:10). Papel mínimo REAL determinado
 * por leitura: `requireRole('admin', 'manager')` em TODAS as rotas do arquivo => mínimo
 * canônico = manager. Arquivos-irmãos (management-routes.js, routes.js) usam autorizadores
 * custom catalog/segredo interno, NÃO o literal => fora do escopo deste gate, intactos.
 *
 * O array legado PERMANECE; este guard e o TERCEIRO elemento, rodando SOMENTE apos o
 * requireRole legado em cada rota `...adminAuth`. Flag WS15_MEMBERSHIP_AUTHORITY
 * OFF/ausente => next() (legacy governa, S8 preservado bit-a-bit). Flag ON: exige
 * membership verificada + role >= manager. Ausência/erro/unconfigured => 403
 * fail-closed. Enterprise vem EXCLUSIVAMENTE de authorizedEnterpriseContext (D10).
 * Não toca o fail-closed de property scope (C36-ID-05 D1) do arquivo.
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
export function createRequireNotificationsSettingsManager(
  repository: PgEnterpriseUsersRepository = defaultRepository,
) {
  return async function requireNotificationsSettingsManagerGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
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

/** Guard canonico Notifications Settings montado no array adminAuth (default unconfigured — fail-closed). */
export const requireNotificationsSettingsManager = createRequireNotificationsSettingsManager();
