import { Router } from 'express';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import { requireFornecedoresAdmin } from '../../membership/fornecedores-hub.guard';
import { invalidarCache, resolverOfertas } from '../resolver';
import { ConflictError } from '../lock';
import { reservarVaga } from '../services/reservar-vaga';
import { fornecedoresApiService } from '../services/fornecedores-api.service';
import { asRequiredString } from '../../../lib/parse';

const router = Router();
// WS-15 G-C.1: guard canônico COMPLEMENTAR como 3º elemento do array (roda após o
// requireRole legado em cada rota `...adminAuth`). Flag OFF => no-op (legacy governa);
// flag ON => membership verificada + role >= admin. /health permanece público (sem array).
const adminAuth = [authenticateJwt, requireRole('admin'), requireFornecedoresAdmin];

router.get('/health', (_req, res) => {
  res.json({ module: 'fornecedores-hub', status: 'ok' });
});

router.get('/', ...adminAuth, async (_req, res) => {
  try {
    const data = await fornecedoresApiService.list();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/', ...adminAuth, async (req, res) => {
  try {
    const { nome, tipo, endpoint, apiKey, adapter, prioridade, timeoutMs, ativo, config } = req.body;
    if (!nome || !tipo || !endpoint || !apiKey || !adapter) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes' });
    }
    const created = await fornecedoresApiService.create({
      nome,
      tipo,
      endpoint,
      apiKey,
      adapter,
      prioridade,
      timeoutMs,
      ativo,
      config,
    });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.patch('/:id', ...adminAuth, async (req, res) => {
  try {
    const updated = await fornecedoresApiService.update(asRequiredString(req.params.id), req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Fornecedor API não encontrado' });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/buscar', ...adminAuth, async (req, res) => {
  try {
    const destino = String(req.body?.destino ?? '');
    if (!destino) {
      return res.status(400).json({ success: false, error: 'destino obrigatório' });
    }
    const tipo = String(req.body?.tipo ?? 'hospedagem');
    const { ofertas, origem, chave } = await resolverOfertas(tipo, destino, req.body?.params ?? {});
    res.json({ success: true, data: ofertas, origem, chave });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/invalidar-cache', ...adminAuth, async (req, res) => {
  try {
    const destino = String(req.body?.destino ?? '');
    const tipo = String(req.body?.tipo ?? 'hospedagem');
    if (!destino) {
      return res.status(400).json({ success: false, error: 'destino obrigatório' });
    }
    const chave = await invalidarCache(tipo, destino);
    res.json({ success: true, chave });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/reservar-vaga', ...adminAuth, async (req, res) => {
  try {
    const parceiroId = String(req.body?.parceiroId ?? '');
    const ofertaId = String(req.body?.ofertaId ?? '');
    if (!parceiroId || !ofertaId) {
      return res.status(400).json({ success: false, error: 'parceiroId e ofertaId obrigatórios' });
    }
    const propostaId =
      req.body?.propostaId != null ? Number(req.body.propostaId) : undefined;
    const data = await reservarVaga({ parceiroId, ofertaId, propostaId });
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof ConflictError) {
      return res.status(409).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
