/**
 * WS-15 / G-C.9b.5 — Tarifas Politica Write Model D complementary guard.
 *
 * Alvo ÚNICO: PUT /politica-desconto.
 * NÃO montar em masterAuth/parceiroAuth compartilhados.
 * NÃO aplicar a GET /politica-desconto (9b.4) nem /simular (9b.3).
 *
 * Flag OFF => next() (legado).
 * Flag ON => Enterprise Context fail-closed.
 * Binding econômico (admin/manager × anfitriao) fica no handler/scope.
 */
import type { NextFunction, Request, Response } from 'express';
import { isMembershipAuthorityEnabled } from './membership.plug';

function hasFiniteEnterpriseId(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

export function createRequireTarifasPoliticaWritePartner() {
  return async function requireTarifasPoliticaWritePartnerGuard(
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

export const requireTarifasPoliticaWritePartner = createRequireTarifasPoliticaWritePartner();
