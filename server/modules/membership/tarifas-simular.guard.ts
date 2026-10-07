/**
 * WS-15 / G-C.9b.3 — Tarifas Simular Model D complementary guard.
 *
 * Alvo ÚNICO: GET /simular em acomodacoes/routes/tarifas.routes.ts.
 * NÃO montar em `parceiroAuth` compartilhado (vazaria para 9b.4 GET politica).
 *
 * Modelo D (PA-DEC-005):
 *   Legacy Partner Auth (JWT requireRole + obterUnidade no handler)
 *     + Enterprise Context (este guard, flag ON)
 *     + Economic surface (resolverTarifa — permanece no handler)
 *
 * Flag WS15_MEMBERSHIP_AUTHORITY OFF/ausente => next() (legado 100%).
 * Flag ON => exige authorizedEnterpriseContext com membershipVerified e
 * internalEnterpriseId válido. Sem rank Enterprise Role. Sem mapear
 * anfitriao/corretor/agente/promotor → roles Enterprise. Sem escopo de
 * unidade aqui (Partner Authority permanece no handler). Sem conceder preview.
 */
import type { NextFunction, Request, Response } from 'express';
import { isMembershipAuthorityEnabled } from './membership.plug';

function hasFiniteEnterpriseId(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Factory sem dependências de role-repository: só prova Enterprise Context (D10).
 * Partner Authority continua no handler legado.
 */
export function createRequireTarifasSimularPartner() {
  return async function requireTarifasSimularPartnerGuard(
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
      if (
        !resolution ||
        resolution.membershipVerified !== true ||
        !hasFiniteEnterpriseId(resolution.internalEnterpriseId)
      ) {
        res.status(403).json({ success: false, error: 'Acesso negado' });
        return;
      }
      next();
    } catch {
      res.status(403).json({ success: false, error: 'Acesso negado' });
    }
  };
}

/** Guard Model D complementar — exclusivo de /simular. */
export const requireTarifasSimularPartner = createRequireTarifasSimularPartner();
