import fs from 'fs';
import path from 'path';
import multer from 'multer';
import type { ErrorRequestHandler, Request, Response } from 'express';
import {
  assertHomeUploadLimits,
  classifyHomeMime,
  ensureHomeSectionsUploadDir,
  processHomeMedia,
  publicHomeMediaUrl,
  HOME_ANIM_MIMES,
  HOME_IMAGE_MIMES,
  HOME_LIMITS,
  HOME_VIDEO_MIMES,
} from './home-media-optimizer';

const ALLOWED = new Set([...HOME_IMAGE_MIMES, ...HOME_VIDEO_MIMES, ...HOME_ANIM_MIMES]);
const MAX_ANY = Math.max(HOME_LIMITS.imageBytes, HOME_LIMITS.videoBytes, HOME_LIMITS.animBytes);

export const homeMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ANY, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error(`Formato não suportado: ${file.mimetype}`));
  },
}).single('file');

export const homeMediaUploadErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'Arquivo excede o limite permitido' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err instanceof Error) {
    return res.status(400).json({ success: false, error: err.message });
  }
  return next(err);
};

export async function handleHomeMediaUpload(req: Request, res: Response) {
  const file = req.file;
  if (!file?.buffer?.length) {
    return res.status(400).json({ success: false, error: 'Arquivo obrigatório (campo file)' });
  }

  const mimeType = String(file.mimetype || '').toLowerCase();
  try {
    assertHomeUploadLimits(mimeType, file.size);
  } catch (error) {
    return res.status(400).json({ success: false, error: (error as Error).message });
  }

  const section = String(req.body?.section ?? req.query?.section ?? 'home');
  const slugHint = String(req.body?.slugHint ?? req.body?.slug_hint ?? req.query?.slugHint ?? 'card');

  try {
    const processed = await processHomeMedia({
      buffer: file.buffer,
      mimeType,
      section,
      slugHint,
    });
    const dir = ensureHomeSectionsUploadDir();
    const outPath = path.join(dir, processed.fileName);
    fs.writeFileSync(outPath, processed.buffer);

    const relativeUrl = `/uploads/home-sections/${processed.fileName}`;
    const host = req.get('host') || undefined;
    const url = publicHomeMediaUrl(relativeUrl, host);

    return res.status(201).json({
      success: true,
      data: {
        url,
        relativeUrl,
        mediaType: processed.mediaType || classifyHomeMime(mimeType),
        contentType: processed.contentType,
        sizeBytes: processed.buffer.length,
        width: processed.width ?? null,
        height: processed.height ?? null,
      },
    });
  } catch (error) {
    const message = (error as Error).message || 'Falha ao processar mídia';
    return res.status(400).json({ success: false, error: message });
  }
}
