/**
 * WS-15 / G-C.7 — Logistica canonical role guard (camada complementar).
 *
 * Mesmo desenho aprovado em G-B / G-C.1..G-C.6, aplicado EXCLUSIVAMENTE ao alvo
 * logistica/routes/index.ts (consumidor do staffAuth compartilhado). Papel mínimo REAL
 * determinado por leitura: o array legado admite claim 'user' (o mais amplo) e o
 * mapeamento canônico é user -> viewer (rbac.mapping) => mínimo canônico = viewer.
 * asMoneyRecord do módulo é formatação de entrada, não operação econômica — fora da
 * fronteira financeira. /health é pública e não usa o array.
 *
 * O arquivo define um array LOCAL de mesmo nome com 3 elementos (SAME as shared,
 * SEM alterá-lo), rodando o guard SOMENTE apos o requireRole legado em cada rota
 * `...staffAuth`. Flag WS15_MEMBERSHIP_AUTHORITY OFF/ausente => next() (legacy governa,
 * S8 preservado bit-a-bit). Flag ON: exige membership verificada + role >= viewer.
 * Ausência/erro/unconfigured => 403 fail-closed. Enterprise vem EXCLUSIVAMENTE de
 * authorizedEnterpriseContext (D10).
 */
import type { NextFunction, Request, Response } from 'express';
import { isMembershipAuthorityEnabled } from './membership.plug';
import { PgEnterpriseUsersRepository } from './role-assignment.repository';
import { resolveCanonicalRoleContext } from './role-assignment.adapter';
import { requireEnterpriseRole } from './role.guards';

/** Repository sem runner = unconfigured (fail-closed); wiring real (Pool) = M-composition futura. */
const defaultRepository = new PgEnterpriseUsersRepository(null);

const guardViewer = requireEnterpriseRole('viewer');

/** Factory: permite injetar repository (testes/wiring futuro). Default = unconfigured (DENY com flag ON). */
export function createRequireLogisticaViewer(
  repository: PgEnterpriseUsersRepository = defaultRepository,
) {
  return async function requireLogisticaViewerGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      const outcome = guardViewer(ctx);
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

/** Guard canonico Logistica montado no array staffAuth local (default unconfigured — fail-closed). */
export const requireLogisticaViewer = createRequireLogisticaViewer();
