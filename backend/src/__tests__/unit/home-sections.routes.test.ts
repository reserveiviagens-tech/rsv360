const mockListPublic = jest.fn();
const mockListAdmin = jest.fn();
const mockReplace = jest.fn();
const mockCreateItem = jest.fn();
const mockPatchItem = jest.fn();
const mockDeleteItem = jest.fn();

jest.mock('../../../../server/modules/home/home-sections.service', () => {
  const actual = jest.requireActual('../../../../server/modules/home/home-sections.service');
  return {
    ...actual,
    HomeSectionsService: {
      listPublic: (...args: unknown[]) => mockListPublic(...args),
      listAdmin: (...args: unknown[]) => mockListAdmin(...args),
      replaceSection: (...args: unknown[]) => mockReplace(...args),
      createItem: (...args: unknown[]) => mockCreateItem(...args),
      patchItem: (...args: unknown[]) => mockPatchItem(...args),
      deleteItem: (...args: unknown[]) => mockDeleteItem(...args),
    },
  };
});

jest.mock('../../../../server/middleware/auth.middleware', () => ({
  authenticateJwt: (
    req: { headers: Record<string, string | undefined>; user?: unknown },
    res: { status: (n: number) => { json: (b: unknown) => void } },
    next: () => void,
  ) => {
    const role = req.headers['x-test-role'];
    const userId = req.headers['x-test-user-id'];
    if (!role || !userId) {
      return res.status(401).json({ success: false, error: 'Token ausente' });
    }
    req.user = { id: Number(userId), role, email: 't@test.com', name: 'Test' };
    next();
  },
  requireRole: (...roles: string[]) => {
    return (
      req: { user?: { role?: string } },
      res: { status: (n: number) => { json: (b: unknown) => void } },
      next: () => void,
    ) => {
      if (!req.user?.role || !roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      next();
    };
  },
}));

import express from 'express';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import request from 'supertest';
import homeRouter from '../../../../server/modules/home/routes/index';
import {
  HomeConflictError,
  HomeNotFoundError,
  parseCreateItemPayload,
  parsePlacementsPayload,
} from '../../../../server/modules/home/home-sections.service';
import {
  assertHomeUploadLimits,
  seoSlugBase,
} from '../../../../server/modules/home/home-media-optimizer';

/** Minimal valid 1x1 PNG */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/home', homeRouter);
  return app;
}

const staffHeaders = { 'x-test-role': 'admin', 'x-test-user-id': '1' };

describe('home sections API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListPublic.mockResolvedValue([]);
    mockListAdmin.mockResolvedValue([]);
    mockReplace.mockResolvedValue([]);
    mockCreateItem.mockResolvedValue({});
    mockPatchItem.mockResolvedValue({});
    mockDeleteItem.mockResolvedValue(undefined);
  });

  it('rotas admin usam authenticateJwt + requireRole staff', () => {
    const routesPath = resolve(__dirname, '../../../../server/modules/home/routes/index.ts');
    const source = readFileSync(routesPath, 'utf8');
    expect(source).toContain('authenticateJwt');
    expect(source).toContain("requireRole('admin', 'manager')");
    expect(source).toContain("'/admin/sections/:section', ...staffAuth");
    expect(source).toContain("'/admin/sections/:section/items', ...staffAuth");
    expect(source).toContain("'/admin/items/:id', ...staffAuth");
    expect(source).toContain("'/admin/upload'");
  });

  it('GET público rejeita section inválida (400)', async () => {
    const res = await request(buildApp()).get('/api/v1/home/sections/invalida');
    expect(res.status).toBe(400);
    expect(mockListPublic).not.toHaveBeenCalled();
  });

  it('GET público lista ativos da section', async () => {
    mockListPublic.mockResolvedValue([
      {
        id: 1,
        section: 'escolhas',
        entityType: 'combo',
        entityId: 'familia',
        titleOverride: null,
        subtitleOverride: null,
        badgeText: null,
        imageUrl: null,
        ctaHref: '/experiencias?perfil=familia',
        orderIndex: 0,
        isActive: true,
      },
    ]);
    const res = await request(buildApp()).get('/api/v1/home/sections/escolhas');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(mockListPublic).toHaveBeenCalledWith('escolhas');
  });

  it('GET admin retorna 401 sem token', async () => {
    const res = await request(buildApp()).get('/api/v1/home/admin/sections/destinos');
    expect(res.status).toBe(401);
    expect(mockListAdmin).not.toHaveBeenCalled();
  });

  it('GET admin retorna 403 quando role não autorizada', async () => {
    const res = await request(buildApp())
      .get('/api/v1/home/admin/sections/ofertas')
      .set('x-test-role', 'guest')
      .set('x-test-user-id', '9');
    expect(res.status).toBe(403);
    expect(mockListAdmin).not.toHaveBeenCalled();
  });

  it('PUT admin rejeita payload inválido (400)', async () => {
    const res = await request(buildApp())
      .put('/api/v1/home/admin/sections/tempo')
      .set(staffHeaders)
      .send({ items: [{ entityType: 'invalid', entityId: 'x' }] });
    expect(res.status).toBe(400);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('PUT admin persiste items válidos', async () => {
    mockReplace.mockResolvedValue([
      {
        id: 2,
        section: 'ofertas',
        entityType: 'combo',
        entityId: 'familia',
        titleOverride: 'Combo Família',
        subtitleOverride: null,
        badgeText: null,
        imageUrl: null,
        ctaHref: '/ofertas?combo=familia',
        orderIndex: 0,
        isActive: true,
      },
    ]);
    const res = await request(buildApp())
      .put('/api/v1/home/admin/sections/ofertas')
      .set(staffHeaders)
      .send({
        items: [
          {
            entityType: 'combo',
            entityId: 'familia',
            titleOverride: 'Combo Família',
            ctaHref: '/ofertas?combo=familia',
            orderIndex: 0,
            isActive: true,
          },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockReplace).toHaveBeenCalled();
  });

  it('parsePlacementsPayload rejeita ctaHref inseguro', () => {
    expect(() =>
      parsePlacementsPayload({
        items: [{ entityType: 'park', entityId: 'hot-park', ctaHref: 'javascript:alert(1)' }],
      }),
    ).toThrow(/ctaHref/);
  });

  it('parseCreateItemPayload omite orderIndex quando não enviado (MAX+1 no service)', () => {
    const created = parseCreateItemPayload({
      entityType: 'park',
      entityId: 'smoke-order-check',
      ctaHref: '/parques',
    });
    expect(created.orderIndex).toBeUndefined();
    expect(created.entityId).toBe('smoke-order-check');

    const withExplicit = parseCreateItemPayload({
      entityType: 'park',
      entityId: 'explicit-order',
      ctaHref: '/parques',
      orderIndex: 7,
    });
    expect(withExplicit.orderIndex).toBe(7);
  });

  it('POST cria item no fim da fila (201) com novos campos', async () => {
    mockCreateItem.mockResolvedValue({
      id: 10,
      section: 'destinos',
      entityType: 'park',
      entityId: 'hot-park',
      titleOverride: 'Hot Park',
      subtitleOverride: 'Rio Quente',
      badgeText: 'Mais procurado',
      imageUrl: '/images/hot-park.jpg',
      ctaHref: '/parques?parque=hot-park',
      orderIndex: 3,
      isActive: true,
    });
    const res = await request(buildApp())
      .post('/api/v1/home/admin/sections/destinos/items')
      .set(staffHeaders)
      .send({
        entityType: 'park',
        entityId: 'hot-park',
        titleOverride: 'Hot Park',
        subtitleOverride: 'Rio Quente',
        badgeText: 'Mais procurado',
        imageUrl: '/images/hot-park.jpg',
        ctaHref: '/parques?parque=hot-park',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.badgeText).toBe('Mais procurado');
    expect(mockCreateItem).toHaveBeenCalled();
    const [, payload] = mockCreateItem.mock.calls[0] as [string, { orderIndex?: number }];
    expect(payload.orderIndex).toBeUndefined();
  });

  it('POST retorna 409 em unique conflict', async () => {
    mockCreateItem.mockRejectedValue(
      new HomeConflictError('Já existe item park:hot-park nesta seção'),
    );
    const res = await request(buildApp())
      .post('/api/v1/home/admin/sections/destinos/items')
      .set(staffHeaders)
      .send({ entityType: 'park', entityId: 'hot-park', ctaHref: '/parques' });
    expect(res.status).toBe(409);
  });

  it('POST retorna 401 sem token', async () => {
    const res = await request(buildApp())
      .post('/api/v1/home/admin/sections/destinos/items')
      .send({ entityType: 'park', entityId: 'hot-park' });
    expect(res.status).toBe(401);
    expect(mockCreateItem).not.toHaveBeenCalled();
  });

  it('POST retorna 403 com role não autorizada', async () => {
    const res = await request(buildApp())
      .post('/api/v1/home/admin/sections/destinos/items')
      .set('x-test-role', 'guest')
      .set('x-test-user-id', '2')
      .send({ entityType: 'park', entityId: 'hot-park' });
    expect(res.status).toBe(403);
    expect(mockCreateItem).not.toHaveBeenCalled();
  });

  it('POST rejeita ctaHref inválido (400)', async () => {
    const res = await request(buildApp())
      .post('/api/v1/home/admin/sections/destinos/items')
      .set(staffHeaders)
      .send({
        entityType: 'park',
        entityId: 'hot-park',
        ctaHref: 'https://evil.example.com/phish',
      });
    expect(res.status).toBe(400);
    expect(mockCreateItem).not.toHaveBeenCalled();
  });

  it('POST rejeita badgeText acima do limite (400)', async () => {
    const res = await request(buildApp())
      .post('/api/v1/home/admin/sections/destinos/items')
      .set(staffHeaders)
      .send({
        entityType: 'park',
        entityId: 'hot-park',
        badgeText: 'x'.repeat(65),
      });
    expect(res.status).toBe(400);
    expect(mockCreateItem).not.toHaveBeenCalled();
  });

  it('PATCH altera apenas is_active (200)', async () => {
    mockPatchItem.mockResolvedValue({
      id: 5,
      section: 'ofertas',
      entityType: 'combo',
      entityId: 'familia',
      isActive: false,
    });
    const res = await request(buildApp())
      .patch('/api/v1/home/admin/items/5')
      .set(staffHeaders)
      .send({ isActive: false });
    expect(res.status).toBe(200);
    expect(mockPatchItem).toHaveBeenCalledWith(5, { isActive: false });
  });

  it('PATCH retorna 404 quando item não existe', async () => {
    mockPatchItem.mockRejectedValue(new HomeNotFoundError());
    const res = await request(buildApp())
      .patch('/api/v1/home/admin/items/999')
      .set(staffHeaders)
      .send({ titleOverride: 'X' });
    expect(res.status).toBe(404);
  });

  it('DELETE remove por id (204)', async () => {
    const res = await request(buildApp())
      .delete('/api/v1/home/admin/items/5')
      .set(staffHeaders);
    expect(res.status).toBe(204);
    expect(mockDeleteItem).toHaveBeenCalledWith(5);
  });

  it('DELETE retorna 404 se ID não existir', async () => {
    mockDeleteItem.mockRejectedValue(new HomeNotFoundError());
    const res = await request(buildApp())
      .delete('/api/v1/home/admin/items/999')
      .set(staffHeaders);
    expect(res.status).toBe(404);
  });

  it('seoSlugBase gera nome semântico sem PII', () => {
    const name = seoSlugBase('destinos', 'Hot Park / Rio Quente!');
    expect(name).toMatch(/^destinos-hot-park-rio-quente-caldas-novas-[a-f0-9]{6}$/);
  });

  it('assertHomeUploadLimits rejeita PDF e arquivo acima do teto', () => {
    expect(() => assertHomeUploadLimits('application/pdf', 100)).toThrow(/Formato/);
    expect(() => assertHomeUploadLimits('image/jpeg', 16 * 1024 * 1024)).toThrow(/15 MB/);
  });

  it('POST upload retorna 401 sem token', async () => {
    const res = await request(buildApp())
      .post('/api/v1/home/admin/upload')
      .attach('file', TINY_PNG, { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
  });

  it('POST upload retorna 403 com role guest', async () => {
    const res = await request(buildApp())
      .post('/api/v1/home/admin/upload')
      .set('x-test-role', 'guest')
      .set('x-test-user-id', '2')
      .attach('file', TINY_PNG, { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(403);
  });

  it('POST upload PNG válido retorna 201 com URL webp/seo', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'home-up-'));
    const prev = process.env.HOME_SECTIONS_UPLOAD_DIR;
    process.env.HOME_SECTIONS_UPLOAD_DIR = dir;
    try {
      const res = await request(buildApp())
        .post('/api/v1/home/admin/upload')
        .set(staffHeaders)
        .field('section', 'destinos')
        .field('slugHint', 'hot-park')
        .attach('file', TINY_PNG, { filename: 'hot.png', contentType: 'image/png' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toMatch(/\/uploads\/home-sections\//);
      expect(res.body.data.url).toMatch(/destinos-hot-park-caldas-novas-/);
      expect(res.body.data.mediaType).toBe('image');
      expect(res.body.data.contentType).toMatch(/image\/(webp|png|jpeg)/);
    } finally {
      if (prev === undefined) delete process.env.HOME_SECTIONS_UPLOAD_DIR;
      else process.env.HOME_SECTIONS_UPLOAD_DIR = prev;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('POST upload rejeita sem arquivo (400)', async () => {
    const res = await request(buildApp())
      .post('/api/v1/home/admin/upload')
      .set(staffHeaders)
      .field('section', 'destinos');
    expect(res.status).toBe(400);
  });
});
