import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import {
  createMembershipSchema,
  createPartnerSchema,
  listPartnersQuerySchema,
  partnerIdParamSchema,
  updatePartnerSchema,
} from '../schema';
import {
  PartnerConflictError,
  PartnerForbiddenError,
  PartnerNotFoundError,
  partnersService,
  type PartnerActor,
} from '../services/partners.service';

const router = Router();
const membershipIdParamSchema = z.string().uuid();

/** Fatia A authorization: JWT + staff roles only. */
const staffAuth = [authenticateJwt, requireRole('admin', 'manager')];

function requireActor(req: Request): PartnerActor {
  const id = req.user?.id;
  const role = req.user?.role;
  if (typeof id !== 'number' || typeof role !== 'string') {
    throw new PartnerForbiddenError('Usuário não autenticado');
  }
  return { id, role };
}

function mapError(res: Response, error: unknown) {
  if (error instanceof PartnerForbiddenError) {
    return res.status(403).json({ success: false, error: error.message });
  }
  if (error instanceof PartnerNotFoundError) {
    return res.status(404).json({ success: false, error: error.message });
  }
  if (error instanceof PartnerConflictError) {
    return res.status(409).json({ success: false, error: error.message });
  }
  console.error('[partners]', (error as Error)?.message ?? 'unknown error');
  return res.status(500).json({ success: false, error: 'Internal server error' });
}

router.get('/health', (_req, res) => {
  res.json({ module: 'partners', status: 'ok' });
});

router.post('/', ...staffAuth, async (req, res) => {
  try {
    const parsed = createPartnerSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }
    const data = await partnersService.create(requireActor(req), parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return mapError(res, error);
  }
});

router.get('/', ...staffAuth, async (req, res) => {
  try {
    const parsed = listPartnersQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }
    const data = await partnersService.list(requireActor(req), parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return mapError(res, error);
  }
});

router.get('/:id', ...staffAuth, async (req, res) => {
  try {
    const params = partnerIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ success: false, error: params.error.flatten() });
    }
    const data = await partnersService.getById(requireActor(req), params.data.id);
    return res.json({ success: true, data });
  } catch (error) {
    return mapError(res, error);
  }
});

router.patch('/:id', ...staffAuth, async (req, res) => {
  try {
    const params = partnerIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ success: false, error: params.error.flatten() });
    }
    const parsed = updatePartnerSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }
    const data = await partnersService.update(requireActor(req), params.data.id, parsed.data);
    return res.json({ success: true, data });
  } catch (error) {
    return mapError(res, error);
  }
});

router.get('/:id/memberships', ...staffAuth, async (req, res) => {
  try {
    const params = partnerIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ success: false, error: params.error.flatten() });
    }
    const data = await partnersService.listMemberships(requireActor(req), params.data.id);
    return res.json({ success: true, data });
  } catch (error) {
    return mapError(res, error);
  }
});

router.post('/:id/memberships', ...staffAuth, async (req, res) => {
  try {
    const params = partnerIdParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ success: false, error: params.error.flatten() });
    }
    const parsed = createMembershipSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }
    const data = await partnersService.createMembership(
      requireActor(req),
      params.data.id,
      parsed.data,
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return mapError(res, error);
  }
});

/**
 * IDOR-hardening read: membership must belong to the path partnerId.
 * Prevents cross-partner membership probing via forged IDs.
 */
router.get('/:id/memberships/:membershipId', ...staffAuth, async (req, res) => {
  try {
    const params = partnerIdParamSchema.safeParse({ id: req.params.id });
    if (!params.success) {
      return res.status(400).json({ success: false, error: params.error.flatten() });
    }
    const membershipIdParsed = membershipIdParamSchema.safeParse(req.params.membershipId);
    if (!membershipIdParsed.success) {
      return res.status(400).json({ success: false, error: membershipIdParsed.error.flatten() });
    }
    const data = await partnersService.getMembershipForPartner(
      requireActor(req),
      params.data.id,
      membershipIdParsed.data,
    );
    return res.json({ success: true, data });
  } catch (error) {
    return mapError(res, error);
  }
});

export default router;
module.exports = router;
