import { Router } from 'express';
import {
  authenticateJwt,
  requireRole,
} from '../../../../../server/middleware/auth.middleware';
import paymentRoutes from './payment.routes';
import customerRoutes from './customer.routes';
import pixRoutes from './pix.routes';
import subscriptionRoutes from './subscription.routes';
import refundRoutes from './refund.routes';
import disputeRoutes from './dispute.routes';
import webhookPublicRoutes from './webhook-public.routes';
import webhookStaffRoutes from './webhook-staff.routes';
import checkoutPublicRoutes from './checkout-public.routes';

const router = Router();

/** Explicit public: provider webhooks (signature verified in service). */
router.use('/webhooks', webhookPublicRoutes);

/** B2C checkout — portal token + booking ownership (no staff JWT). */
router.use('/public', checkoutPublicRoutes);

/**
 * Fail-closed: everything below requires staff JWT.
 * Roles: admin | manager only (money / PII).
 */
router.use(authenticateJwt);
router.use(requireRole('admin', 'manager'));

router.use('/payments', paymentRoutes);
router.use('/customers', customerRoutes);
router.use('/pix', pixRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/refunds', refundRoutes);
router.use('/disputes', disputeRoutes);
router.use('/webhooks', webhookStaffRoutes);

export default router;
module.exports = router;
