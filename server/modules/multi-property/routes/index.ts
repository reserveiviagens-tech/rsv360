import { Router } from 'express';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import { requirePropertyManager } from '../../membership/multi-property.guard';
import propertiesRoutes from './properties.routes';

const router = Router();

/** Explicit public: module health probe. */
router.get('/health', (_req, res) => {
  res.json({
    module: 'multi-property',
    status: 'ok',
    timestamp: new Date().toISOString(),
    routes: {
      properties: '/api/properties',
      consolidated: '/api/properties/consolidated',
    },
  });
});

/** Fail-closed: staff JWT required for property / user admin. */
router.use(authenticateJwt);
router.use(requireRole('admin', 'manager'));
// WS-15 G-B.3: camada canonica COMPLEMENTAR atras da flag WS15_MEMBERSHIP_AUTHORITY.
// Flag OFF => no-op (legacy governa); flag ON => exige membership verificada + role >= manager.
router.use(requirePropertyManager);

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

router.use('/', propertiesRoutes);

export function registerPropertyRoutes(app: any) {
  app.use('/api/properties', router);
}

export default router;

module.exports = router;
