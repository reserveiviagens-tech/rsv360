import { Router } from 'express';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import { requireLogisticaViewer } from '../../membership/logistica.guard';
import { badRequest as badRequestShared } from '../../../lib/bad-request';
import { logisticaService } from '../services/logistica.service';
import {
  EmbarqueCreateSchema,
  FornecedorCreateSchema,
  FornecedorUpdateSchema,
  ReservaLogisticaCreateSchema,
  ReservaLogisticaUpdateSchema,
  TransporteCreateSchema,
  TransporteUpdateSchema,
  VoucherCreateSchema,
  VoucherUpdateSchema,
  parsePositiveIntId,
} from '../schemas/logistica-write.schema';

const router = Router();

// WS-15 G-C.7: composição LOCAL EQUIVALENTE ao array compartilhado staffAuth
// (auth.middleware:88), SEM alterá-lo: mesmos 2 primeiros elementos + guard canônico
// como 3º elemento. Mínimo real = viewer (mapeamento user -> viewer).
// Flag OFF => no-op; flag ON => membership verificada + role >= viewer.
// /health não usa staffAuth — intacta.
// NOTA DE DIVERGÊNCIA: se o array compartilhado mudar de roles, este literal deve ser
// reconciliado em gate próprio (never diverge silently).
const staffAuth = [authenticateJwt, requireRole('admin', 'manager', 'user'), requireLogisticaViewer];

function badRequest(res: import('express').Response, error: unknown) {
  return badRequestShared(res, error, { successEnvelope: true });
}

function asMoneyRecord(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...body };
  if (out.valor !== undefined && out.valor !== null) out.valor = String(out.valor);
  return out;
}

router.get('/health', (_req, res) => {
  res.json({ module: 'logistica', status: 'ok' });
});

router.get('/', ...staffAuth, async (_req, res) => {
  try {
    const data = await logisticaService.listSummary();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/transportes', ...staffAuth, async (_req, res) => {
  try {
    const data = await logisticaService.listTransportes();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/transportes', ...staffAuth, async (req, res) => {
  try {
    const body = TransporteCreateSchema.parse(req.body);
    const created = await logisticaService.createTransporte(body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.put('/transportes/:id', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const body = TransporteUpdateSchema.parse(req.body);
    const updated = await logisticaService.updateTransporte(id, body);
    if (!updated) return res.status(404).json({ success: false, error: 'Transporte não encontrado' });
    res.json({ success: true, data: updated });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.get('/embarques', ...staffAuth, async (req, res) => {
  try {
    const data = await logisticaService.listEmbarques(
      req.query.travel_package_id ? Number(req.query.travel_package_id) : undefined,
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/embarques', ...staffAuth, async (req, res) => {
  try {
    const body = EmbarqueCreateSchema.parse(req.body);
    const created = await logisticaService.createEmbarque(body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.get('/fornecedores', ...staffAuth, async (_req, res) => {
  try {
    const data = await logisticaService.listFornecedores();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/fornecedores', ...staffAuth, async (req, res) => {
  try {
    const body = FornecedorCreateSchema.parse(req.body);
    const created = await logisticaService.createFornecedor(body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.put('/fornecedores/:id', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const body = FornecedorUpdateSchema.parse(req.body);
    const updated = await logisticaService.updateFornecedor(id, body);
    if (!updated) return res.status(404).json({ success: false, error: 'Fornecedor não encontrado' });
    res.json({ success: true, data: updated });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.get('/reservas', ...staffAuth, async (_req, res) => {
  try {
    const data = await logisticaService.listReservas();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/reservas', ...staffAuth, async (req, res) => {
  try {
    const body = asMoneyRecord(ReservaLogisticaCreateSchema.parse(req.body));
    const created = await logisticaService.createReserva(body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.put('/reservas/:id', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const body = asMoneyRecord(ReservaLogisticaUpdateSchema.parse(req.body));
    const updated = await logisticaService.updateReserva(id, body);
    if (!updated) return res.status(404).json({ success: false, error: 'Reserva não encontrada' });
    res.json({ success: true, data: updated });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.get('/vouchers', ...staffAuth, async (_req, res) => {
  try {
    const data = await logisticaService.listVouchers();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/vouchers', ...staffAuth, async (req, res) => {
  try {
    const body = VoucherCreateSchema.parse(req.body);
    const created = await logisticaService.createVoucher(body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    return badRequest(res, error);
  }
});

router.put('/vouchers/:id', ...staffAuth, async (req, res) => {
  try {
    const id = parsePositiveIntId(req.params.id);
    const body = VoucherUpdateSchema.parse(req.body);
    const updated = await logisticaService.updateVoucher(id, body);
    if (!updated) return res.status(404).json({ success: false, error: 'Voucher não encontrado' });
    res.json({ success: true, data: updated });
  } catch (error) {
    return badRequest(res, error);
  }
});

export default router;
module.exports = router;
