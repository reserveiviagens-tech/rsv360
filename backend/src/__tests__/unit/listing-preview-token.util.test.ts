import {
  PREVIEW_TOKEN_TTL_HOURS,
  generatePreviewToken,
  hashPreviewToken,
  isPreviewTokenExpired,
  previewExpiresAtFromNow,
  resolvePreviewPublicUrl,
} from '../../../../server/modules/acomodacoes/services/listing-preview-token.util';

describe('listing-preview-token.util', () => {
  it('generates raw token and deterministic sha256 hash', () => {
    const { raw, hash } = generatePreviewToken();
    expect(raw).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(hashPreviewToken(raw));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hashPreviewToken is stable for same input', () => {
    const raw = 'abc123';
    expect(hashPreviewToken(raw)).toBe(hashPreviewToken(raw));
  });

  it('isPreviewTokenExpired treats missing or past dates as expired', () => {
    const now = new Date('2026-06-01T12:00:00.000Z');
    expect(isPreviewTokenExpired(null, now)).toBe(true);
    expect(isPreviewTokenExpired(undefined, now)).toBe(true);
    expect(isPreviewTokenExpired(new Date('2026-06-01T11:59:59.000Z'), now)).toBe(true);
    expect(isPreviewTokenExpired(new Date('2026-06-01T12:00:00.000Z'), now)).toBe(true);
    expect(isPreviewTokenExpired(new Date('2026-06-01T12:00:01.000Z'), now)).toBe(false);
  });

  it('previewExpiresAtFromNow adds TTL hours', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const expires = previewExpiresAtFromNow(now);
    expect(expires.getTime() - now.getTime()).toBe(PREVIEW_TOKEN_TTL_HOURS * 60 * 60 * 1000);
  });

  it('resolvePreviewPublicUrl uses env base when set', () => {
    const prevPublic = process.env.PUBLIC_SITE_URL;
    const prevNext = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.PUBLIC_SITE_URL = 'https://example.com/';
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(resolvePreviewPublicUrl('/h/preview/abc')).toBe('https://example.com/h/preview/abc');
    process.env.PUBLIC_SITE_URL = prevPublic;
    if (prevNext !== undefined) process.env.NEXT_PUBLIC_SITE_URL = prevNext;
  });

  it('resolvePreviewPublicUrl returns path when no base env', () => {
    const prevPublic = process.env.PUBLIC_SITE_URL;
    const prevNext = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(resolvePreviewPublicUrl('/h/preview/abc')).toBe('/h/preview/abc');
    process.env.PUBLIC_SITE_URL = prevPublic;
    if (prevNext !== undefined) process.env.NEXT_PUBLIC_SITE_URL = prevNext;
  });
});
