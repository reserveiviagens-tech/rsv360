import { Router } from 'express';
import { ZodError } from 'zod';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import { requireRelatoriosViewer } from '../../membership/relatorios.guard';
import { relatoriosService } from '../services/relatorios.service';
import {
  RelatorioSnapshotCreateSchema,
  RelatorioViewCreateSchema,
} from '../schemas/relatorio-write.schema';

const router = Router();

// WS-15 G-C.7: composição LOCAL EQUIVALENTE ao array compartilhado staffAuth
// (auth.middleware:88), SEM alterá-lo: mesmos 2 primeiros elementos + guard canônico
// como 3º elemento. Mínimo real = viewer (mapeamento user -> viewer).
// Flag OFF => no-op; flag ON => membership verificada + role >= viewer.
// /health não usa staffAuth — intacta.
// NOTA DE DIVERGÊNCIA: se o array compartilhado mudar de roles, este literal deve ser
// reconciliado em gate próprio (never diverge silently).
const staffAuth = [authenticateJwt, requireRole('admin', 'manager', 'user'), requireRelatoriosViewer];

router.get('/health', (_req, res) => {
  res.json({ module: 'relatorios', status: 'ok' });
});

router.get('/', ...staffAuth, async (_req, res) => {
  try {
    const data = await relatoriosService.getDashboard();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/dashboard', ...staffAuth, async (_req, res) => {
  try {
    const data = await relatoriosService.getDashboard();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/export/csv', ...staffAuth, async (req, res) => {
  try {
    const tipo = (req.query.tipo as string) || 'dashboard';
    const csv = await relatoriosService.exportCsv(tipo);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-${tipo}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/export/pdf', ...staffAuth, async (req, res) => {
  try {
    const tipo = (req.query.tipo as string) || 'dashboard';
    const html = await relatoriosService.exportPdfHtml(tipo);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-${tipo}.html"`);
    res.send(html);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/views', ...staffAuth, async (req, res) => {
  try {
    const data = await relatoriosService.listViews(req.query.user_id ? Number(req.query.user_id) : undefined);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/views/:id', ...staffAuth, async (req, res) => {
  try {
    const item = await relatoriosService.getView(Number(req.params.id));
    if (!item) return res.status(404).json({ success: false, error: 'View não encontrada' });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/views', ...staffAuth, async (req, res) => {
  try {
    const body = RelatorioViewCreateSchema.parse(req.body);
    const created = await relatoriosService.createView({ ...body, userId: req.user?.id });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
    }
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.put('/views/:id', ...staffAuth, async (req, res) => {
  try {
    const updated = await relatoriosService.updateView(Number(req.params.id), req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'View não encontrada' });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.delete('/views/:id', ...staffAuth, async (req, res) => {
  try {
    const deleted = await relatoriosService.deleteView(Number(req.params.id));
    if (!deleted) return res.status(404).json({ success: false, error: 'View não encontrada' });
    res.json({ success: true, data: deleted });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.get('/snapshots', ...staffAuth, async (req, res) => {
  try {
    const data = await relatoriosService.listSnapshots(
      req.query.view_id ? Number(req.query.view_id) : undefined,
    );
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/snapshots', ...staffAuth, async (req, res) => {
  try {
    const body = RelatorioSnapshotCreateSchema.parse(req.body);
    const created = await relatoriosService.createSnapshot({
      ...body,
      geradoPor: req.user?.id,
    });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
    }
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

export default router;
module.exports = router;
