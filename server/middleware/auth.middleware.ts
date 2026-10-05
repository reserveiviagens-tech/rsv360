import type { NextFunction, Request, Response } from 'express';

const { extractBearerToken, verifyAccessToken } = require('../../backend/src/api/v1/auth/jwt-verify');
const { getJwtSecret } = require('@rsv360/shared');
const { enforceDpopIfEnabled } = require('../../backend/src/api/v1/auth/dpop.service');
const { normalizeEnterpriseClaim } = require('../modules/multi-property/context/enterprise-claim');

/**
 * WS-04 / S6 (R8): `req.user.enterpriseId` = CLAIM DECLARADO, nao autoridade.
 * Normaliza via `normalizeEnterpriseClaim` (string bem-formada => como esta;
 * numero legado > 0 => `ent_<n>`; resto => `undefined`, nunca fallback).
 * Autoridade final: `req.authorizedEnterpriseContext` (resolver S4, R9).
 * JWT = identidade + intencao declarada (R7); JWT != prova de membership (I-04).
 */
function declaredEnterpriseId(payload: { enterpriseId?: unknown }): string | undefined {
  const declared = normalizeEnterpriseClaim(payload?.enterpriseId);
  return declared ? declared.key : undefined;
}

/** Valida Bearer JWT (API v1) e popula req.user. PR-10c-a1: DPoP when flag ON + cnf.jkt. */
export async function authenticateJwt(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Token ausente' });
  }

  const payload = verifyAccessToken(token, getJwtSecret());
  if (!payload || payload.userId == null) {
    return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
  }

  const dpop = await enforceDpopIfEnabled(req, token, payload);
  if (!dpop.ok) {
    return res.status(401).json({ success: false, error: 'DPoP inválido ou ausente' });
  }

  const id = Number(payload.userId);
  if (!Number.isFinite(id)) {
    return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
  }

  req.user = {
    id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    enterpriseId: declaredEnterpriseId(payload),
  };
  return next();
}

/** Autenticação opcional — não falha se token ausente. */
export async function optionalJwt(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (token) {
    const payload = verifyAccessToken(token, getJwtSecret());
    if (payload?.userId != null) {
      const dpop = await enforceDpopIfEnabled(req, token, payload);
      if (!dpop.ok) {
        return res.status(401).json({ success: false, error: 'DPoP inválido ou ausente' });
      }
      const id = Number(payload.userId);
      if (!Number.isFinite(id)) {
        return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
      }
      req.user = {
        id,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        enterpriseId: declaredEnterpriseId(payload),
      };
    }
  }
  return next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    return next();
  };
}

export const staffAuth = [authenticateJwt, requireRole('admin', 'manager', 'user')];

module.exports = { authenticateJwt, optionalJwt, requireRole, staffAuth };
