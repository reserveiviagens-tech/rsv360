import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import multer from 'multer';
import type { ErrorRequestHandler } from 'express';
import { sniffFileKind } from '../../../lib/secure-upload';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function resolveTrilhoUploadDir(): string {
  const fromEnv = process.env.ANFITRIAO_TRILHO_UPLOAD_DIR;
  if (fromEnv) return path.resolve(fromEnv);
  return path.resolve(process.cwd(), 'public', 'uploads', 'acomodacoes', 'trilho');
}

export function ensureTrilhoUploadDir(): string {
  const dir = resolveTrilhoUploadDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export const trilhoThumbUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
  },
}).single('file');

export const trilhoThumbUploadErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'Arquivo excede 8MB' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err instanceof Error) {
    return res.status(400).json({ success: false, error: err.message });
  }
  return next(err);
};

function assertImageMagic(buf: Buffer): void {
  const kind = sniffFileKind(buf);
  if (kind !== 'jpeg' && kind !== 'png' && kind !== 'webp') {
    throw new Error('Arquivo não é uma imagem válida (JPEG/PNG/WebP)');
  }
}

/**
 * Convert upload to a small square WebP for the listings rail.
 * Falls back to writing original bytes as .bin-safe webp rename if sharp is unavailable.
 */
export async function writeTrilhoWebp(
  buffer: Buffer,
  acomodacaoId: number,
): Promise<{ relativeUrl: string; bytes: number }> {
  assertImageMagic(buffer);
  const dir = ensureTrilhoUploadDir();
  const filename = `trilho-${acomodacaoId}-${randomUUID()}.webp`;
  const outPath = path.join(dir, filename);

  let sharpFn: ((input: Buffer) => {
    rotate: () => {
      resize: (
        w: number,
        h: number,
        opts: { fit: string; position: string },
      ) => {
        webp: (opts: { quality: number }) => { toBuffer: () => Promise<Buffer> };
      };
    };
  }) | null = null;
  try {
    const mod = await import('sharp');
    sharpFn = ((mod as { default?: unknown }).default ?? mod) as typeof sharpFn;
  } catch {
    sharpFn = null;
  }

  if (sharpFn) {
    const out = await sharpFn(buffer)
      .rotate()
      .resize(256, 256, { fit: 'cover', position: 'attention' })
      .webp({ quality: 72 })
      .toBuffer();
    fs.writeFileSync(outPath, out);
    return { relativeUrl: `/uploads/acomodacoes/trilho/${filename}`, bytes: out.length };
  }

  // Fallback without sharp: store original (still validated) under .webp name only if already webp
  const kind = sniffFileKind(buffer);
  if (kind === 'webp') {
    fs.writeFileSync(outPath, buffer);
    return { relativeUrl: `/uploads/acomodacoes/trilho/${filename}`, bytes: buffer.length };
  }
  const ext = kind === 'png' ? '.png' : '.jpg';
  const rawName = `trilho-${acomodacaoId}-${randomUUID()}${ext}`;
  fs.writeFileSync(path.join(dir, rawName), buffer);
  return { relativeUrl: `/uploads/acomodacoes/trilho/${rawName}`, bytes: buffer.length };
}

/**
 * Gallery photo: max edge 1600 WebP (or original fallback).
 */
export async function writeGaleriaWebp(
  buffer: Buffer,
  acomodacaoId: number,
): Promise<{ relativeUrl: string; bytes: number }> {
  assertImageMagic(buffer);
  const dir = ensureTrilhoUploadDir();
  const filename = `galeria-${acomodacaoId}-${randomUUID()}.webp`;
  const outPath = path.join(dir, filename);

  let sharpFn: ((input: Buffer) => {
    rotate: () => {
      resize: (
        w: number,
        opts: { fit: string; withoutEnlargement: boolean },
      ) => {
        webp: (opts: { quality: number }) => { toBuffer: () => Promise<Buffer> };
      };
    };
  }) | null = null;
  try {
    const mod = await import('sharp');
    sharpFn = ((mod as { default?: unknown }).default ?? mod) as typeof sharpFn;
  } catch {
    sharpFn = null;
  }

  if (sharpFn) {
    const out = await sharpFn(buffer)
      .rotate()
      .resize(1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    fs.writeFileSync(outPath, out);
    return { relativeUrl: `/uploads/acomodacoes/trilho/${filename}`, bytes: out.length };
  }

  const kind = sniffFileKind(buffer);
  if (kind === 'webp') {
    fs.writeFileSync(outPath, buffer);
    return { relativeUrl: `/uploads/acomodacoes/trilho/${filename}`, bytes: buffer.length };
  }
  const ext = kind === 'png' ? '.png' : '.jpg';
  const rawName = `galeria-${acomodacaoId}-${randomUUID()}${ext}`;
  fs.writeFileSync(path.join(dir, rawName), buffer);
  return { relativeUrl: `/uploads/acomodacoes/trilho/${rawName}`, bytes: buffer.length };
}

export function publicTrilhoUrl(relativeUrl: string, reqHost?: string): string {
  if (relativeUrl.startsWith('http')) return relativeUrl;
  const base =
    process.env.PUBLIC_API_URL ||
    process.env.BACKEND_PUBLIC_URL ||
    (reqHost ? `http://${reqHost}` : '') ||
    'http://localhost:3002';
  return `${base.replace(/\/$/, '')}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
}
