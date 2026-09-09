import { Router, type Request } from 'express';
import { ZodError } from 'zod';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import { tarifaService } from '../services/tarifa.service';
import { anfitriaoService, type AuthContext } from '../services/anfitriao.service';
import { rateCalendarService } from '../services/rate-calendar.service';
import {
  TarifaCategoriaCreateSchema,
  TarifaRegraCreateSchema,
} from '../schemas/write-allowlist.schema';

const router = Router();
const parceiroAuth = [
  authenticateJwt,
  requireRole('anfitriao', 'corretor', 'agente', 'promotor', 'admin', 'manager'),
];
const masterAuth = [authenticateJwt, requireRole('anfitriao', 'admin', 'manager')];
const staffAuth = [authenticateJwt, requireRole('admin', 'manager')];

function authFromReq(req: Request): AuthContext {
  const userId = req.user?.id;
  if (typeof userId !== 'number') {
    throw new Error('Usuário não autenticado');
  }
  return { userId, role: req.user?.role ?? 'user' };
}

router.get('/config', ...staffAuth, async (_req, res) => {
  try {
    const data = await tarifaService.getConfig();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.patch('/config', ...staffAuth, async (req, res) => {
  try {
    const ativo = req.body?.tarifarioDinamicoAtivo === true;
    const data = await tarifaService.setConfig(ativo);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.get('/categorias', ...staffAuth, async (_req, res) => {
  try {
    const data = await tarifaService.listCategorias();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/categorias', ...staffAuth, async (req, res) => {
  try {
    const body = TarifaCategoriaCreateSchema.parse(req.body);
    const data = await tarifaService.criarCategoria({
      slug: body.slug,
      nome: body.nome,
      ...(body.descontoPercentual != null
        ? { descontoPercentual: String(body.descontoPercentual) }
        : {}),
      ...(body.ativo !== undefined ? { ativo: body.ativo } : {}),
      criadoPor: req.user?.id,
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
    }
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.patch('/categorias/:id', ...staffAuth, async (req, res) => {
  try {
    const data = await tarifaService.atualizarCategoria(Number(req.params.id), req.body ?? {});
    if (!data) return res.status(404).json({ success: false, error: 'Não encontrado' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.get('/temporadas', ...staffAuth, async (_req, res) => {
  try {
    const data = await tarifaService.listTemporadas();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/temporadas', ...staffAuth, async (req, res) => {
  try {
    const data = await tarifaService.criarTemporada(req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.get('/temporadas/:id/periodos', ...staffAuth, async (req, res) => {
  try {
    const data = await tarifaService.listPeriodos(Number(req.params.id));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/temporadas/:id/periodos', ...staffAuth, async (req, res) => {
  try {
    const data = await tarifaService.criarPeriodo({
      temporadaId: Number(req.params.id),
      dataInicio: req.body.dataInicio,
      dataFim: req.body.dataFim,
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.get('/regras', ...staffAuth, async (_req, res) => {
  try {
    const data = await tarifaService.listRegras();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/regras', ...staffAuth, async (req, res) => {
  try {
    const body = TarifaRegraCreateSchema.parse(req.body);
    const data = await tarifaService.criarRegra({
      ...body,
      valor: String(body.valor),
      criadoPor: req.user?.id,
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.flatten() });
    }
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.patch('/regras/:id', ...staffAuth, async (req, res) => {
  try {
    const data = await tarifaService.atualizarRegra(Number(req.params.id), req.body ?? {});
    if (!data) return res.status(404).json({ success: false, error: 'Não encontrado' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.delete('/regras/:id', ...staffAuth, async (req, res) => {
  try {
    await tarifaService.deletarRegra(Number(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.get('/simular', ...parceiroAuth, async (req, res) => {
  try {
    const acomodacaoId = Number(req.query.acomodacaoId);
    const data = String(req.query.data ?? '');
    const categoria = String(req.query.categoria ?? 'padrao');
    const previewRequested =
      req.query.preview === '1' || req.query.preview === 'true';
    if (!acomodacaoId || !data) {
      return res.status(400).json({ success: false, error: 'acomodacaoId e data obrigatórios' });
    }

    const role = req.user?.role ?? '';
    const isStaff = ['admin', 'manager'].includes(role);
    if (previewRequested && !isStaff) {
      return res.status(403).json({
        success: false,
        error: 'preview=1 restrito a admin/manager',
      });
    }
    if (!isStaff) {
      const scoped = await anfitriaoService.obterUnidade(authFromReq(req), acomodacaoId);
      if ('error' in scoped) {
        if (scoped.error === 'forbidden') {
          return res.status(403).json({ success: false, error: 'Acesso negado' });
        }
        return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
      }
    }

    const resultado = await tarifaService.resolverTarifa({
      acomodacaoId,
      data,
      categoriaSlug: categoria,
      preview: previewRequested && isStaff,
    });
    res.json({ success: true, data: resultado });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.get('/politica-desconto', ...parceiroAuth, async (req, res) => {
  try {
    const scope = req.query.scope ? String(req.query.scope) : undefined;
    const scopeId = req.query.scopeId != null ? String(req.query.scopeId) : undefined;
    const data = await rateCalendarService.getPoliticaDesconto(scope, scopeId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.put('/politica-desconto', ...masterAuth, async (req, res) => {
  try {
    const result = await rateCalendarService.upsertPoliticaDesconto(authFromReq(req), {
      scope: req.body?.scope || 'global',
      scopeId: req.body?.scopeId ?? null,
      maxDescontoPercentual: Number(req.body?.maxDescontoPercentual),
      maxDescontoAbsoluto:
        req.body?.maxDescontoAbsoluto != null ? Number(req.body.maxDescontoAbsoluto) : null,
      rolesPermitidos: Array.isArray(req.body?.rolesPermitidos)
        ? req.body.rolesPermitidos.map(String)
        : undefined,
      ativo: req.body?.ativo,
    });
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      return res.status(400).json({
        success: false,
        error: 'message' in result ? result.message : result.error,
      });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

export default router;
module.exports = router;
