import { createHash, randomBytes } from 'crypto';

export const PREVIEW_TOKEN_TTL_HOURS = 72;

export function generatePreviewToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('hex');
  return { raw, hash: hashPreviewToken(raw) };
}

export function hashPreviewToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function isPreviewTokenExpired(expiresAt: Date | null | undefined, now: Date = new Date()): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() <= now.getTime();
}

export function previewExpiresAtFromNow(now: Date = new Date()): Date {
  return new Date(now.getTime() + PREVIEW_TOKEN_TTL_HOURS * 60 * 60 * 1000);
}

export function resolvePreviewPublicUrl(previewPath: string): string {
  const base = process.env.PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (base && String(base).trim()) {
    return `${String(base).replace(/\/$/, '')}${previewPath}`;
  }
  return previewPath;
}
