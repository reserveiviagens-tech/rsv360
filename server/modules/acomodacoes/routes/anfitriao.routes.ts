import { Router, type Request } from 'express';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import { normalizarListaDatas } from '../services/anfitriao-bulk.util';
import { anfitriaoService, type AuthContext } from '../services/anfitriao.service';
import { rateCalendarService } from '../services/rate-calendar.service';
import { desempenhoService } from '../services/desempenho.service';
import { parseAtivoFilter } from '../services/listing-ativo-filter.util';
import { parseBulkIds } from '../services/listing-desarquivar-bulk.util';
import {
  publicTrilhoUrl,
  trilhoThumbUpload,
  trilhoThumbUploadErrorHandler,
  writeGaleriaWebp,
  writeTrilhoWebp,
} from '../services/anfitriao-trilho-upload';

const router = Router();

const parceiroAuth = [
  authenticateJwt,
  requireRole('anfitriao', 'corretor', 'agente', 'promotor', 'admin', 'manager'),
];
const masterAuth = [authenticateJwt, requireRole('anfitriao', 'admin', 'manager')];
const staffAprovacao = [authenticateJwt, requireRole('admin', 'manager')];

function authFromReq(req: Request): AuthContext {
  const userId = req.user?.id;
  if (typeof userId !== 'number') {
    throw new Error('Usuário não autenticado');
  }
  return {
    userId,
    role: req.user?.role ?? 'user',
    email: typeof req.user?.email === 'string' ? req.user.email : undefined,
  };
}

router.get('/dashboard', ...parceiroAuth, async (req, res) => {
  try {
    const data = await anfitriaoService.dashboardKpis(authFromReq(req));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/desempenho', ...parceiroAuth, async (req, res) => {
  try {
    const mes = typeof req.query.mes === 'string' ? req.query.mes : undefined;
    const data = await desempenhoService.obterMetricas(authFromReq(req), mes);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/desempenho/relatorio.csv', ...parceiroAuth, async (req, res) => {
  try {
    const mes = typeof req.query.mes === 'string' ? req.query.mes : undefined;
    const csv = await desempenhoService.relatorioCsv(authFromReq(req), mes);
    const safeMes = (mes && /^\d{4}-\d{2}$/.test(mes) ? mes : 'atual').replace(/[^\d-]/g, '');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="desempenho-rsv360-${safeMes}.csv"`,
    );
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/impostos/export.csv', ...parceiroAuth, async (req, res) => {
  try {
    const ativo = parseAtivoFilter(req.query.ativo);
    if (ativo == null) {
      return res.status(400).json({ success: false, error: 'Parâmetro inválido' });
    }
    const csv = await anfitriaoService.exportImpostosCsv(authFromReq(req), { ativo });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="impostos-anfitriao-rsv360.csv"',
    );
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/unidades/desarquivar-bulk', ...parceiroAuth, async (req, res) => {
  try {
    const parsed = parseBulkIds(req.body?.ids);
    if ('error' in parsed) {
      return res.status(400).json({ success: false, error: parsed.error });
    }
    const rawMotivo = req.body?.motivo;
    if (rawMotivo !== undefined && rawMotivo !== null && typeof rawMotivo !== 'string') {
      return res.status(400).json({ success: false, error: 'Motivo deve ser texto' });
    }
    const motivo = typeof rawMotivo === 'string' ? rawMotivo : undefined;
    const result = await anfitriaoService.desarquivarUnidadesBulk(authFromReq(req), parsed, {
      motivo,
    });
    if ('error' in result) {
      return res.status(400).json({
        success: false,
        error: result.message ?? 'Motivo inválido',
      });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/unidades/:id/preview-link', ...parceiroAuth, async (req, res) => {
  try {
    const result = await anfitriaoService.criarPreviewLink(
      authFromReq(req),
      Number(req.params.id),
    );
    if ('error' in result) {
      if (result.error === 'not_found') {
        return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
      }
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    res.json({
      success: true,
      data: {
        url: result.data.url,
        expiresAt: result.data.expiresAt,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/unidades/:id/ical-token', ...masterAuth, async (req, res) => {
  try {
    const regenerate = Boolean(req.body?.regenerate);
    const result = await rateCalendarService.garantirIcalToken(
      authFromReq(req),
      Number(req.params.id),
      { regenerate },
    );
    if ('error' in result) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.put('/unidades/:id/ical-import', ...masterAuth, async (req, res) => {
  try {
    const url =
      req.body?.url === null || req.body?.url === ''
        ? null
        : typeof req.body?.url === 'string'
          ? req.body.url
          : undefined;
    if (url === undefined) {
      return res.status(400).json({ success: false, error: 'Informe url (string) ou null' });
    }
    const result = await rateCalendarService.salvarIcalImportUrl(
      authFromReq(req),
      Number(req.params.id),
      url,
    );
    if ('error' in result) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/unidades/:id/ical-import/sync', ...masterAuth, async (req, res) => {
  try {
    const result = await rateCalendarService.sincronizarIcalImport(
      authFromReq(req),
      Number(req.params.id),
    );
    if ('error' in result) {
      if (result.error === 'no_url') {
        return res.status(400).json({ success: false, error: 'Salve uma URL de calendário primeiro' });
      }
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      if (result.error === 'not_found') {
        return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
      }
      return res.status(502).json({
        success: false,
        error: 'message' in result ? result.message : 'Falha ao sincronizar calendário externo',
      });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.get('/unidades/:id/ical.ics', async (req, res) => {
  try {
    const token = String(req.query.token || '');
    if (!token || token.length < 16) {
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }
    const de = String(req.query.de || new Date().toISOString().slice(0, 10));
    const ateDate = new Date();
    ateDate.setMonth(ateDate.getMonth() + 6);
    const ate = String(req.query.ate || ateDate.toISOString().slice(0, 10));
    const result = await rateCalendarService.gerarIcalFeed(
      Number(req.params.id),
      token,
      de,
      ate,
    );
    if ('error' in result) {
      return res.status(404).json({ success: false, error: 'Feed não encontrado' });
    }
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="rsv360-${req.params.id}.ics"`);
    res.send(result.data);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/minhas', ...parceiroAuth, async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const ativo = parseAtivoFilter(req.query.ativo);
    if (ativo == null) {
      return res.status(400).json({ success: false, error: 'Parâmetro inválido' });
    }
    const data = await anfitriaoService.listarMinhas(authFromReq(req), page, pageSize, {
      ativo,
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/unidades/:id', ...parceiroAuth, async (req, res) => {
  try {
    const result = await anfitriaoService.obterUnidade(authFromReq(req), Number(req.params.id));
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.patch('/unidades/:id', ...parceiroAuth, async (req, res) => {
  try {
    const result = await anfitriaoService.atualizarUnidade(
      authFromReq(req),
      Number(req.params.id),
      req.body ?? {},
    );
    if (result.error === 'forbidden') {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    if (result.error === 'not_found') {
      return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
    }
    if (result.error === 'invalid_slug') {
      return res.status(400).json({ success: false, error: 'Slug inválido' });
    }
    if (result.error === 'slug_taken') {
      return res.status(409).json({ success: false, error: 'Slug já em uso' });
    }
    if (result.error === 'titulo_obrigatorio') {
      return res.status(400).json({
        success: false,
        error: 'Informe um título público com até 50 caracteres',
      });
    }
    if (result.error === 'titulo_muito_longo') {
      return res.status(400).json({
        success: false,
        error: 'Título público deve ter no máximo 50 caracteres',
      });
    }
    if (result.error === 'nome_interno_muito_longo') {
      return res.status(400).json({
        success: false,
        error: 'Nome interno deve ter no máximo 80 caracteres',
      });
    }
    if (result.error === 'tipo_propriedade_invalido') {
      return res.status(400).json({
        success: false,
        error:
          'message' in result && typeof result.message === 'string'
            ? result.message
            : 'Tipo de propriedade inválido',
      });
    }
    if (result.error === 'tipos_cama_invalido') {
      return res.status(400).json({
        success: false,
        error:
          'message' in result && typeof result.message === 'string'
            ? result.message
            : 'Tipos de cama inválidos',
      });
    }
    if (result.error === 'capacidade_invalida') {
      return res.status(400).json({
        success: false,
        error:
          'message' in result && typeof result.message === 'string'
            ? result.message
            : 'Capacidade de hóspedes inválida',
      });
    }
    if (result.error === 'descricao_invalida') {
      return res.status(400).json({
        success: false,
        error:
          'message' in result && typeof result.message === 'string'
            ? result.message
            : 'Descrição inválida',
      });
    }
    if (result.error === 'amenidades_invalidas') {
      return res.status(400).json({
        success: false,
        error:
          'message' in result && typeof result.message === 'string'
            ? result.message
            : 'Comodidades inválidas',
      });
    }
    if (result.error === 'acessibilidade_invalida') {
      return res.status(400).json({
        success: false,
        error:
          'message' in result && typeof result.message === 'string'
            ? result.message
            : 'Recursos de acessibilidade inválidos',
      });
    }
    if (result.error === 'use_dedicated_endpoints') {
      return res.status(400).json({
        success: false,
        error:
          'message' in result && typeof result.message === 'string'
            ? result.message
            : 'Use endpoints de coanfitriões',
      });
    }
    if (result.error === 'conjuntos_regras_invalido') {
      return res.status(400).json({
        success: false,
        error:
          'message' in result && typeof result.message === 'string'
            ? result.message
            : 'Conjuntos de regras inválidos',
      });
    }
    if ('error' in result && result.error) {
      return res.status(400).json({
        success: false,
        error:
          'message' in result && typeof result.message === 'string'
            ? result.message
            : String(result.error),
      });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/** Upload + convert (WebP 256) image for listings rail thumbnail. */
router.post(
  '/unidades/:id/trilho-thumb',
  ...parceiroAuth,
  (req, res, next) => {
    trilhoThumbUpload(req, res, (err: unknown) => {
      if (err) return trilhoThumbUploadErrorHandler(err, req, res, next);
      return next();
    });
  },
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const file = req.file;
      if (!file?.buffer) {
        return res.status(400).json({ success: false, error: 'Arquivo obrigatório (campo file)' });
      }
      const written = await writeTrilhoWebp(file.buffer, id);
      const host = req.get('host') || undefined;
      const absolute = publicTrilhoUrl(written.relativeUrl, host);
      const result = await anfitriaoService.definirTrilhoThumb(authFromReq(req), id, absolute);
      if ('error' in result) {
        if (result.error === 'forbidden') {
          return res.status(403).json({ success: false, error: 'Acesso negado' });
        }
        return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
      }
      res.json({
        success: true,
        data: {
          unidade: result.data,
          trilhoThumb: absolute,
          bytes: written.bytes,
        },
      });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  },
);

/**
 * Upload accessibility evidence photo — returns URL only (does not change rail thumb).
 * Host persists URLs in metadata.acessibilidade via PATCH unidade.
 */
router.post(
  '/unidades/:id/acessibilidade-foto',
  ...parceiroAuth,
  (req, res, next) => {
    trilhoThumbUpload(req, res, (err: unknown) => {
      if (err) return trilhoThumbUploadErrorHandler(err, req, res, next);
      return next();
    });
  },
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const scoped = await anfitriaoService.obterUnidade(authFromReq(req), id);
      if ('error' in scoped) {
        if (scoped.error === 'forbidden') {
          return res.status(403).json({ success: false, error: 'Acesso negado' });
        }
        return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
      }
      const file = req.file;
      if (!file?.buffer) {
        return res.status(400).json({ success: false, error: 'Arquivo obrigatório (campo file)' });
      }
      const written = await writeTrilhoWebp(file.buffer, id);
      const host = req.get('host') || undefined;
      const absolute = publicTrilhoUrl(written.relativeUrl, host);
      res.json({
        success: true,
        data: { url: absolute, bytes: written.bytes },
      });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  },
);

/** Upload photo into listing gallery (does not overwrite trilho thumb). */
router.post(
  '/unidades/:id/galeria-foto',
  ...parceiroAuth,
  (req, res, next) => {
    trilhoThumbUpload(req, res, (err: unknown) => {
      if (err) return trilhoThumbUploadErrorHandler(err, req, res, next);
      return next();
    });
  },
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const file = req.file;
      if (!file?.buffer) {
        return res.status(400).json({ success: false, error: 'Arquivo obrigatório (campo file)' });
      }
      const written = await writeGaleriaWebp(file.buffer, id);
      const host = req.get('host') || undefined;
      const absolute = publicTrilhoUrl(written.relativeUrl, host);
      const result = await anfitriaoService.adicionarFotoGaleria(authFromReq(req), id, absolute);
      if ('error' in result) {
        if (result.error === 'forbidden') {
          return res.status(403).json({ success: false, error: 'Acesso negado' });
        }
        return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
      }
      res.json({
        success: true,
        data: { unidade: result.data, url: absolute, bytes: written.bytes },
      });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  },
);

/** Reorder / remove / set cover / category / caption on gallery midia. */
router.patch('/unidades/:id/galeria', ...parceiroAuth, async (req, res) => {
  try {
    const removeUrl = typeof req.body?.removeUrl === 'string' ? req.body.removeUrl.trim() : undefined;
    const moveUrl = typeof req.body?.moveUrl === 'string' ? req.body.moveUrl.trim() : undefined;
    const setCapaUrl =
      typeof req.body?.setCapaUrl === 'string' ? req.body.setCapaUrl.trim() : undefined;
    const setCategoriaUrl =
      typeof req.body?.setCategoriaUrl === 'string' ? req.body.setCategoriaUrl.trim() : undefined;
    const setCaptionUrl =
      typeof req.body?.setCaptionUrl === 'string' ? req.body.setCaptionUrl.trim() : undefined;
    const direction =
      req.body?.direction === 'left' || req.body?.direction === 'right'
        ? (req.body.direction as 'left' | 'right')
        : undefined;
    const categoria =
      req.body?.categoria === null || req.body?.categoria === ''
        ? null
        : typeof req.body?.categoria === 'string'
          ? req.body.categoria.trim()
          : undefined;
    const caption =
      req.body?.caption === null || req.body?.caption === ''
        ? null
        : typeof req.body?.caption === 'string'
          ? req.body.caption.trim()
          : undefined;
    if (!removeUrl && !moveUrl && !setCapaUrl && !setCategoriaUrl && !setCaptionUrl) {
      return res.status(400).json({
        success: false,
        error: 'Informe removeUrl, moveUrl, setCapaUrl, setCategoriaUrl ou setCaptionUrl',
      });
    }
    const result = await anfitriaoService.atualizarMidiaEstrutura(authFromReq(req), Number(req.params.id), {
      removeUrl,
      moveUrl,
      direction,
      setCapaUrl,
      setCategoriaUrl,
      categoria: setCategoriaUrl ? (categoria ?? null) : undefined,
      setCaptionUrl,
      caption: setCaptionUrl ? (caption ?? null) : undefined,
    });
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/** Pick an existing gallery URL as rail cover (no re-encode). */
router.patch('/unidades/:id/trilho-capa', ...parceiroAuth, async (req, res) => {
  try {
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    if (!url || url.length > 2048) {
      return res.status(400).json({ success: false, error: 'URL inválida' });
    }
    if (!(url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/uploads/'))) {
      return res.status(400).json({ success: false, error: 'URL não permitida' });
    }
    const result = await anfitriaoService.definirCapaTrilho(
      authFromReq(req),
      Number(req.params.id),
      url,
    );
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/unidades/:id/enviar-aprovacao', ...parceiroAuth, async (req, res) => {
  try {
    const result = await anfitriaoService.enviarAprovacao(authFromReq(req), Number(req.params.id));
    if (result.error === 'forbidden') {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    if (result.error === 'not_found') {
      return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
    }
    if (result.error === 'invalid_status') {
      return res.status(409).json({ success: false, error: 'Status inválido para envio' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/unidades/:id/arquivar', ...parceiroAuth, async (req, res) => {
  try {
    const rawMotivo = req.body?.motivo;
    if (rawMotivo !== undefined && rawMotivo !== null && typeof rawMotivo !== 'string') {
      return res.status(400).json({ success: false, error: 'Motivo deve ser texto' });
    }
    const motivo = typeof rawMotivo === 'string' ? rawMotivo : undefined;
    const result = await anfitriaoService.arquivarUnidade(authFromReq(req), Number(req.params.id), {
      motivo,
    });
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      if (result.error === 'not_found') {
        return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
      }
      if (result.error === 'invalid_motivo') {
        return res.status(400).json({
          success: false,
          error: result.message ?? 'Motivo inválido',
        });
      }
      return res.status(400).json({ success: false, error: 'Não foi possível arquivar' });
    }
    res.json({
      success: true,
      data: {
        unidade: result.data,
        already_archived: result.already_archived,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/unidades/:id/desarquivar', ...parceiroAuth, async (req, res) => {
  try {
    const rawMotivo = req.body?.motivo;
    if (rawMotivo !== undefined && rawMotivo !== null && typeof rawMotivo !== 'string') {
      return res.status(400).json({ success: false, error: 'Motivo deve ser texto' });
    }
    const motivo = typeof rawMotivo === 'string' ? rawMotivo : undefined;
    const result = await anfitriaoService.desarquivarUnidade(authFromReq(req), Number(req.params.id), {
      motivo,
    });
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      if (result.error === 'not_found') {
        return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
      }
      if (result.error === 'invalid_motivo') {
        return res.status(400).json({
          success: false,
          error: result.message ?? 'Motivo inválido',
        });
      }
      return res.status(400).json({ success: false, error: 'Não foi possível reativar' });
    }
    res.json({
      success: true,
      data: {
        unidade: result.data,
        already_restored: result.already_restored,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/coanfitrioes/aceitar-token', ...parceiroAuth, async (req, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token obrigatório' });
    }
    const result = await anfitriaoService.aceitarConvitePorToken(authFromReq(req), token);
    if ('error' in result) {
      if (result.error === 'email_required') {
        return res.status(400).json({ success: false, error: 'E-mail da sessão é obrigatório' });
      }
      if (result.error === 'invalid_token') {
        return res.status(400).json({ success: false, error: 'Token inválido' });
      }
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Convite inválido ou sem permissão' });
      }
      if (result.error === 'expired') {
        return res.status(410).json({ success: false, error: 'Convite expirado' });
      }
      return res.status(404).json({ success: false, error: 'Convite não encontrado' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/unidades/:id/coanfitrioes', ...parceiroAuth, async (req, res) => {
  try {
    const nome = typeof req.body?.nome === 'string' ? req.body.nome : '';
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    const papel = typeof req.body?.papel === 'string' ? req.body.papel : '';
    const telefone =
      typeof req.body?.telefone === 'string' ? req.body.telefone : undefined;
    if (!email.trim()) {
      return res.status(400).json({ success: false, error: 'E-mail é obrigatório' });
    }
    const result = await anfitriaoService.convidarCoanfitriao(
      authFromReq(req),
      Number(req.params.id),
      { nome, email, papel, telefone },
    );
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      if (result.error === 'not_found') {
        return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
      }
      if (result.error === 'email_required' || result.error === 'invalid_nome') {
        return res.status(400).json({ success: false, error: 'Dados do convite inválidos' });
      }
      if (result.error === 'invalid_papel') {
        return res.status(400).json({ success: false, error: 'Papel inválido' });
      }
      if (result.error === 'already_invited') {
        return res.status(409).json({ success: false, error: 'Convite já existe para este e-mail' });
      }
      if (result.error === 'coanfitrioes_max') {
        return res.status(400).json({ success: false, error: 'Limite de coanfitriões atingido' });
      }
      if (result.error === 'invalid_telefone') {
        return res.status(400).json({ success: false, error: 'Telefone inválido' });
      }
      return res.status(400).json({ success: false, error: 'Não foi possível convidar' });
    }
    res.json({
      success: true,
      data: result.data,
      ...(result.emailStatus ? { emailStatus: result.emailStatus } : {}),
      ...(result.smsStatus ? { smsStatus: result.smsStatus } : {}),
    });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/unidades/:id/coanfitrioes/:coId/reenviar', ...parceiroAuth, async (req, res) => {
  try {
    const result = await anfitriaoService.reenviarConviteCoanfitriao(
      authFromReq(req),
      Number(req.params.id),
      String(req.params.coId),
    );
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      if (result.error === 'not_found') {
        return res.status(404).json({ success: false, error: 'Coanfitrião não encontrado' });
      }
      if (result.error === 'invalid_status') {
        return res.status(400).json({
          success: false,
          error: 'Somente convites pendentes podem ser reenviados',
        });
      }
      return res.status(400).json({ success: false, error: 'Não foi possível reenviar convite' });
    }
    res.json({
      success: true,
      data: result.data,
      ...(result.emailStatus ? { emailStatus: result.emailStatus } : {}),
      ...(result.smsStatus ? { smsStatus: result.smsStatus } : {}),
    });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/unidades/:id/coanfitrioes/:coId/revogar', ...parceiroAuth, async (req, res) => {
  try {
    const result = await anfitriaoService.revogarCoanfitriao(
      authFromReq(req),
      Number(req.params.id),
      String(req.params.coId),
    );
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      if (result.error === 'not_found') {
        return res.status(404).json({ success: false, error: 'Coanfitrião não encontrado' });
      }
      return res.status(400).json({ success: false, error: 'Não foi possível revogar' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/unidades/:id/coanfitrioes/:coId/aceitar', ...parceiroAuth, async (req, res) => {
  try {
    const result = await anfitriaoService.aceitarConviteCoanfitriao(
      authFromReq(req),
      Number(req.params.id),
      String(req.params.coId),
    );
    if ('error' in result) {
      if (result.error === 'email_required') {
        return res.status(400).json({ success: false, error: 'E-mail da sessão é obrigatório' });
      }
      if (result.error === 'not_found') {
        return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
      }
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Convite inválido ou sem permissão' });
      }
      if (result.error === 'expired') {
        return res.status(410).json({ success: false, error: 'Convite expirado' });
      }
      return res.status(400).json({ success: false, error: 'Não foi possível aceitar convite' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.delete('/unidades/:id/coanfitrioes/:coId', ...parceiroAuth, async (req, res) => {
  try {
    const result = await anfitriaoService.removerCoanfitriao(
      authFromReq(req),
      Number(req.params.id),
      String(req.params.coId),
    );
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      if (result.error === 'not_found') {
        return res.status(404).json({ success: false, error: 'Coanfitrião não encontrado' });
      }
      if (result.error === 'invalid_status') {
        return res.status(409).json({
          success: false,
          error: 'Somente convites pendentes ou revogados podem ser removidos',
        });
      }
      return res.status(400).json({ success: false, error: 'Não foi possível remover' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/admin/unidades/:id/aprovar', ...staffAprovacao, async (req, res) => {
  try {
    const result = await anfitriaoService.aprovarUnidade(req.user!.role ?? '', Number(req.params.id));
    if ('error' in result) {
      if (result.error === 'forbidden') return res.status(403).json({ success: false, error: 'Acesso negado' });
      return res.status(404).json({ success: false, error: 'Unidade não encontrada ou status inválido' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/admin/unidades/:id/rejeitar', ...staffAprovacao, async (req, res) => {
  try {
    const result = await anfitriaoService.rejeitarUnidade(
      req.user!.role ?? '',
      Number(req.params.id),
      req.body?.motivo,
    );
    if ('error' in result) {
      if (result.error === 'forbidden') return res.status(403).json({ success: false, error: 'Acesso negado' });
      return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.get('/admin/verificacoes-local', ...staffAprovacao, async (req, res) => {
  try {
    const raw = String(req.query.status ?? 'enviado');
    const status =
      raw === 'aprovado' || raw === 'rejeitado' || raw === 'all' || raw === 'enviado'
        ? raw
        : 'enviado';
    const result = await anfitriaoService.listarVerificacoesLocal(req.user!.role ?? '', status);
    if ('error' in result) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/admin/unidades/:id/verificacao-local/aprovar', ...staffAprovacao, async (req, res) => {
  try {
    const result = await anfitriaoService.decidirVerificacaoLocal(
      req.user!.role ?? '',
      Number(req.params.id),
      'aprovar',
    );
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      if (result.error === 'invalid_status') {
        return res.status(409).json({ success: false, error: 'Verificação não está aguardando revisão' });
      }
      return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/admin/unidades/:id/verificacao-local/rejeitar', ...staffAprovacao, async (req, res) => {
  try {
    const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo : undefined;
    const result = await anfitriaoService.decidirVerificacaoLocal(
      req.user!.role ?? '',
      Number(req.params.id),
      'rejeitar',
      motivo,
    );
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      if (result.error === 'invalid_status') {
        return res.status(409).json({ success: false, error: 'Verificação não está aguardando revisão' });
      }
      return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/calendario', ...parceiroAuth, async (req, res) => {
  try {
    const de = String(req.query.de ?? '');
    const ate = String(req.query.ate ?? '');
    if (!de || !ate) {
      return res.status(400).json({ success: false, error: 'de e ate são obrigatórios' });
    }
    const data = await anfitriaoService.obterCalendarioAgregado(authFromReq(req), de, ate);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/reservas', ...parceiroAuth, async (req, res) => {
  try {
    const de = String(req.query.de ?? '');
    const ate = String(req.query.ate ?? '');
    if (!de || !ate) {
      return res.status(400).json({ success: false, error: 'de e ate são obrigatórios' });
    }
    const acomodacaoId = req.query.acomodacaoId != null ? Number(req.query.acomodacaoId) : undefined;
    const result = await anfitriaoService.listarReservas(authFromReq(req), {
      de,
      ate,
      acomodacaoId: Number.isFinite(acomodacaoId) ? acomodacaoId : undefined,
    });
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/hoje', ...parceiroAuth, async (req, res) => {
  try {
    const hoje = typeof req.query.hoje === 'string' ? req.query.hoje : undefined;
    const result = await anfitriaoService.obterAgendaHoje(authFromReq(req), hoje);
    if ('error' in result) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/mensagens', ...parceiroAuth, async (req, res) => {
  try {
    const de = String(req.query.de ?? '');
    const ate = String(req.query.ate ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(de) || !/^\d{4}-\d{2}-\d{2}$/.test(ate)) {
      return res.status(400).json({ success: false, error: 'de e ate (YYYY-MM-DD) obrigatórios' });
    }
    const result = await anfitriaoService.listarInboxMensagens(authFromReq(req), { de, ate });
    if ('error' in result) {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/reservas/:propostaId/mensagens', ...parceiroAuth, async (req, res) => {
  try {
    const propostaId = Number(req.params.propostaId);
    if (!Number.isFinite(propostaId)) {
      return res.status(400).json({ success: false, error: 'propostaId inválido' });
    }
    const result = await anfitriaoService.listarMensagensReserva(authFromReq(req), propostaId);
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      return res.status(404).json({ success: false, error: 'Reserva não encontrada' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/reservas/:propostaId/mensagens', ...parceiroAuth, async (req, res) => {
  try {
    const propostaId = Number(req.params.propostaId);
    if (!Number.isFinite(propostaId)) {
      return res.status(400).json({ success: false, error: 'propostaId inválido' });
    }
    const message = typeof req.body?.message === 'string' ? req.body.message : '';
    const senderName =
      typeof req.body?.senderName === 'string' ? req.body.senderName : undefined;
    const result = await anfitriaoService.enviarMensagemReserva(
      authFromReq(req),
      propostaId,
      message,
      senderName,
    );
    if ('error' in result) {
      if (result.error === 'invalid') {
        return res.status(400).json({ success: false, error: 'Mensagem obrigatória (máx. 2000)' });
      }
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      return res.status(404).json({ success: false, error: 'Reserva não encontrada' });
    }
    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/reservas/:propostaId/aprovar', ...parceiroAuth, async (req, res) => {
  try {
    const propostaId = Number(req.params.propostaId);
    if (!Number.isFinite(propostaId)) {
      return res.status(400).json({ success: false, error: 'propostaId inválido' });
    }
    const result = await anfitriaoService.decidirPedidoReserva(
      authFromReq(req),
      propostaId,
      'aprovar',
    );
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      if (result.error === 'invalid_status') {
        return res.status(409).json({ success: false, error: 'Pedido não está aguardando aprovação' });
      }
      return res.status(404).json({ success: false, error: 'Reserva não encontrada' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg.includes('indispon') || msg.includes('capacidade') || msg.includes('Hold')) {
      return res.status(409).json({ success: false, error: msg });
    }
    res.status(500).json({ success: false, error: msg });
  }
});

router.post('/reservas/:propostaId/rejeitar', ...parceiroAuth, async (req, res) => {
  try {
    const propostaId = Number(req.params.propostaId);
    if (!Number.isFinite(propostaId)) {
      return res.status(400).json({ success: false, error: 'propostaId inválido' });
    }
    const result = await anfitriaoService.decidirPedidoReserva(
      authFromReq(req),
      propostaId,
      'rejeitar',
    );
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      if (result.error === 'invalid_status') {
        return res.status(409).json({ success: false, error: 'Pedido não está aguardando aprovação' });
      }
      return res.status(404).json({ success: false, error: 'Reserva não encontrada' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/unidades/:id/calendario', ...parceiroAuth, async (req, res) => {
  try {
    const de = String(req.query.de ?? '');
    const ate = String(req.query.ate ?? '');
    if (!de || !ate) {
      return res.status(400).json({ success: false, error: 'de e ate são obrigatórios' });
    }
    const result = await anfitriaoService.obterCalendarioUnidade(
      authFromReq(req),
      Number(req.params.id),
      de,
      ate,
    );
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/unidades/:id/disponibilidade', ...parceiroAuth, async (req, res) => {
  try {
    const de = String(req.query.de ?? '');
    const ate = String(req.query.ate ?? '');
    if (!de || !ate) {
      return res.status(400).json({ success: false, error: 'de e ate são obrigatórios' });
    }
    const result = await anfitriaoService.listarDisponibilidade(
      authFromReq(req),
      Number(req.params.id),
      de,
      ate,
    );
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.put('/unidades/:id/disponibilidade', ...parceiroAuth, async (req, res) => {
  try {
    const dias = Array.isArray(req.body?.dias) ? req.body.dias : [];
    const result = await anfitriaoService.salvarDisponibilidade(
      authFromReq(req),
      Number(req.params.id),
      dias,
    );
    if (result.error === 'forbidden') {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    if (result.error === 'not_found') {
      return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
    }
    if (result.error === 'limit_exceeded') {
      return res.status(400).json({ success: false, error: 'Máximo 50 dias por requisição' });
    }
    if (result.error === 'day_reserved') {
      return res.status(403).json({
        success: false,
        error: 'Dia reservado não pode ser alterado pelo anfitrião',
      });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/unidades/:id/disponibilidade/bloquear', ...parceiroAuth, async (req, res) => {
  try {
    const parsed = normalizarListaDatas(req.body?.datas);
    if ('error' in parsed) {
      return res.status(400).json({ success: false, error: parsed.error });
    }
    const result = await anfitriaoService.bulkBloquearDatas(
      authFromReq(req),
      Number(req.params.id),
      parsed.datas,
      req.body?.observacao != null ? String(req.body.observacao) : undefined,
    );
    if (result.error === 'forbidden') {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    if (result.error === 'not_found') {
      return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
    }
    if (result.error === 'limit_exceeded') {
      return res.status(400).json({ success: false, error: 'Máximo 50 datas por requisição' });
    }
    if (result.error === 'day_reserved_conflict') {
      return res.status(409).json({
        success: false,
        error: 'Não é possível bloquear dia já reservado',
      });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/unidades/:id/disponibilidade/desbloquear', ...parceiroAuth, async (req, res) => {
  try {
    const parsed = normalizarListaDatas(req.body?.datas);
    if ('error' in parsed) {
      return res.status(400).json({ success: false, error: parsed.error });
    }
    const result = await anfitriaoService.bulkDesbloquearDatas(
      authFromReq(req),
      Number(req.params.id),
      parsed.datas,
    );
    if (result.error === 'forbidden') {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    if (result.error === 'not_found') {
      return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
    }
    if (result.error === 'limit_exceeded') {
      return res.status(400).json({ success: false, error: 'Máximo 50 datas por requisição' });
    }
    if (result.error === 'day_reserved') {
      return res.status(403).json({
        success: false,
        error: 'Dia reservado não pode ser desbloqueado pelo anfitrião',
      });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/unidades/:id/disponibilidade/preco', ...masterAuth, async (req, res) => {
  try {
    const parsed = normalizarListaDatas(req.body?.datas);
    if ('error' in parsed) {
      return res.status(400).json({ success: false, error: parsed.error });
    }
    const precoRaw = req.body?.preco;
    const preco =
      precoRaw === null || precoRaw === undefined || precoRaw === ''
        ? null
        : Number(precoRaw);
    if (preco != null && !Number.isFinite(preco)) {
      return res.status(400).json({ success: false, error: 'preco inválido' });
    }
    const result = await anfitriaoService.ajustarPrecoDatas(
      authFromReq(req),
      Number(req.params.id),
      parsed.datas,
      preco,
    );
    if (result.error === 'forbidden') {
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    if (result.error === 'not_found') {
      return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
    }
    if (result.error === 'limit_exceeded') {
      return res.status(400).json({ success: false, error: 'Máximo 50 datas por requisição' });
    }
    if (result.error === 'invalid_price') {
      return res.status(400).json({ success: false, error: 'preco inválido' });
    }
    if (result.error === 'day_reserved') {
      return res.status(403).json({
        success: false,
        error: 'Dia reservado não pode receber preço especial',
      });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.get('/unidades/:id/rate-calendar', ...parceiroAuth, async (req, res) => {
  try {
    const de = String(req.query.de ?? '');
    const ate = String(req.query.ate ?? '');
    if (!de || !ate) {
      return res.status(400).json({ success: false, error: 'de e ate são obrigatórios' });
    }
    const result = await rateCalendarService.obterRateCalendar(
      authFromReq(req),
      Number(req.params.id),
      de,
      ate,
    );
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.put('/unidades/:id/rate-calendar/day', ...masterAuth, async (req, res) => {
  try {
    const data = String(req.body?.data ?? '');
    if (!data) {
      return res.status(400).json({ success: false, error: 'data é obrigatória' });
    }
    const result = await rateCalendarService.atualizarDia(authFromReq(req), Number(req.params.id), {
      data,
      preco: req.body?.preco === undefined ? undefined : req.body.preco === null || req.body.preco === ''
        ? null
        : Number(req.body.preco),
      disponivel: typeof req.body?.disponivel === 'boolean' ? req.body.disponivel : undefined,
      observacao: typeof req.body?.observacao === 'string' ? req.body.observacao : undefined,
    });
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      if (result.error === 'not_found') {
        return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
      }
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.put('/unidades/:id/pricing-defaults', ...masterAuth, async (req, res) => {
  try {
    const result = await rateCalendarService.atualizarPricingDefaults(
      authFromReq(req),
      Number(req.params.id),
      req.body ?? {},
    );
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      if (result.error === 'not_found') {
        return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
      }
      const message =
        'message' in result && typeof result.message === 'string'
          ? result.message
          : 'Dados de preço inválidos';
      return res.status(400).json({ success: false, error: message });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post(
  '/unidades/:id/conjuntos-regras/:conjuntoId/aplicar',
  ...masterAuth,
  async (req, res) => {
    try {
      const de = String(req.body?.de ?? '');
      const ate = String(req.body?.ate ?? '');
      const result = await rateCalendarService.aplicarConjuntoRegras(
        authFromReq(req),
        Number(req.params.id),
        String(req.params.conjuntoId),
        { de, ate },
      );
      if ('error' in result) {
        if (result.error === 'forbidden') {
          return res.status(403).json({ success: false, error: 'Acesso negado' });
        }
        if (result.error === 'not_found') {
          return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
        }
        if (result.error === 'conjunto_not_found') {
          return res.status(404).json({
            success: false,
            error:
              'message' in result && typeof result.message === 'string'
                ? result.message
                : 'Conjunto não encontrado',
          });
        }
        if (result.error === 'day_reserved' || result.error === 'day_reserved_conflict') {
          return res.status(403).json({
            success: false,
            error: 'Dia reservado não pode ser alterado',
          });
        }
        const message =
          'message' in result && typeof result.message === 'string'
            ? result.message
            : String(result.error);
        return res.status(400).json({ success: false, error: message });
      }
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: (error as Error).message });
    }
  },
);

router.post('/unidades/:id/aplicar-desconto', ...parceiroAuth, async (req, res) => {
  try {
    const result = await rateCalendarService.aplicarDesconto(
      authFromReq(req),
      Number(req.params.id),
      {
        datas: Array.isArray(req.body?.datas) ? req.body.datas.map(String) : [],
        percentual: Number(req.body?.percentual),
        enforceAsRole:
          typeof req.body?.enforceAsRole === 'string' ? req.body.enforceAsRole : undefined,
      },
    );
    if ('error' in result) {
      if (result.error === 'forbidden') {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      if (result.error === 'discount_cap') {
        return res.status(403).json({
          success: false,
          error: result.message,
          teto: result.teto,
        });
      }
      if (result.error === 'not_found') {
        return res.status(404).json({ success: false, error: 'Unidade não encontrada' });
      }
      return res.status(400).json({
        success: false,
        error: 'message' in result ? result.message : result.error,
      });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/unidades/:id/validar-desconto', ...parceiroAuth, async (req, res) => {
  try {
    const percentual = Number(req.body?.percentual);
    const result = await rateCalendarService.validarDescontoProposto(
      authFromReq(req),
      Number(req.params.id),
      percentual,
      {
        enforceAsRole:
          typeof req.body?.enforceAsRole === 'string' ? req.body.enforceAsRole : undefined,
      },
    );
    if (!result.ok) {
      return res.status(403).json({
        success: false,
        error: result.message,
        teto: result.teto,
      });
    }
    res.json({ success: true, data: { teto: result.teto } });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post('/admin/carteira', ...staffAprovacao, async (req, res) => {
  try {
    const { corretorId, proprietarioId } = req.body ?? {};
    if (!corretorId || !proprietarioId) {
      return res.status(400).json({ success: false, error: 'corretorId e proprietarioId obrigatórios' });
    }
    const result = await anfitriaoService.atribuirCarteira(
      req.user!.role ?? '',
      Number(corretorId),
      Number(proprietarioId),
    );
    if (result.error === 'forbidden') return res.status(403).json({ success: false, error: 'Acesso negado' });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

export default router;
module.exports = router;
