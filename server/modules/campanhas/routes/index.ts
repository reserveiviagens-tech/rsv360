import { Router } from 'express';
import { optionalJwt, authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import { requireCampanhasViewer } from '../../membership/campanhas.guard';
import { badRequest as badRequestShared } from '../../../lib/bad-request';
import { campanhasViagemService } from '../services/campanhas.service';
import {
  CampanhaCreateSchema,
  CampanhaUpdateSchema,
  CupomCreateSchema,
  CupomUpdateSchema,
  CupomUsoSchema,
  CupomValidarSchema,
  parsePositiveIntId,
} from '../schemas/campanhas-write.schema';

const router = Router();

// WS-15 G-C.5: composição LOCAL EQUIVALENTE ao array compartilhado staffAuth
// (auth.middleware:88), SEM alterá-lo: mesmos 2 primeiros elementos + guard canônico
// como 3º elemento. Mínimo real = viewer (mapeamento user -> viewer).
// Flag OFF => no-op; flag ON => membership verificada + role >= viewer.
// /health e POST /cupons/validar (optionalJwt) não usam staffAuth — intactos.
// NOTA DE DIVERGÊNCIA: se o array compartilhado mudar de roles, este literal deve ser
// reconciliado em gate próprio (never diverge silently).
const staffAuth = [authenticateJwt, requireRole('admin', 'manager', 'user'), requireCampanhasViewer];

function badRequest(res: import('express').Response, error: unknown) {
  return badRequestShared(res, error, { successEnvelope: true });
}

function asMoneyRecord(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...body };
  for (const key of ['orcamento', 'gastoAtual', 'valorDesconto'] as const) {
    if (out[key] !== undefined && out[key] !== null) out[key] = String(out[key]);
  }
  return out;
}

router.get('/health', (_req, res) => {
  res.json({ module: 'campanhas-viagem', status: 'ok' });
});

router.get('/metricas', ...staffAuth, async (req, res) => {
  try {
    const data = await campanhasViagemService.getMetricas(
      req.query.enterprise_id ? Number(req.query.enterprise_id) : undefined,
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/cupons', ...staffAuth, async (_req, res) => {
  try {
    const data = await campanhasViagemService.listCupons();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** Static before /cupons/:id — defense in depth. */
router.post('/cupons/validar', optionalJwt, async (req, res) => {
  try {
    const body = CupomValidarSchema.parse(req.body);
    const result = await campanhasViagemService.validarCupom(body.codigo);
    res.json({ success: true, data: result });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.post('/cupons', ...staffAuth, async (req, res) => {
  try {
    const body = asMoneyRecord(CupomCreateSchema.parse(req.body));
    const created = await campanhasViagemService.createCupom(body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.get('/cupons/:id', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const item = await campanhasViagemService.getCupom(id);
    if (!item) return res.status(404).json({ success: false, error: 'Cupom não encontrado' });
    res.json({ success: true, data: item });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.put('/cupons/:id', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const body = asMoneyRecord(CupomUpdateSchema.parse(req.body));
    const updated = await campanhasViagemService.updateCupom(id, body);
    if (!updated) return res.status(404).json({ success: false, error: 'Cupom não encontrado' });
    res.json({ success: true, data: updated });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.post('/cupons/:id/uso', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const body = CupomUsoSchema.parse(req.body);
    const uso = await campanhasViagemService.usarCupom(id, {
      clienteEmail: body.clienteEmail ?? undefined,
      bookingId: body.bookingId ?? undefined,
      valorDesconto: String(body.valorDesconto),
    });
    res.status(201).json({ success: true, data: uso });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.get('/', ...staffAuth, async (req, res) => {
  try {
    const data = await campanhasViagemService.listCampanhas(
      req.query.enterprise_id ? Number(req.query.enterprise_id) : undefined,
    );
    res.json({ success: true, data, total: data.length });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/', ...staffAuth, async (req, res) => {
  try {
    const body = asMoneyRecord(CampanhaCreateSchema.parse(req.body));
    const created = await campanhasViagemService.createCampanha(body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.get('/:id', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const item = await campanhasViagemService.getCampanha(id);
    if (!item) return res.status(404).json({ success: false, error: 'Campanha não encontrada' });
    res.json({ success: true, data: item });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.put('/:id', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const body = asMoneyRecord(CampanhaUpdateSchema.parse(req.body));
    const updated = await campanhasViagemService.updateCampanha(id, body);
    if (!updated) return res.status(404).json({ success: false, error: 'Campanha não encontrada' });
    res.json({ success: true, data: updated });
  } catch (error) {
    return badRequest(res, error);
  }
});

/** SKIP body: DELETE campanha — no write payload. */
router.delete('/:id', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const deleted = await campanhasViagemService.deleteCampanha(id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Campanha não encontrada' });
    res.json({ success: true, data: deleted });
  } catch (error) {
    return badRequest(res, error);
  }
});

export default router;
module.exports = router;
