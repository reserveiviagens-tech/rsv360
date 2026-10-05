/**
 * C36-ID-04 — Property tenant identity hardening.
 *
 * SECURITY INVARIANTS enforced here:
 *   I1 — user identity derives ONLY from `req.user.id`. The `x-user-id` header is
 *        never an identity authority (it was: client could impersonate a user).
 *   I2 — no authenticated identity means no property authorization is granted.
 *   I3 — this middleware NEVER assigns a literal `propertyId = 1`.
 *   I4 — repository/service errors propagate; they are never converted into a
 *        default property.
 *
 * Deliberately out of scope (C36-ID-05): downstream `|| 1` fallbacks in the
 * notifications routes and the fail-open `tenant.service.ts` resolver.
 * Deliberately out of scope (I6): `/api/properties`, which is mounted BEFORE this
 * middleware and owns its own authenticateJwt + requireRole chain.
 */
import type { Request, Response, NextFunction } from 'express';
import { PropertyRepository } from '../db/property.repository';

/** Positive-integer guard. Rejects '', 'abc', 0, -1, 1.5, NaN, Infinity. */
function parsePropertyId(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

/**
 * I1: identity comes only from the authenticated session.
 * A non-finite or non-positive id is treated as NO identity, never coerced.
 */
function readAuthenticatedUserId(req: Request): number | null {
  const raw = (req as { user?: { id?: unknown } }).user?.id;
  if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) return raw;
  if (typeof raw === 'string' && /^\d+$/.test(raw)) {
    const parsed = Number(raw);
    if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export function createTenantMiddleware(repo: PropertyRepository) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestedPropertyId =
        req.header('x-property-id') ?? (req.query as { property_id?: unknown })?.property_id;

      // I2/I3: without an authenticated principal we grant no property scope.
      const userId = readAuthenticatedUserId(req);
      if (userId === null) {
        if (requestedPropertyId !== undefined) {
          // A property was demanded without any proven identity.
          return res
            .status(401)
            .json({ error: 'Identidade ausente', code: 'UNAUTHENTICATED' });
        }
        return next();
      }

      const propertyId = parsePropertyId(requestedPropertyId);
      if (requestedPropertyId !== undefined && propertyId === null) {
        return res
          .status(400)
          .json({ error: 'propertyId inválido', code: 'INVALID_PROPERTY_ID' });
      }

      if (propertyId !== null) {
        const hasAccess = await repo.validateUserAccess(propertyId, userId);
        if (!hasAccess) {
          return res.status(403).json({
            error: 'Sem acesso a esta propriedade',
            code: 'PROPERTY_ACCESS_DENIED',
          });
        }
        req.propertyId = propertyId;
        return next();
      }

      // No property requested: use the caller's own default, if any.
      // I3: an absent default stays absent — it is never turned into property 1.
      // C36-ID-05 (D3): the repository now returns `number | null`.
      const defaultPropertyId = await repo.getDefaultPropertyForUser(userId);
      if (typeof defaultPropertyId === 'number' && Number.isInteger(defaultPropertyId) && defaultPropertyId > 0) {
        req.propertyId = defaultPropertyId;
      }
      return next();
    } catch (error) {
      // I4: surface the failure. Never degrade into a default property.
      return next(error);
    }
  };
}
