/**
 * WS-15 / G-B.5 — Payments canonical role guard (camada complementar, NAO substitui o legado).
 *
 * Mesmo desenho aprovado em G-B.1..G-B.4, aplicado EXCLUSIVAMENTE ao alvo
 * backend/server/modules/payments/routes/index.ts (S9 A-22, linha 32 — gate global
 * admin/manager de money/PII). O `requireRole('admin','manager')` legado PERMANECE;
 * este guard ADICIONA a exigencia canonica (enterprise_users + CanonicalRoleContext)
 * SOMENTE quando a flag WS15_MEMBERSHIP_AUTHORITY=true esta LIGADA. Flag OFF/ausente
 * => next() (legacy governa, S8 preservado bit-a-bit). Flag ON: sem membership
 * verificada ou sem role >= manager => 403 fail-closed.
 *
 * FINANCIAL BOUNDARY (G-B.5, AUTHORIZATION-ONLY): este guard altera SOMENTE autoridade
 * de acesso. NENHUM serviço de pagamento/gateway/earnings/ledger/payout/refund/split/
 * settlement é importado, chamado ou modificado — invariantes Payment→Earnings→Ledger→
 * Payout e RefundRequest→Decision→RefundService→EarningReversal→Ledger intactos.
 * Enterprise vem EXCLUSIVAMENTE de authorizedEnterpriseContext (D10); claim/body/query/
 * header/path nunca são autoridade.
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
export function createRequirePaymentsManager(
  repository: PgEnterpriseUsersRepository = defaultRepository,
) {
  return async function requirePaymentsManagerGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
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

/** Guard canonico Payments montado no gate global (default unconfigured — fail-closed com flag ON). */
export const requirePaymentsManager = createRequirePaymentsManager();
