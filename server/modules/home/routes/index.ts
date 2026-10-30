import { Router } from 'express';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import {
  assertHomeSection,
  HomeConflictError,
  HomeNotFoundError,
  HomeSectionsService,
  parseCreateItemPayload,
  parsePatchItemPayload,
  parsePlacementsPayload,
} from '../home-sections.service';
import {
  handleHomeMediaUpload,
  homeMediaUpload,
  homeMediaUploadErrorHandler,
} from '../home-upload';
import { HOME_SECTIONS } from '../../../../backend/src/db/schema/home-section-placements';

const router = Router();
const staffAuth = [authenticateJwt, requireRole('admin', 'manager')];

function isValidationError(message: string): boolean {
  return (
    message.startsWith('section inválida') ||
    message.includes('inválido') ||
    message.includes('inseguro') ||
    message.includes('duplicado') ||
    message.includes('máximo') ||
    message.includes('deve ser') ||
    message.includes('deve usar') ||
    message.includes('domínio não permitido') ||
    message.includes('excede') ||
    message.includes('path inválido') ||
    message.includes('nenhum campo')
  );
}

/** GET /api/v1/home/sections/:section — público (somente ativos). */
router.get('/sections/:section', async (req, res) => {
  try {
    assertHomeSection(String(req.params.section ?? ''));
    const data = await HomeSectionsService.listPublic(String(req.params.section));
    res.json({ success: true, data, meta: { sections: HOME_SECTIONS } });
  } catch (error) {
    const message = (error as Error).message;
    if (message.startsWith('section inválida')) {
      return res.status(400).json({ success: false, error: message });
    }
    res.status(500).json({ success: false, error: 'Erro ao listar seção' });
  }
});

/** GET /api/v1/home/admin/sections/:section — staff. */
router.get('/admin/sections/:section', ...staffAuth, async (req, res) => {
  try {
    assertHomeSection(String(req.params.section ?? ''));
    const data = await HomeSectionsService.listAdmin(String(req.params.section));
    res.json({ success: true, data });
  } catch (error) {
    const message = (error as Error).message;
    if (message.startsWith('section inválida')) {
      return res.status(400).json({ success: false, error: message });
    }
    res.status(500).json({ success: false, error: 'Erro ao listar seção (admin)' });
  }
});

/** PUT /api/v1/home/admin/sections/:section — staff; body: { items: PlacementInput[] }. */
router.put('/admin/sections/:section', ...staffAuth, async (req, res) => {
  try {
    assertHomeSection(String(req.params.section ?? ''));
    const items = parsePlacementsPayload(req.body ?? {});
    const data = await HomeSectionsService.replaceSection(String(req.params.section), items);
    res.json({ success: true, data });
  } catch (error) {
    const message = (error as Error).message;
    if (isValidationError(message)) {
      return res.status(400).json({ success: false, error: message });
    }
    res.status(500).json({ success: false, error: 'Erro ao salvar seção' });
  }
});

/** POST /api/v1/home/admin/sections/:section/items — cria item no fim da fila. */
router.post('/admin/sections/:section/items', ...staffAuth, async (req, res) => {
  try {
    assertHomeSection(String(req.params.section ?? ''));
    const input = parseCreateItemPayload(req.body ?? {});
    const data = await HomeSectionsService.createItem(String(req.params.section), input);
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof HomeConflictError) {
      return res.status(409).json({ success: false, error: error.message });
    }
    const message = (error as Error).message;
    if (isValidationError(message)) {
      return res.status(400).json({ success: false, error: message });
    }
    res.status(500).json({ success: false, error: 'Erro ao criar item' });
  }
});

/** PATCH /api/v1/home/admin/items/:id — atualização parcial. */
router.patch('/admin/items/:id', ...staffAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const patch = parsePatchItemPayload(req.body ?? {});
    const data = await HomeSectionsService.patchItem(id, patch);
    res.json({ success: true, data });
  } catch (error) {
    if (error instanceof HomeNotFoundError) {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error instanceof HomeConflictError) {
      return res.status(409).json({ success: false, error: error.message });
    }
    const message = (error as Error).message;
    if (isValidationError(message)) {
      return res.status(400).json({ success: false, error: message });
    }
    res.status(500).json({ success: false, error: 'Erro ao atualizar item' });
  }
});

/** DELETE /api/v1/home/admin/items/:id — remove fisicamente. */
router.delete('/admin/items/:id', ...staffAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await HomeSectionsService.deleteItem(id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof HomeNotFoundError) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Erro ao excluir item' });
  }
});

/**
 * POST /api/v1/home/admin/upload — multipart field `file`
 * optional fields: section, slugHint
 */
router.post(
  '/admin/upload',
  ...staffAuth,
  (req, res, next) => {
    homeMediaUpload(req, res, (err) => {
      if (err) return homeMediaUploadErrorHandler(err, req, res, next);
      return next();
    });
  },
  handleHomeMediaUpload,
);

export default router;
module.exports = router;
