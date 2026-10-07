/**
 * WS-15 / G-C.9c.2 — Anfitrião Read Model D complementary guard.
 *
 * Alvo: rotas GET de leitura em acomodacoes/routes/anfitriao.routes.ts
 * montadas via anfitriaoReadAuth / anfitriaoMasterReadAuth.
 *
 * NÃO montar em parceiroAuth/masterAuth compartilhados (vazaria para WRITE / 9c.3).
 * NÃO aplicar a GET .../ical.ics (token público — N/A membership).
 * NÃO aplicar a staffAprovacao (OD-9c-A → 9c.3 Modelo A).
 * NÃO alterar 9c.1 Index. NÃO reabrir G-C.9b.
 *
 * Modelo D (PA-DEC-005 / OD-9c-B PRESERVE):
 *   Legacy Partner Auth (JWT + obterUnidade / listagens / helpers)
 *     + Enterprise Context (este guard, flag ON)
 *     + Resource Binding permanece no handler/service (sem HARDEN)
 *
 * Flag OFF => next() (legado bit-a-bit).
 * Flag ON => fail-closed em authorizedEnterpriseContext.
 * Sem requireEnterpriseRole. Sem mapear anfitriao → Enterprise Role.
 */
import type { NextFunction, Request, Response } from 'express';
import { isMembershipAuthorityEnabled } from './membership.plug';

function hasFiniteEnterpriseId(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

export function createRequireAnfitriaoReadPartner() {
  return async function requireAnfitriaoReadPartnerGuard(
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

export const requireAnfitriaoReadPartner = createRequireAnfitriaoReadPartner();
