/**
 * WS-15 / G-C.9a — Acomodacoes Sync canonical role guard (camada complementar).
 *
 * Mesmo desenho aprovado em G-B / G-C.1..G-C.8, aplicado EXCLUSIVAMENTE ao alvo
 * acomodacoes/routes/sync.routes.ts (array staffAuth:7). Papel mínimo REAL determinado
 * por leitura: `requireRole('admin', 'manager', 'user')` => mínimo canônico = viewer
 * (mapeamento user -> viewer). Escopo: sub-gate 9a (imports danificados no disco foram
 * verificados legíveis apenas para este arquivo + import.routes.ts).
 *
 * O array legado PERMANECE; este guard e o TERCEIRO elemento, rodando SOMENTE apos o
 * requireRole legado. Flag WS15_MEMBERSHIP_AUTHORITY OFF/ausente => next() (legacy
 * governa, S8 preservado bit-a-bit). Flag ON: exige membership verificada + role >=
 * viewer. Ausência/erro/unconfigured => 403 fail-closed. Enterprise vem EXCLUSIVAMENTE
 * de authorizedEnterpriseContext (D10).
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
export function createRequireAcomodacoesSyncViewer(
  repository: PgEnterpriseUsersRepository = defaultRepository,
) {
  return async function requireAcomodacoesSyncViewerGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
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

/** Guard canonico Acomodacoes Sync montado no array staffAuth local (default unconfigured — fail-closed). */
export const requireAcomodacoesSyncViewer = createRequireAcomodacoesSyncViewer();
