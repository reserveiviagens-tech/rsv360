import { Router } from 'express';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import { patchLeadStatusBodySchema } from '../schema';
import {
  CrmLeadsNotFoundError,
  listLeadsAsync,
  updateLeadStatus,
} from '../services/crm-leads.service';

const router = Router();

const parceiroAuth = [
  authenticateJwt,
  requireRole('anfitriao', 'corretor', 'agente', 'promotor', 'admin', 'manager'),
];

router.get('/health', (_req, res) => {
  res.json({ module: 'crm-leads', status: 'ok' });
});

router.get('/', ...parceiroAuth, async (_req, res) => {
  try {
    const items = await listLeadsAsync();
    res.json({ success: true, data: { items } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.patch('/:id/status', ...parceiroAuth, async (req, res) => {
  try {
    const parsed = patchLeadStatusBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Payload inválido',
        details: parsed.error.flatten(),
      });
    }

    const updated = await updateLeadStatus(req.params.id, parsed.data.status);
    return res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof CrmLeadsNotFoundError) {
      return res.status(404).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
module.exports = router;