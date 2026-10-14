import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { sniffFileKind } from '../../lib/secure-upload';

export const HOME_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

export const HOME_VIDEO_MIMES = new Set(['video/mp4', 'video/webm']);

export const HOME_ANIM_MIMES = new Set(['image/gif', 'image/svg+xml']);

/** Entrada generosa; saida otimizada no pipeline. */
export const HOME_LIMITS = {
  imageBytes: 15 * 1024 * 1024,
  videoBytes: 6 * 1024 * 1024,
  animBytes: 3 * 1024 * 1024,
} as const;

export type HomeMediaType = 'image' | 'video' | 'animation';

export type OptimizeHomeMediaInput = {
  buffer: Buffer;
  mimeType: string;
  section?: string;
  slugHint?: string;
};

export type OptimizeHomeMediaResult = {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  mediaType: HomeMediaType;
  width?: number;
  height?: number;
};

type SharpPipeline = {
  rotate: () => SharpPipeline;
  resize: (...args: unknown[]) => SharpPipeline;
  sharpen: (opts?: unknown) => SharpPipeline;
  webp: (opts: Record<string, unknown>) => SharpPipeline;
  toBuffer: () => Promise<Buffer>;
};

type SharpFn = (input: Buffer) => SharpPipeline;

async function loadSharp(): Promise<SharpFn | null> {
  try {
    const mod = await import('sharp');
    const candidate = (mod as { default?: unknown }).default ?? mod;
    return typeof candidate === 'function' ? (candidate as SharpFn) : null;
  } catch {
    return null;
  }
}

export function resolveHomeSectionsUploadDir(): string {
  const fromEnv = process.env.HOME_SECTIONS_UPLOAD_DIR;
  if (fromEnv) return path.resolve(fromEnv);
  // Prefer cwd/public/uploads (same root as CMS express.static /uploads)
  const candidates = [
    path.resolve(process.cwd(), 'public', 'uploads', 'home-sections'),
    path.resolve(process.cwd(), '..', 'public', 'uploads', 'home-sections'),
  ];
  for (const candidate of candidates) {
    try {
      fs.mkdirSync(candidate, { recursive: true });
      fs.accessSync(candidate, fs.constants.W_OK);
      return candidate;
    } catch {
      // try next
    }
  }
  return candidates[0];
}

export function ensureHomeSectionsUploadDir(): string {
  const dir = resolveHomeSectionsUploadDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function seoSlugBase(section: string, slugHint: string): string {
  const cleanSection = String(section || 'home')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 24) || 'home';
  const cleanSlug = String(slugHint || 'card')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50) || 'card';
  const shortHash = crypto.randomBytes(3).toString('hex');
  return `${cleanSection}-${cleanSlug}-caldas-novas-${shortHash}`;
}

export function classifyHomeMime(mimeType: string): HomeMediaType | null {
  if (HOME_IMAGE_MIMES.has(mimeType)) return 'image';
  if (HOME_VIDEO_MIMES.has(mimeType)) return 'video';
  if (HOME_ANIM_MIMES.has(mimeType)) return 'animation';
  return null;
}

export function assertHomeUploadLimits(mimeType: string, size: number): void {
  const kind = classifyHomeMime(mimeType);
  if (!kind) {
    throw new Error('Formato não suportado. Use JPG/PNG/WebP/AVIF, MP4/WebM ou GIF/SVG');
  }
  if (kind === 'image' && size > HOME_LIMITS.imageBytes) {
    throw new Error('Arquivo excede o limite de 15 MB para fotos');
  }
  if (kind === 'video' && size > HOME_LIMITS.videoBytes) {
    throw new Error('Arquivo excede o limite de 6 MB para vídeos');
  }
  if (kind === 'animation' && size > HOME_LIMITS.animBytes) {
    throw new Error('Arquivo excede o limite de 3 MB para GIF/SVG');
  }
}

function assertImageMagic(buf: Buffer): void {
  const kind = sniffFileKind(buf);
  if (kind !== 'jpeg' && kind !== 'png' && kind !== 'webp') {
    // AVIF magic not in sniff — allow if MIME was already validated as avif
    if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') return;
    throw new Error('Arquivo não é uma imagem válida');
  }
}

function assertVideoMagic(buf: Buffer, mimeType: string): void {
  if (mimeType === 'video/webm') {
    // EBML header 1A 45 DF A3
    if (buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
      return;
    }
    throw new Error('Arquivo WebM inválido');
  }
  const kind = sniffFileKind(buf);
  if (kind !== 'mp4') {
    throw new Error('Arquivo não é um vídeo MP4/WebM válido');
  }
}

/**
 * Pipeline SEO: fotos → WebP 1200x675 (tempo 1600x900);
 * video/gif/svg → bytes originais + nome semantico.
 */
export async function processHomeMedia(
  input: OptimizeHomeMediaInput,
): Promise<OptimizeHomeMediaResult> {
  const mimeType = String(input.mimeType || '').toLowerCase();
  const mediaType = classifyHomeMime(mimeType);
  if (!mediaType) {
    throw new Error('Formato não suportado');
  }
  assertHomeUploadLimits(mimeType, input.buffer.length);

  const section = input.section || 'home';
  const base = seoSlugBase(section, input.slugHint || 'card');

  if (mediaType === 'image') {
    assertImageMagic(input.buffer);
    const targetWidth = section === 'tempo' ? 1600 : 1200;
    const targetHeight = section === 'tempo' ? 900 : 675;
    const sharpFn = await loadSharp();
    if (sharpFn) {
      const optimized = await sharpFn(input.buffer)
        .rotate()
        .resize(targetWidth, targetHeight, {
          fit: 'cover',
          position: 'attention',
        })
        .sharpen({ sigma: 0.6 })
        .webp({
          quality: 84,
          effort: 4,
          smartSubsampling: true,
        })
        .toBuffer();
      return {
        buffer: optimized,
        fileName: `${base}.webp`,
        contentType: 'image/webp',
        mediaType: 'image',
        width: targetWidth,
        height: targetHeight,
      };
    }
    // Fallback sem sharp: grava original com extensao sniffada
    const kind = sniffFileKind(input.buffer);
    const ext = kind === 'png' ? 'png' : kind === 'webp' ? 'webp' : 'jpg';
    return {
      buffer: input.buffer,
      fileName: `${base}.${ext}`,
      contentType: mimeType,
      mediaType: 'image',
      width: targetWidth,
      height: targetHeight,
    };
  }

  if (mediaType === 'video') {
    assertVideoMagic(input.buffer, mimeType);
    const ext = mimeType === 'video/webm' ? 'webm' : 'mp4';
    return {
      buffer: input.buffer,
      fileName: `${base}.${ext}`,
      contentType: mimeType,
      mediaType: 'video',
    };
  }

  // animation gif/svg — sem reprocessamento
  const ext = mimeType === 'image/svg+xml' ? 'svg' : 'gif';
  return {
    buffer: input.buffer,
    fileName: `${base}.${ext}`,
    contentType: mimeType,
    mediaType: 'animation',
  };
}

export function publicHomeMediaUrl(relativeUrl: string, reqHost?: string): string {
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl;
  }
  const base =
    process.env.PUBLIC_API_URL ||
    process.env.BACKEND_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (reqHost ? `https://${reqHost.replace(/^https?:\/\//, '')}` : '') ||
    'https://api.reserveiviagens.com.br';
  return `${String(base).replace(/\/$/, '')}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
}
