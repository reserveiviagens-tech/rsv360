/**
 * WS-15 / G-C.9c.3 — Anfitrião Write Model D complementary guard.
 *
 * Alvo: mutações partner/master em acomodacoes/routes/anfitriao.routes.ts
 * via anfitriaoWriteAuth / anfitriaoMasterWriteAuth.
 *
 * NÃO montar em parceiroAuth/masterAuth compartilhados (READ 9c.2 usa arrays dedicados).
 * NÃO aplicar a staffAprovacao (OD-9c-A → anfitriao-staff.guard Modelo A).
 * NÃO aplicar a GETs Read (9c.2). NÃO alterar 9c.1 / G-C.9b.
 * NÃO tocar anfitriao.service helpers (OD-9c-B PRESERVE — sem HARDEN podeVer/cohost).
 *
 * Modelo D:
 *   Legacy Partner Auth (JWT + obterUnidade / podeGerenciar / podeEditar* existentes)
 *     + Enterprise Context (este guard, flag ON)
 *     + Economic surfaces remain in services (aplicarDesconto, pricing, etc.)
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

export function createRequireAnfitriaoWritePartner() {
  return async function requireAnfitriaoWritePartnerGuard(
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

export const requireAnfitriaoWritePartner = createRequireAnfitriaoWritePartner();
