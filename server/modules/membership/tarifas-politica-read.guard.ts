/**
 * WS-15 / G-C.9b.4 — Tarifas Politica Read Model D complementary guard.
 *
 * Alvo ÚNICO: GET /politica-desconto.
 * NÃO montar em `parceiroAuth` compartilhado (evita contaminação).
 * NÃO aplicar a PUT /politica-desconto (9b.5) nem a /simular (9b.3).
 *
 * Flag OFF => next() (legado).
 * Flag ON => Enterprise Context fail-closed (membershipVerified + internalEnterpriseId).
 * Partner / economic scoping de scope/scopeId permanece no handler (authorizePoliticaDescontoRead).
 */
import type { NextFunction, Request, Response } from 'express';
import { isMembershipAuthorityEnabled } from './membership.plug';

function hasFiniteEnterpriseId(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

export function createRequireTarifasPoliticaReadPartner() {
  return async function requireTarifasPoliticaReadPartnerGuard(
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

export const requireTarifasPoliticaReadPartner = createRequireTarifasPoliticaReadPartner();
