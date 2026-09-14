import { Router } from 'express';
import { publicLimiter } from '../../../../../server/middleware/public-limiter';
import { portalCheckoutAuthMiddleware } from '../middleware/portal-checkout-auth.middleware';
import {
  CheckoutService,
  CheckoutBookingNotFoundError,
  CheckoutBookingNotPayableError,
} from '../services/checkout.service';
import { PublicCheckoutSessionSchema } from '../schemas/checkout-session.schema';
import { PaymentProviderNotConfiguredError } from '../services/payment.service';

const router = Router();
const checkoutService = new CheckoutService();

function checkoutErrorStatus(error: unknown): number {
  if (error instanceof CheckoutBookingNotFoundError) return 404;
  if (error instanceof CheckoutBookingNotPayableError) return 409;
  if (error instanceof PaymentProviderNotConfiguredError) return 503;
  return 500;
}

router.post(
  '/checkout/session',
  publicLimiter,
  portalCheckoutAuthMiddleware,
  async (req, res) => {
    try {
      const parsed = PublicCheckoutSessionSchema.parse(req.body);
      const result = await checkoutService.createPublicCheckoutSession(parsed);
      res.status(201).json(result);
    } catch (error) {
      if ((error as { name?: string }).name === 'ZodError') {
        return res.status(400).json({ error: 'Payload inválido' });
      }
      res.status(checkoutErrorStatus(error)).json({
        error: (error as Error).message,
        code: (error as { code?: string }).code,
      });
    }
  },
);

export default router;
module.exports = router;
