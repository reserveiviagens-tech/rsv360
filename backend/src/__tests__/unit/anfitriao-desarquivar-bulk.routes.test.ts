const mockDesarquivarUnidadesBulk = jest.fn();

jest.mock('../../../../server/modules/acomodacoes/services/anfitriao.service', () => ({
  anfitriaoService: {
    desarquivarUnidadesBulk: (...args: unknown[]) => mockDesarquivarUnidadesBulk(...args),
    bulkBloquearDatas: jest.fn(),
    bulkDesbloquearDatas: jest.fn(),
    ajustarPrecoDatas: jest.fn(),
    obterCalendarioAgregado: jest.fn(),
    obterCalendarioUnidade: jest.fn(),
    listarReservas: jest.fn(),
    salvarDisponibilidade: jest.fn(),
    listarMinhas: jest.fn(),
    obterUnidade: jest.fn(),
    dashboardKpis: jest.fn(),
    listarDisponibilidade: jest.fn(),
    atualizarUnidade: jest.fn(),
    enviarAprovacao: jest.fn(),
    aprovarUnidade: jest.fn(),
    rejeitarUnidade: jest.fn(),
    atribuirCarteira: jest.fn(),
    desarquivarUnidade: jest.fn(),
    arquivarUnidade: jest.fn(),
  },
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
import anfitriaoRouter from '../../../../server/modules/acomodacoes/routes/anfitriao.routes';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/acomodacoes/anfitriao', anfitriaoRouter);
  return app;
}

function authHeaders(role: string, userId: number) {
  return { 'x-test-role': role, 'x-test-user-id': String(userId) };
}

describe('anfitriao desarquivar-bulk route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST desarquivar-bulk returns 400 for invalid ids', async () => {
    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/anfitriao/unidades/desarquivar-bulk')
      .set(authHeaders('anfitriao', 1))
      .send({ ids: [] });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockDesarquivarUnidadesBulk).not.toHaveBeenCalled();
  });

  it('POST desarquivar-bulk returns 400 for invalid motivo type', async () => {
    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/anfitriao/unidades/desarquivar-bulk')
      .set(authHeaders('anfitriao', 1))
      .send({ ids: [1, 2], motivo: 123 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Motivo deve ser texto');
    expect(mockDesarquivarUnidadesBulk).not.toHaveBeenCalled();
  });

  it('POST desarquivar-bulk returns 200 with per-id results', async () => {
    mockDesarquivarUnidadesBulk.mockResolvedValue({
      results: [
        { id: 1, ok: true },
        { id: 2, ok: false, error: 'not_found' },
      ],
      restored: 1,
      already_restored: 0,
      failed: 1,
    });

    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/anfitriao/unidades/desarquivar-bulk')
      .set(authHeaders('anfitriao', 1))
      .send({ ids: [1, 2], motivo: 'retomada' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.restored).toBe(1);
    expect(mockDesarquivarUnidadesBulk).toHaveBeenCalledWith(
      { userId: 1, role: 'anfitriao' },
      [1, 2],
      { motivo: 'retomada' },
    );
  });

  it('POST desarquivar-bulk returns 400 when service rejects motivo', async () => {
    mockDesarquivarUnidadesBulk.mockResolvedValue({
      error: 'invalid_motivo',
      message: 'Motivo inválido',
    });

    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/anfitriao/unidades/desarquivar-bulk')
      .set(authHeaders('anfitriao', 1))
      .send({ ids: [1], motivo: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Motivo inválido');
  });
});
