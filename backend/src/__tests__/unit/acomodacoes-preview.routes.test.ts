const mockObterPublicoPorPreviewToken = jest.fn();
const mockCriarPreviewLink = jest.fn();

jest.mock('../../../../server/modules/acomodacoes/services/acomodacoes.service', () => ({
  acomodacoesService: {
    obterPublicoPorPreviewToken: (...args: unknown[]) => mockObterPublicoPorPreviewToken(...args),
    listarDisponiveis: jest.fn(),
    listarPinsPublicadosPorCodigo: jest.fn(),
    listarAddons: jest.fn(),
  },
  mergeDisponiveisParaCards: jest.requireActual(
    '../../../../server/modules/acomodacoes/services/acomodacoes.service',
  ).mergeDisponiveisParaCards,
}));

jest.mock('../../../../server/modules/acomodacoes/services/anfitriao.service', () => ({
  anfitriaoService: {
    criarPreviewLink: (...args: unknown[]) => mockCriarPreviewLink(...args),
    dashboardKpis: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../../../server/middleware/public-limiter', () => ({
  publicLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

jest.mock('../../../../server/middleware/auth.middleware', () => ({
  authenticateJwt: (req: { headers: Record<string, string | undefined>; user?: unknown }, res: { status: (n: number) => { json: (b: unknown) => void } }, next: () => void) => {
    const role = req.headers['x-test-role'];
    const userId = req.headers['x-test-user-id'];
    if (!role || !userId) {
      return res.status(401).json({ success: false, error: 'Token ausente' });
    }
    req.user = { id: Number(userId), role, email: 't@test.com', name: 'Test' };
    next();
  },
  requireRole:
    (...roles: string[]) =>
    (req: { user?: { role?: string } }, res: { status: (n: number) => { json: (b: unknown) => void } }, next: () => void) => {
      if (!req.user?.role || !roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, error: 'Acesso negado' });
      }
      next();
    },
}));

import express from 'express';
import request from 'supertest';
import acomodacoesRouter from '../../../../server/modules/acomodacoes/routes/index';
import anfitriaoRouter from '../../../../server/modules/acomodacoes/routes/anfitriao.routes';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/acomodacoes', acomodacoesRouter);
  app.use('/api/v1/acomodacoes/anfitriao', anfitriaoRouter);
  return app;
}

function authHeaders(role: string, userId: number) {
  return { 'x-test-role': role, 'x-test-user-id': String(userId) };
}

describe('acomodacoes preview token routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /publico/preview/:token returns 404 when token invalid or expired', async () => {
    mockObterPublicoPorPreviewToken.mockResolvedValue(null);
    const app = buildApp();

    const res = await request(app).get('/api/v1/acomodacoes/publico/preview/invalid-token');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(mockObterPublicoPorPreviewToken).toHaveBeenCalledWith('invalid-token');
  });

  it('GET /publico/preview/:token returns listing when valid', async () => {
    mockObterPublicoPorPreviewToken.mockResolvedValue({
      id: 1,
      titulo: 'Draft',
      isPreview: true,
    });
    const app = buildApp();

    const res = await request(app).get('/api/v1/acomodacoes/publico/preview/valid-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isPreview).toBe(true);
  });

  it('POST /anfitriao/unidades/:id/preview-link returns 403 when forbidden', async () => {
    mockCriarPreviewLink.mockResolvedValue({ error: 'forbidden' });
    const app = buildApp();

    const res = await request(app)
      .post('/api/v1/acomodacoes/anfitriao/unidades/99/preview-link')
      .set(authHeaders('anfitriao', 1));

    expect(res.status).toBe(403);
    expect(mockCriarPreviewLink).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, role: 'anfitriao' }),
      99,
    );
  });

  it('POST /anfitriao/unidades/:id/preview-link returns url and expiresAt', async () => {
    mockCriarPreviewLink.mockResolvedValue({
      data: {
        url: 'https://site.test/h/preview/abc',
        expiresAt: '2026-06-04T12:00:00.000Z',
      },
    });
    const app = buildApp();

    const res = await request(app)
      .post('/api/v1/acomodacoes/anfitriao/unidades/10/preview-link')
      .set(authHeaders('anfitriao', 1));

    expect(res.status).toBe(200);
    expect(res.body.data.url).toBe('https://site.test/h/preview/abc');
    expect(res.body.data.expiresAt).toBe('2026-06-04T12:00:00.000Z');
  });
});
