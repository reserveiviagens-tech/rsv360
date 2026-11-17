import { Router, type Request } from 'express';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import { createDealBodySchema, patchDealStageBodySchema } from '../schema';
import {
  createDeal,
  DealsForbiddenError,
  DealsNotFoundError,
  listDealsAsync,
  updateDealStage,
} from '../services/deals.service';

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

function requireRoleStr(req: Request): string {
  const role = req.user?.role;
  if (typeof role !== 'string') {
    throw new Error('Usuário não autenticado');
  }
  return role;
}

router.get('/health', (_req, res) => {
  res.json({ module: 'deals', status: 'ok' });
});

router.get('/', ...parceiroAuth, async (_req, res) => {
  try {
    const items = await listDealsAsync();
    res.json({ success: true, data: { items } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/', ...parceiroAuth, async (req, res) => {
  try {
    const parsed = createDealBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Payload inválido',
        details: parsed.error.flatten(),
      });
    }

    const userId = requireUserId(req);
    const role = requireRoleStr(req);
    const created = await createDeal(userId, role, parsed.data);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error instanceof DealsForbiddenError) {
      return res.status(403).json({ success: false, error: error.message });
    }
    return res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.patch('/:id/stage', ...parceiroAuth, async (req, res) => {
  try {
    const parsed = patchDealStageBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Payload inválido',
        details: parsed.error.flatten(),
      });
    }

    const dealId = String(req.params.id ?? '').trim();
    if (!dealId) {
      return res.status(400).json({ success: false, error: 'id inválido' });
    }

    const userId = requireUserId(req);
    const role = requireRoleStr(req);
    const deal = await updateDealStage(userId, role, dealId, parsed.data.stage);
    res.json({ success: true, data: deal });
  } catch (error) {
    if (error instanceof DealsNotFoundError) {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error instanceof DealsForbiddenError) {
      return res.status(403).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;