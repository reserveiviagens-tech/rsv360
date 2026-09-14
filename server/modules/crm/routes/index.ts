import { Router } from 'express';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import guestsRoutes from './guest-profiles.routes';
import loyaltyRoutes from './loyalty.routes';
import campaignsRoutes from './campaigns.routes';
import segmentsRoutes from './segments.routes';
import kpisRoutes from './kpis.routes';

const router = Router();

/** Explicit public: module health probe. */
router.get('/health', (_req, res) => {
  res.json({
    module: 'crm',
    status: 'ok',
    timestamp: new Date().toISOString(),
    /** Aruanda B6 — documented exception: CRM is not under /api/v1. */
    apiPrefix: '/api/crm',
    underApiV1: false,
    routes: {
      guests: '/api/crm/guests',
      loyalty: '/api/crm/loyalty',
      campaigns: '/api/crm/campaigns',
      segments: '/api/crm/segments',
      kpis: '/api/crm/kpis',
    },
  });
});

/** Fail-closed: staff JWT required for all CRM data routes. */
router.use(authenticateJwt);
router.use(requireRole('admin', 'manager'));

router.use((req, _res, next) => {
  const propertyId = (req as any).propertyId;
  if (propertyId !== undefined) {
    (req.query as any).property_id = (req.query as any).property_id || String(propertyId);
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      (req.body as any).property_id = (req.body as any).property_id || propertyId;
    }
  }
  next();
});

router.use('/guests', guestsRoutes);
router.use('/loyalty', loyaltyRoutes);
router.use('/campaigns', campaignsRoutes);
router.use('/segments', segmentsRoutes);
router.use('/kpis', kpisRoutes);

export function registerCrmRoutes(app: any) {
  // Canonical prefix — keep in sync with registerCrmModule (/api/crm, not /api/v1/crm).
  app.use('/api/crm', router);
}

export default router;

module.exports = router;
