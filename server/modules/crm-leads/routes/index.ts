import { Router, type Request } from 'express';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import { bulkCreateLeadsBodySchema, createLeadBodySchema, patchLeadStatusBodySchema } from '../schema';
import {
  CrmLeadsNotFoundError,
  bulkCreateLeads,
  createLead,
  listLeadsAsync,
  updateLeadStatus,
} from '../services/crm-leads.service';

const router = Router();

const parceiroAuth = [
  authenticateJwt,
  requireRole('anfitriao', 'corretor', 'agente', 'promotor', 'admin', 'manager'),
];

function requireUserId(req: Request): number {
  const userId = req.user?.id;
  if (typeof userId !== 'number') {
    throw new Error('Usuário não autenticado');
  }
  return userId;
}

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

router.post('/bulk', ...parceiroAuth, async (req, res) => {
  try {
    const parsed = bulkCreateLeadsBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Payload inválido',
        details: parsed.error.flatten(),
      });
    }

    const userId = requireUserId(req);
    const result = await bulkCreateLeads(userId, parsed.data.items, parsed.data.idempotencyKey);
    const status = result.idempotentReplay ? 200 : 201;
    return res.status(status).json({
      success: true,
      data: {
        items: result.items,
        idempotentReplay: result.idempotentReplay,
        count: result.items.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/', ...parceiroAuth, async (req, res) => {
  try {
    const parsed = createLeadBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Payload inválido',
        details: parsed.error.flatten(),
      });
    }

    const userId = requireUserId(req);
    const created = await createLead(userId, parsed.data);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    return res.status(500).json({ success: false, error: (error as Error).message });
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