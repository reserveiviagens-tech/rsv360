const mockObterRateCalendar = jest.fn();
const mockAplicarDesconto = jest.fn();
const mockAtualizarDia = jest.fn();
const mockValidarDesconto = jest.fn();

jest.mock('../../../../server/modules/acomodacoes/services/rate-calendar.service', () => ({
  rateCalendarService: {
    obterRateCalendar: (...args: unknown[]) => mockObterRateCalendar(...args),
    aplicarDesconto: (...args: unknown[]) => mockAplicarDesconto(...args),
    atualizarDia: (...args: unknown[]) => mockAtualizarDia(...args),
    atualizarPricingDefaults: jest.fn(),
    validarDescontoProposto: (...args: unknown[]) => mockValidarDesconto(...args),
    getPoliticaDesconto: jest.fn(),
    upsertPoliticaDesconto: jest.fn(),
  },
}));

jest.mock('../../../../server/modules/acomodacoes/services/anfitriao.service', () => ({
  anfitriaoService: {
    listarReservas: jest.fn(),
    obterCalendarioUnidade: jest.fn(),
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
    bulkBloquearDatas: jest.fn(),
    bulkDesbloquearDatas: jest.fn(),
    ajustarPrecoDatas: jest.fn(),
    obterCalendarioAgregado: jest.fn(),
  },
}));

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
  requireRole:
    (...roles: string[]) =>
    (
      req: { user?: { role?: string } },
      res: { status: (n: number) => { json: (b: unknown) => void } },
      next: () => void,
    ) => {
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

describe('rate-calendar routes RBAC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET rate-calendar sem auth → 401', async () => {
    const res = await request(buildApp()).get(
      '/api/v1/acomodacoes/anfitriao/unidades/1/rate-calendar?de=2026-09-01&ate=2026-09-30',
    );
    expect(res.status).toBe(401);
  });

  it('PUT rate-calendar/day como corretor → 403', async () => {
    const res = await request(buildApp())
      .put('/api/v1/acomodacoes/anfitriao/unidades/1/rate-calendar/day')
      .set(authHeaders('corretor', 5))
      .send({ data: '2026-09-10', preco: 99 });
    expect(res.status).toBe(403);
  });

  it('POST aplicar-desconto acima do teto → 403', async () => {
    mockAplicarDesconto.mockResolvedValue({
      error: 'discount_cap',
      message: 'Desconto máximo permitido: 10%',
      teto: 10,
    });
    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/anfitriao/unidades/1/aplicar-desconto')
      .set(authHeaders('corretor', 5))
      .send({ datas: ['2026-09-10'], percentual: 25 });
    expect(res.status).toBe(403);
    expect(res.body.teto).toBe(10);
  });

  it('GET rate-calendar como corretor → 200', async () => {
    mockObterRateCalendar.mockResolvedValue({
      data: { acomodacaoId: 1, dias: [], canEditPricing: false, canApplyDiscount: true },
    });
    const res = await request(buildApp())
      .get('/api/v1/acomodacoes/anfitriao/unidades/1/rate-calendar?de=2026-09-01&ate=2026-09-30')
      .set(authHeaders('corretor', 5));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
