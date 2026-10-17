/**
 * Fatia F — sharp must be a real backend dependency (WebP SEO pipeline).
 */
import { processHomeMedia } from '../../../../server/modules/home/home-media-optimizer';

/** Minimal 1×1 PNG */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('home-media-optimizer (sharp)', () => {
  it('requires sharp package for production WebP path', () => {
    expect(() => require('sharp')).not.toThrow();
  });

  it('hero PNG → WebP 1600×900 with semantic slug', async () => {
    const result = await processHomeMedia({
      buffer: TINY_PNG,
      mimeType: 'image/png',
      section: 'hero',
      slugHint: 'topo',
    });
    expect(result.contentType).toBe('image/webp');
    expect(result.fileName).toMatch(/^hero-topo-caldas-novas-[a-f0-9]+\.webp$/);
    expect(result.width).toBe(1600);
    expect(result.height).toBe(900);
    expect(result.buffer.length).toBeGreaterThan(100);
    // RIFF....WEBP magic
    expect(result.buffer.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(result.buffer.subarray(8, 12).toString('ascii')).toBe('WEBP');
  });

  it('destinos PNG → WebP 1200×675', async () => {
    const result = await processHomeMedia({
      buffer: TINY_PNG,
      mimeType: 'image/png',
      section: 'destinos',
      slugHint: 'hot-park',
    });
    expect(result.contentType).toBe('image/webp');
    expect(result.width).toBe(1200);
    expect(result.height).toBe(675);
    expect(result.fileName).toMatch(/\.webp$/);
  });
});
