import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../../../../../server/modules/guest-portal/services/token.service';
import { getBookingIdentifier } from '../../../../../server/modules/guest-portal/db/portal.repository';

function extractPortalToken(req: Request, bodyToken?: string): string | null {
  const headerToken = req.header('X-Portal-Token');
  if (headerToken?.trim()) return headerToken.trim();
  if (bodyToken?.trim()) return bodyToken.trim();

  const queryToken = typeof req.query.token === 'string' ? req.query.token.trim() : null;
  if (queryToken) return queryToken;

  return null;
}

export async function portalCheckoutAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const bookingId = Number((req.body as { bookingId?: unknown })?.bookingId);
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return res.status(400).json({ error: 'bookingId inválido' });
    }

    const portalToken = extractPortalToken(
      req,
      (req.body as { portalToken?: string })?.portalToken,
    );
    if (!portalToken) {
      return res.status(401).json({ error: 'Token de portal obrigatório' });
    }

    const result = await tokenService.validateToken(portalToken);
    if (!result) {
      return res.status(401).json({ error: 'Token de portal inválido ou expirado' });
    }

    const tokenBookingId = getBookingIdentifier(result.booking);
    if (!tokenBookingId || String(tokenBookingId) !== String(bookingId)) {
      return res.status(403).json({ error: 'Token não autorizado para esta reserva' });
    }

    (req as Request & { portalBooking?: unknown }).portalBooking = result.booking;
    next();
  } catch {
    return res.status(401).json({ error: 'Token de portal inválido ou expirado' });
  }
}

module.exports = { portalCheckoutAuthMiddleware };
