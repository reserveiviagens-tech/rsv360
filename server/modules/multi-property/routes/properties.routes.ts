import { Router } from 'express';
import { badRequest as badRequestShared } from '../../../lib/bad-request';
import { propertyService } from '../services';
import {
  PropertyAddUserSchema,
  PropertyCreateSchema,
  PropertySettingsWriteSchema,
  PropertySwitchSchema,
  PropertyUpdateSchema,
  PropertyUpdateUserRoleSchema,
  parsePositiveIntId,
  parsePositiveIntParam,
} from '../schemas/multi-property-write.schema';

const router = Router();

function badRequest(res: import('express').Response, error: unknown) {
  return badRequestShared(res, error, { successEnvelope: true });
}

/**
 * C36-ID-07 (D1/D2) — `req.user.id` is the SOLE identity source.
 *
 * Previously these routes read `req.query.userId` / `body.userId` and finally
 * fell back to the literal user id 1. That allowed impersonation of any user
 * and, on POST /, granted real `owner` membership to user 1.
 *
 * D1: no client-supplied identity is honoured.
 * D2: an absent or invalid principal is 401 UNAUTHENTICATED — never a default.
 */
function requireActorId(req: import('express').Request, res: import('express').Response) {
  const raw = (req as { user?: { id?: unknown } }).user?.id;
  const actorId = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(actorId) || actorId <= 0) {
    res.status(401).json({
      success: false,
      error: 'Identidade ausente',
      code: 'UNAUTHENTICATED',
    });
    return null;
  }
  return actorId;
}

router.get('/', async (req, res) => {
  const userId = requireActorId(req, res);
  if (userId === null) return;
  res.json({ success: true, data: await propertyService.listMyProperties(userId) });
});

router.get('/consolidated', async (req, res) => {
  const userId = requireActorId(req, res);
  if (userId === null) return;
  res.json({ success: true, data: await propertyService.getConsolidated(userId) });
});

router.post('/switch', async (req, res) => {
  try {
    const body = PropertySwitchSchema.parse(req.body);
    // D1: the actor comes from the session only. `userId`/`user_id` are no
    // longer part of the schema, so sending them is a 400 (strict mode).
    const userId = requireActorId(req, res);
    if (userId === null) return;
    const propertyId = Number(body.propertyId ?? body.property_id);
    res.json({ success: true, data: { userId, propertyId } });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.post('/', async (req, res) => {
  try {
    // D1/D2: owner_id is derived exclusively from the authenticated actor.
    // It feeds `addUserToProperty(id, ownerId, 'owner')`, so a default here
    // would grant real ownership to an unrelated user.
    const ownerId = requireActorId(req, res);
    if (ownerId === null) return;
    const body = PropertyCreateSchema.parse(req.body);
    const property = await propertyService.create(ownerId, body);
    res.status(201).json({ success: true, data: property });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const property = await propertyService.get(id);
    if (!property) return res.status(404).json({ success: false, error: 'Propriedade não encontrada' });
    res.json({ success: true, data: property });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const body = PropertyUpdateSchema.parse(req.body);
    const property = await propertyService.update(id, body);
    if (!property) return res.status(404).json({ success: false, error: 'Propriedade não encontrada' });
    res.json({ success: true, data: property });
  } catch (error) {
    return badRequest(res, error);
  }
});

/** SKIP body: DELETE property — soft-delete flag only. */
router.delete('/:id', async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    res.json({ success: true, deleted: await propertyService.delete(id) });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.get('/:id/stats', async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    res.json({ success: true, data: await propertyService.getStats(id) });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.get('/:id/users', async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    res.json({ success: true, data: await propertyService.listUsers(id) });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.post('/:id/users', async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const body = PropertyAddUserSchema.parse(req.body);
    const userId = Number(body.userId ?? body.user_id);
    const user = await propertyService.addUser(id, userId, body.role || 'staff');
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.put('/:id/users/:uid', async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const uid = parsePositiveIntParam(req.params.uid, 'uid');
    const body = PropertyUpdateUserRoleSchema.parse(req.body);
    const user = await propertyService.updateUserRole(id, uid, body.role);
    if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    res.json({ success: true, data: user });
  } catch (error) {
    return badRequest(res, error);
  }
});

/** SKIP body: DELETE user link — no write payload. */
router.delete('/:id/users/:uid', async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const uid = parsePositiveIntParam(req.params.uid, 'uid');
    res.json({ success: true, deleted: await propertyService.removeUser(id, uid) });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.get('/:id/settings', async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const property = await propertyService.get(id);
    res.json({ success: true, data: property?.settings || {} });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.put('/:id/settings', async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const body = PropertySettingsWriteSchema.parse(req.body ?? {});
    const property = await propertyService.update(id, {
      settings: (body as { settings: Record<string, unknown> }).settings,
    });
    res.json({ success: true, data: property?.settings || {} });
  } catch (error) {
    return badRequest(res, error);
  }
});

export default router;
