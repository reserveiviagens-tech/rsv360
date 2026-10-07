import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateJwt, requireRole } from '../../../middleware/auth.middleware';
import { requireAcomodacoesImportManager } from '../../membership/acomodacoes-import.guard';
import { gerarModeloXlsxBuffer } from '../import/modelo';
import { ImportVazioError, pipelineImportacao } from '../import/pipeline';
import { enfileirarImportacao } from '../../../queues/importacoes.queue';
import {
  IMPORT_FILE_EXTS,
  IMPORT_FILE_MIMES,
  assertImportMemoryFile,
  sanitizeUploadBasename,
} from '../../../lib/secure-upload';

const router = Router();

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!IMPORT_FILE_EXTS.has(ext)) {
    cb(new Error(`Extensão de arquivo não permitida: ${ext || '(vazia)'}`));
    return;
  }
  if (!IMPORT_FILE_MIMES.has(file.mimetype)) {
    cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter,
});

const importAuth = [authenticateJwt, requireRole('admin', 'manager'), requireAcomodacoesImportManager];

function parseProprietarioId(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Staff-only import options (E4=A). Partner path removed — RBAC is admin/manager. */
function buildImportOptions(req: Request, dryRun: boolean) {
  const bulkPublicado = String(req.body?.bulkPublicado ?? 'false') === 'true';
  const statusPublicacao = req.body?.statusPublicacao as
    | 'rascunho'
    | 'completo'
    | 'em_aprovacao'
    | 'publicado'
    | 'rejeitado'
    | undefined;

  return {
    dryRun,
    proprietarioId: parseProprietarioId(req.body?.proprietarioId),
    bulkPublicado: bulkPublicado || statusPublicacao === 'publicado',
    statusPublicacao,
  };
}

function sendImportError(res: Response, error: unknown) {
  if (error instanceof ImportVazioError) {
    return res.status(422).json({
      success: false,
      error: error.message,
      code: error.code,
    });
  }
  return res.status(400).json({ success: false, error: (error as Error).message });
}

router.get('/modelo.xlsx', ...importAuth, (_req, res) => {
  const buffer = gerarModeloXlsxBuffer();
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="modelo-importacao-acomodacoes.xlsx"',
  );
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.send(buffer);
});

router.post('/preview', ...importAuth, upload.single('file'), async (req, res) => {
  try {
    assertImportMemoryFile(req.file);
    const file = req.file!;
    const safeName = sanitizeUploadBasename(file.originalname);

    const relatorio = await pipelineImportacao(file.buffer, safeName, buildImportOptions(req, true));

    res.json({ success: true, data: relatorio });
  } catch (error) {
    return sendImportError(res, error);
  }
});

router.post('/commit', ...importAuth, upload.single('file'), async (req, res) => {
  try {
    assertImportMemoryFile(req.file);
    const file = req.file!;
    const safeName = sanitizeUploadBasename(file.originalname);

    const asyncMode = String(req.body?.async ?? 'false') === 'true';
    const importOpts = buildImportOptions(req, false);

    if (asyncMode) {
      const jobId = await enfileirarImportacao({
        nomeArquivo: safeName,
        bufferBase64: file.buffer.toString('base64'),
        proprietarioId: importOpts.proprietarioId,
        bulkPublicado: importOpts.bulkPublicado,
        statusPublicacao: importOpts.statusPublicacao,
        userId: req.user?.id,
      });
      return res.status(202).json({ success: true, data: { jobId, status: 'enqueued' } });
    }

    const relatorio = await pipelineImportacao(file.buffer, safeName, importOpts);

    res.json({ success: true, data: relatorio });
  } catch (error) {
    return sendImportError(res, error);
  }
});

export default router;
module.exports = router;
