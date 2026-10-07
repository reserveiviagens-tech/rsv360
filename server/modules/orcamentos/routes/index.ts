import { Router } from 'express';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import { requireOrcamentosViewer } from '../../membership/orcamentos.guard';
import { badRequest as badRequestShared } from '../../../lib/bad-request';
import { orcamentosService } from '../services/orcamentos.service';
import {
  OrcamentoCreateSchema,
  OrcamentoItemCreateSchema,
  OrcamentoItemUpdateSchema,
  OrcamentoUpdateSchema,
  parsePositiveIntId,
  parsePositiveIntParam,
} from '../schemas/orcamentos-write.schema';

const router = Router();

// WS-15 G-C.8: composição LOCAL EQUIVALENTE ao array compartilhado staffAuth
// (auth.middleware:88), SEM alterá-lo: mesmos 2 primeiros elementos + guard canônico
// como 3º elemento. Mínimo real = viewer (mapeamento user -> viewer).
// Flag OFF => no-op; flag ON => membership verificada + role >= viewer.
// /health não usa staffAuth — intacta.
// NOTA DE DIVERGÊNCIA: se o array compartilhado mudar de roles, este literal deve ser
// reconciliado em gate próprio (never diverge silently).
const staffAuth = [authenticateJwt, requireRole('admin', 'manager', 'user'), requireOrcamentosViewer];

function badRequest(res: import('express').Response, error: unknown) {
  return badRequestShared(res, error, { successEnvelope: true });
}

function asMoneyRecord(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...body };
  for (const key of ['subtotal', 'desconto', 'impostos', 'total', 'precoUnitario', 'precoTotal'] as const) {
    if (out[key] !== undefined && out[key] !== null) out[key] = String(out[key]);
  }
  return out;
}

router.get('/health', (_req, res) => {
  res.json({ module: 'orcamentos', status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/', ...staffAuth, async (req, res) => {
  try {
    const data = await orcamentosService.list({
      status: req.query.status as string | undefined,
      enterpriseId: req.query.enterprise_id ? Number(req.query.enterprise_id) : undefined,
    });
    res.json({ success: true, data, total: data.length });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/', ...staffAuth, async (req, res) => {
  try {
    const body = asMoneyRecord(OrcamentoCreateSchema.parse(req.body));
    const created = await orcamentosService.create(body, req.user?.id);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.get('/:id', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const item = await orcamentosService.getById(id);
    if (!item) return res.status(404).json({ success: false, error: 'Orçamento não encontrado' });
    res.json({ success: true, data: item });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.put('/:id', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const body = asMoneyRecord(OrcamentoUpdateSchema.parse(req.body));
    const updated = await orcamentosService.update(id, body);
    if (!updated) return res.status(404).json({ success: false, error: 'Orçamento não encontrado' });
    res.json({ success: true, data: updated });
  } catch (error) {
    return badRequest(res, error);
  }
});

/** SKIP body: DELETE orçamento — no write payload. */
router.delete('/:id', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const deleted = await orcamentosService.remove(id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Orçamento não encontrado' });
    res.json({ success: true, data: deleted });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.post('/:id/itens', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const body = asMoneyRecord(OrcamentoItemCreateSchema.parse(req.body));
    const item = await orcamentosService.addItem(id, body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.put('/:id/itens/:itemId', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const itemId = parsePositiveIntParam(req.params.itemId, 'itemId');
    const body = asMoneyRecord(OrcamentoItemUpdateSchema.parse(req.body));
    const item = await orcamentosService.updateItem(id, itemId, body);
    if (!item) return res.status(404).json({ success: false, error: 'Item não encontrado' });
    res.json({ success: true, data: item });
  } catch (error) {
    return badRequest(res, error);
  }
});

/** SKIP body: DELETE item — no write payload. */
router.delete('/:id/itens/:itemId', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const itemId = parsePositiveIntParam(req.params.itemId, 'itemId');
    const deleted = await orcamentosService.removeItem(id, itemId);
    if (!deleted) return res.status(404).json({ success: false, error: 'Item não encontrado' });
    res.json({ success: true, data: deleted });
  } catch (error) {
    return badRequest(res, error);
  }
});

/** SKIP body: converter-proposta uses only auth user id. */
router.post('/:id/converter-proposta', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const proposta = await orcamentosService.convertToProposta(id, req.user?.id);
    res.status(201).json({ success: true, data: proposta });
  } catch (error) {
    return badRequest(res, error);
  }
});

export default router;
module.exports = router;
