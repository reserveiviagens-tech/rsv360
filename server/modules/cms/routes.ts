import { Router } from 'express';
import { authenticateJwt, requireRole } from '../../middleware/auth.middleware';
import { requireCmsManager } from '../membership/cms.guard';
import { AMENIDADE_LABELS, AMENIDADE_CODES } from './amenidades';
import { cmsService } from './service';
import {
  assertCmsDiskFileMagic,
  cmsUpload,
  cmsUploadErrorHandler,
  publicUrlForUpload,
} from './upload';

const router = Router();
// WS-15 G-C.2: guard canônico COMPLEMENTAR como 3º elemento do array (roda após o
// requireRole legado em cada rota `...staffAuth`). Mínimo real = manager (literal
// admin/manager em todas as rotas). Flag OFF => no-op; flag ON => membership + >= manager.
const staffAuth = [authenticateJwt, requireRole('admin', 'manager'), requireCmsManager];

router.get('/amenidades', ...staffAuth, (_req, res) => {
  res.json({
    success: true,
    data: AMENIDADE_CODES.map((code) => ({ code, label: AMENIDADE_LABELS[code] })),
  });
});

router.get('/content', ...staffAuth, async (req, res) => {
  try {
    const pageType = String(req.query.pageType ?? 'hotels');
    const data = await cmsService.list(pageType, { includeInactive: true });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/content', ...staffAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const body = req.body ?? {};
    const data = await cmsService.create(
      {
        pageType: body.pageType,
        contentId: body.contentId,
        title: body.title,
        description: body.description,
        features: body.features,
        images: body.images,
        videoUrl: body.videoUrl ?? body.video_url,
        amenidades: body.amenidades,
        orderIndex: body.orderIndex ?? body.order_index,
        status: body.status,
        metadata: body.metadata,
      },
      userId,
    );
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.put('/content/:id', ...staffAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'id inválido' });
    }
    const body = req.body ?? {};
    const data = await cmsService.update(
      id,
      {
        title: body.title,
        description: body.description,
        features: body.features,
        images: body.images,
        videoUrl: body.videoUrl ?? body.video_url,
        amenidades: body.amenidades,
        orderIndex: body.orderIndex ?? body.order_index,
        status: body.status,
        metadata: body.metadata,
      },
      req.user?.id,
    );
    if (!data) {
      return res.status(404).json({ success: false, error: 'Conteúdo não encontrado' });
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.delete('/content/:id', ...staffAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'id inválido' });
    }
    const hard = req.query.hard === '1' || req.query.hard === 'true';
    const result = await cmsService.remove(id, { hard, userId: req.user?.id });
    if (!result.deleted) {
      if (result.reason === 'not_found') {
        return res.status(404).json({ success: false, error: 'Conteúdo não encontrado' });
      }
      if (result.reason === 'etapa_a_protected') {
        return res.status(403).json({
          success: false,
          error: 'Hotéis Etapa A não podem ser excluídos permanentemente (use soft delete)',
        });
      }
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.post(
  '/upload',
  ...staffAuth,
  (req, res, next) => {
    cmsUpload(req, res, (err) => {
      if (err) return cmsUploadErrorHandler(err, req, res, next);
      return next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
    }
    try {
      assertCmsDiskFileMagic(req.file);
    } catch (error) {
      return res.status(400).json({ success: false, error: (error as Error).message });
    }
    const url = publicUrlForUpload(req.file.filename);
    res.status(201).json({
      success: true,
      data: {
        url,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  },
);

export default router;
