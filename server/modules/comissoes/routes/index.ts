import { Router, type Request } from 'express';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import {
  comissoesAprovarSugestaoSchema,
  comissoesConfigSchema,
  comissoesRejeitarSugestaoSchema,
  comissoesSimularQuerySchema,
  comissoesSolicitarAprovacaoSchema,
  comissoesSugestaoIaSchema,
} from '../schema';
import { comissoesService, simularComissoes } from '../services/comissoes.service';
import { sugerirPercentuaisComissoes } from '../services/comissoes-ia-suggest';

const router = Router();

const parceiroAuth = [authenticateJwt, requireRole('anfitriao', 'corretor', 'admin', 'manager')];
const adminAuth = [authenticateJwt, requireRole('admin')];
const staffComissaoAuth = [authenticateJwt, requireRole('admin', 'manager')];

const PREVIEW_OVERRIDE_KEYS = [
  'taxaPlataformaPct',
  'taxaCorretorPct',
  'taxaHospedePct',
  'taxaHospedeAtiva',
] as const;

function queryHasPreviewOverrides(query: Record<string, unknown>): boolean {
  return PREVIEW_OVERRIDE_KEYS.some((k) => query[k] !== undefined);
}

function requireUserId(req: Request): number {
  const userId = req.user?.id;
  if (typeof userId !== 'number') {
    throw new Error('Usuário não autenticado');
  }
  return userId;
}

router.get('/health', (_req, res) => {
  res.json({ module: 'comissoes', status: 'ok' });
});

router.get('/minhas-comissoes', ...parceiroAuth, async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const data = await comissoesService.listarMinhas(requireUserId(req), page, pageSize);
    const config = await comissoesService.getConfig();
    res.json({
      success: true,
      data: {
        ...data,
        moduloAtivo: config.comissoesModuloAtivo,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/config', ...adminAuth, async (_req, res) => {
  try {
    const data = await comissoesService.getConfig();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.put('/config', ...adminAuth, async (req, res) => {
  try {
    const atual = await comissoesService.getConfig();
    const body = req.body ?? {};
    const parsed = comissoesConfigSchema.safeParse({
      comissoesModuloAtivo: body.comissoesModuloAtivo ?? atual.comissoesModuloAtivo,
      taxaPlataformaPct: body.taxaPlataformaPct ?? atual.taxaPlataformaPct,
      taxaCorretorPct: body.taxaCorretorPct ?? atual.taxaCorretorPct,
      taxaHospedePct: body.taxaHospedePct ?? atual.taxaHospedePct,
      taxaHospedeAtiva: body.taxaHospedeAtiva ?? atual.taxaHospedeAtiva,
      taxaHospedeNome: body.taxaHospedeNome ?? atual.taxaHospedeNome,
      taxaHospedeDescricao: body.taxaHospedeDescricao ?? atual.taxaHospedeDescricao,
    });
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }
    if (body.fonte === 'ia') {
      return res.status(400).json({
        success: false,
        error:
          'Alterações via IA devem passar por solicitar-aprovacao e aprovar-sugestao (governança em duas etapas).',
      });
    }
    const data = await comissoesService.salvarConfig(parsed.data, { fonte: 'manual' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/sugerir-percentuais', ...adminAuth, async (req, res) => {
  try {
    const parsed = comissoesSugestaoIaSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }
    const sugestao = await sugerirPercentuaisComissoes(parsed.data);
    res.json({ success: true, data: sugestao });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/solicitar-aprovacao', ...adminAuth, async (req, res) => {
  try {
    const parsed = comissoesSolicitarAprovacaoSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }
    const data = await comissoesService.solicitarAprovacao(parsed.data, requireUserId(req));
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/aprovar-sugestao', ...adminAuth, async (req, res) => {
  try {
    const parsed = comissoesAprovarSugestaoSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }
    const data = await comissoesService.aprovarSugestao(requireUserId(req), parsed.data);
    res.json({ success: true, data });
  } catch (error) {
    const msg = (error as Error).message;
    const status = msg.includes('outro administrador') ? 403 : 400;
    res.status(status).json({ success: false, error: msg });
  }
});

router.post('/rejeitar-sugestao', ...adminAuth, async (req, res) => {
  try {
    const parsed = comissoesRejeitarSugestaoSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }
    const data = await comissoesService.rejeitarSugestao(requireUserId(req), parsed.data.motivo);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/lancamentos/gerar', ...staffComissaoAuth, async (req, res) => {
  try {
    const propostaId = Number(req.body?.propostaId);
    if (!Number.isFinite(propostaId) || propostaId <= 0) {
      return res.status(400).json({ success: false, error: 'propostaId inválido' });
    }
    const result = await comissoesService.gerarLancamentos(propostaId);
    if (!result.generated && 'reason' in result && result.reason === 'proposta_status_blocked') {
      return res.status(409).json({
        success: false,
        code: result.reason,
        error: 'message' in result ? result.message : 'Proposta não paga',
        statusProposta: 'statusProposta' in result ? result.statusProposta : undefined,
      });
    }
    if (!result.generated && 'reason' in result) {
      const reason = result.reason;
      const status =
        reason === 'proposta_not_found'
          ? 404
          : reason === 'module_disabled'
            ? 503
            : 400;
      return res.status(status).json({ success: false, code: reason, data: result });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/simular', ...parceiroAuth, async (req, res) => {
  try {
    const parsed = comissoesSimularQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }

    const hasOverrides = queryHasPreviewOverrides(req.query as Record<string, unknown>);
    if (hasOverrides || parsed.data.preview) {
      const role = req.user?.role;
      if (role !== 'admin' && role !== 'manager') {
        return res.status(403).json({
          success: false,
          error: 'Preview com overrides de percentuais requer role admin ou manager',
        });
      }
    }

    const config = await comissoesService.getConfig();
    const data = simularComissoes(parsed.data, config);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
module.exports = router;
