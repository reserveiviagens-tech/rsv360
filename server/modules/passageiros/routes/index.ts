import { Router } from 'express';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import { requirePassageirosViewer } from '../../membership/passageiros.guard';
import { badRequest as badRequestShared } from '../../../lib/bad-request';
import { passageirosService } from '../services/passageiros.service';
import {
  DocumentoSchema,
  FnrhCreateSchema,
  FnrhUpdateSchema,
  PassageiroCreateSchema,
  PassageiroExcursaoSchema,
  PassageiroUpdateSchema,
  parseNonNegativeIntParam,
  parsePositiveIntId,
  parsePositiveIntParam,
} from '../schemas/passageiros-write.schema';

const router = Router();

// WS-15 G-C.6: composição LOCAL EQUIVALENTE ao array compartilhado staffAuth
// (auth.middleware:88), SEM alterá-lo: mesmos 2 primeiros elementos + guard canônico
// como 3º elemento. Mínimo real = viewer (mapeamento user -> viewer).
// Flag OFF => no-op; flag ON => membership verificada + role >= viewer.
// /health não usa staffAuth — intacta.
// NOTA DE DIVERGÊNCIA: se o array compartilhado mudar de roles, este literal deve ser
// reconciliado em gate próprio (never diverge silently).
const staffAuth = [authenticateJwt, requireRole('admin', 'manager', 'user'), requirePassageirosViewer];

function badRequest(res: import('express').Response, error: unknown) {
  return badRequestShared(res, error, { successEnvelope: true });
}

/** Static /fnrh/:fnrhId before /:id catch-all for PUT. */
router.put('/fnrh/:fnrhId', ...staffAuth, async (req, res) => {
  try {
    const fnrhId = parsePositiveIntParam(req.params.fnrhId, 'fnrhId');
    const body = FnrhUpdateSchema.parse(req.body);
    const updated = await passageirosService.updateFnrh(fnrhId, body);
    if (!updated) return res.status(404).json({ success: false, error: 'FNRH não encontrado' });
    res.json({ success: true, data: updated });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.get('/health', (_req, res) => {
  res.json({ module: 'passageiros', status: 'ok' });
});

router.get('/', ...staffAuth, async (req, res) => {
  try {
    const data = await passageirosService.list(
      req.query.enterprise_id ? Number(req.query.enterprise_id) : undefined,
    );
    res.json({ success: true, data, total: data.length });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/', ...staffAuth, async (req, res) => {
  try {
    const body = PassageiroCreateSchema.parse(req.body);
    const created = await passageirosService.create(body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.get('/:id', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const item = await passageirosService.getById(id);
    if (!item) return res.status(404).json({ success: false, error: 'Passageiro não encontrado' });
    res.json({ success: true, data: item });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.put('/:id', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const body = PassageiroUpdateSchema.parse(req.body);
    const updated = await passageirosService.update(id, body);
    if (!updated) return res.status(404).json({ success: false, error: 'Passageiro não encontrado' });
    res.json({ success: true, data: updated });
  } catch (error) {
    return badRequest(res, error);
  }
});

/** SKIP body: DELETE passageiro — no write payload. */
router.delete('/:id', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const deleted = await passageirosService.remove(id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Passageiro não encontrado' });
    res.json({ success: true, data: deleted });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.post('/:id/documentos', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const body = DocumentoSchema.parse(req.body);
    const updated = await passageirosService.addDocumento(id, body);
    res.status(201).json({ success: true, data: updated });
  } catch (error) {
    return badRequest(res, error);
  }
});

/** SKIP body: DELETE documento — index only. */
router.delete('/:id/documentos/:index', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const index = parseNonNegativeIntParam(req.params.index, 'index');
    const updated = await passageirosService.removeDocumento(id, index);
    res.json({ success: true, data: updated });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.post('/:id/fnrh', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const body = FnrhCreateSchema.parse(req.body ?? {});
    const created = await passageirosService.createFnrh(id, body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.post('/:id/excursoes', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const body = PassageiroExcursaoSchema.parse(req.body);
    const linked = await passageirosService.linkExcursao(id, body);
    res.status(201).json({ success: true, data: linked });
  } catch (error) {
    return badRequest(res, error);
  }
});

export default router;
module.exports = router;
