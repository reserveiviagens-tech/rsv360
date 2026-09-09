import fs from 'fs';
import path from 'path';
import type { Express } from 'express';

/** Detected content family from magic bytes (no npm magic deps). */
export type SniffedKind =
  | 'jpeg'
  | 'png'
  | 'webp'
  | 'mp4'
  | 'zip'
  | 'ole'
  | 'pdf'
  | 'text'
  | 'unknown';

export type CmsMediaMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4';

export const CMS_MEDIA_MIMES = new Set<string>([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
]);

export const IMPORT_FILE_MIMES = new Set<string>([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/pdf',
  'text/csv',
  'application/csv',
  'text/plain',
  'text/markdown',
  'application/octet-stream', // browsers often send this for xlsx — magic must confirm
]);

export const IMPORT_FILE_EXTS = new Set([
  '.xlsx',
  '.xls',
  '.csv',
  '.docx',
  '.doc',
  '.pdf',
  '.md',
  '.markdown',
]);

const CMS_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
};

const CMS_MIME_TO_KIND: Record<string, SniffedKind> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
};

export function canonicalExtForCmsMime(mime: string): string {
  return CMS_MIME_TO_EXT[mime] ?? '';
}

/** Never trust originalname for the stored extension. */
export function safeStoredFilename(uuid: string, mime: string): string {
  const ext = canonicalExtForCmsMime(mime);
  if (!ext) throw new Error(`Tipo de arquivo não permitido: ${mime}`);
  return `${uuid}${ext}`;
}

export function sanitizeUploadBasename(name: string): string {
  // Normalize Windows separators so path.basename works on Linux CI runners too.
  const normalized = String(name || 'upload').replace(/\\/g, '/');
  const base = path.basename(normalized).replace(/[^\w.\-+() ]+/g, '_');
  const trimmed = base.slice(0, 180).trim();
  return trimmed || 'upload.bin';
}

export function sniffFileKind(buf: Buffer): SniffedKind {
  if (!buf || buf.length < 4) return 'unknown';

  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  if (buf.length >= 8 && buf.toString('ascii', 4, 8) === 'ftyp') return 'mp4';
  if (buf[0] === 0x50 && buf[1] === 0x4b) return 'zip'; // xlsx / docx
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return 'ole'; // xls/doc
  if (buf.slice(0, 4).toString('ascii') === '%PDF') return 'pdf';

  // printable / UTF-8 BOM text (csv, md)
  const sample = buf.subarray(0, Math.min(buf.length, 512));
  if (sample[0] === 0xef && sample[1] === 0xbb && sample[2] === 0xbf) return 'text';
  let nul = 0;
  let printable = 0;
  for (let i = 0; i < sample.length; i++) {
    const b = sample[i];
    if (b === 0) nul++;
    if (b === 0x09 || b === 0x0a || b === 0x0d || (b >= 0x20 && b <= 0x7e) || b >= 0x80) {
      printable++;
    }
  }
  if (nul === 0 && printable / sample.length >= 0.85) return 'text';
  return 'unknown';
}

export function cmsMimeMatchesMagic(mime: string, kind: SniffedKind): boolean {
  const expected = CMS_MIME_TO_KIND[mime];
  return Boolean(expected && expected === kind);
}

export function importExtAllowed(originalname: string): boolean {
  const ext = path.extname(originalname || '').toLowerCase();
  return IMPORT_FILE_EXTS.has(ext);
}

export function importMagicMatches(originalname: string, buf: Buffer): boolean {
  const ext = path.extname(originalname || '').toLowerCase();
  const kind = sniffFileKind(buf);
  switch (ext) {
    case '.xlsx':
    case '.docx':
      return kind === 'zip';
    case '.xls':
    case '.doc':
      return kind === 'ole' || kind === 'zip';
    case '.pdf':
      return kind === 'pdf';
    case '.csv':
    case '.md':
    case '.markdown':
      return kind === 'text';
    default:
      return false;
  }
}

/**
 * After disk multer: verify magic bytes; unlink and throw on mismatch.
 * Call inside route after cmsUpload succeeds.
 */
export function assertCmsDiskFileMagic(file: Express.Multer.File): void {
  const fd = fs.openSync(file.path, 'r');
  try {
    const buf = Buffer.alloc(32);
    const n = fs.readSync(fd, buf, 0, 32, 0);
    const kind = sniffFileKind(buf.subarray(0, n));
    if (!cmsMimeMatchesMagic(file.mimetype, kind)) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        /* ignore unlink race */
      }
      throw new Error('Conteúdo do arquivo não corresponde ao tipo declarado');
    }
  } finally {
    fs.closeSync(fd);
  }
}

/** Express middleware: reject import uploads that fail MIME/ext/magic. */
export function assertImportMemoryFile(file: Express.Multer.File | undefined): void {
  if (!file) throw new Error('Arquivo obrigatório (campo file)');
  if (!importExtAllowed(file.originalname)) {
    throw new Error('Extensão de arquivo não permitida');
  }
  if (!IMPORT_FILE_MIMES.has(file.mimetype)) {
    throw new Error(`Tipo de arquivo não permitido: ${file.mimetype}`);
  }
  if (!file.buffer || !importMagicMatches(file.originalname, file.buffer)) {
    throw new Error('Conteúdo do arquivo não corresponde à extensão');
  }
}
