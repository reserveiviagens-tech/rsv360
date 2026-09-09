import { Router, type Request } from 'express';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import { normalizarListaDatas } from '../services/anfitriao-bulk.util';
import { anfitriaoService, type AuthContext } from '../services/anfitriao.service';
import { desempenhoService } from '../services/desempenho.service';
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
  return { userId, role: req.user?.role ?? 'user' };
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

router.get('/minhas', ...parceiroAuth, async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const data = await anfitriaoService.listarMinhas(authFromReq(req), page, pageSize);
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

/** Reorder / remove / set cover on gallery midia. */
router.patch('/unidades/:id/galeria', ...parceiroAuth, async (req, res) => {
  try {
    const removeUrl = typeof req.body?.removeUrl === 'string' ? req.body.removeUrl.trim() : undefined;
    const moveUrl = typeof req.body?.moveUrl === 'string' ? req.body.moveUrl.trim() : undefined;
    const setCapaUrl =
      typeof req.body?.setCapaUrl === 'string' ? req.body.setCapaUrl.trim() : undefined;
    const direction =
      req.body?.direction === 'left' || req.body?.direction === 'right'
        ? (req.body.direction as 'left' | 'right')
        : undefined;
    if (!removeUrl && !moveUrl && !setCapaUrl) {
      return res.status(400).json({ success: false, error: 'Informe removeUrl, moveUrl ou setCapaUrl' });
    }
    const result = await anfitriaoService.atualizarMidiaEstrutura(authFromReq(req), Number(req.params.id), {
      removeUrl,
      moveUrl,
      direction,
      setCapaUrl,
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
