const mockAplicarConjunto = jest.fn();

jest.mock('../../../../server/modules/acomodacoes/services/rate-calendar.service', () => ({
  rateCalendarService: {
    aplicarConjuntoRegras: (...args: unknown[]) => mockAplicarConjunto(...args),
    obterRateCalendar: jest.fn(),
    atualizarDia: jest.fn(),
    atualizarPricingDefaults: jest.fn(),
    aplicarDesconto: jest.fn(),
    validarDescontoProposto: jest.fn(),
  },
}));

jest.mock('../../../../server/modules/acomodacoes/services/anfitriao.service', () => ({
  anfitriaoService: {
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

describe('POST conjuntos-regras aplicar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for invalid dates', async () => {
    mockAplicarConjunto.mockResolvedValue({
      error: 'invalid_dates',
      message: 'de não pode ser posterior a ate',
    });

    const res = await request(buildApp())
      .post(
        '/api/v1/acomodacoes/anfitriao/unidades/101/conjuntos-regras/a1b2c3d4-e5f6-4789-a012-3456789abcde/aplicar',
      )
      .set(authHeaders('anfitriao', 1))
      .send({ de: '2026-09-10', ate: '2026-09-01' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/posterior/i);
  });

  it('returns 404 when conjunto not found', async () => {
    mockAplicarConjunto.mockResolvedValue({
      error: 'conjunto_not_found',
      message: 'Conjunto de regras não encontrado',
    });

    const res = await request(buildApp())
      .post(
        '/api/v1/acomodacoes/anfitriao/unidades/101/conjuntos-regras/a1b2c3d4-e5f6-4789-a012-3456789abcde/aplicar',
      )
      .set(authHeaders('anfitriao', 1))
      .send({ de: '2026-09-01', ate: '2026-09-05' });

    expect(res.status).toBe(404);
  });

  it('returns 200 on successful apply', async () => {
    mockAplicarConjunto.mockResolvedValue({
      ok: true,
      conjuntoId: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
      de: '2026-09-01',
      ate: '2026-09-05',
      diasNoIntervalo: 5,
      diasBloqueados: 0,
      precosAplicados: 5,
    });

    const res = await request(buildApp())
      .post(
        '/api/v1/acomodacoes/anfitriao/unidades/101/conjuntos-regras/a1b2c3d4-e5f6-4789-a012-3456789abcde/aplicar',
      )
      .set(authHeaders('anfitriao', 1))
      .send({ de: '2026-09-01', ate: '2026-09-05' });

    expect(res.status).toBe(200);
    expect(res.body.data.precosAplicados).toBe(5);
  });

  it('returns 403 for corretor role (masterAuth)', async () => {
    const res = await request(buildApp())
      .post(
        '/api/v1/acomodacoes/anfitriao/unidades/101/conjuntos-regras/a1b2c3d4-e5f6-4789-a012-3456789abcde/aplicar',
      )
      .set(authHeaders('corretor', 2))
      .send({ de: '2026-09-01', ate: '2026-09-05' });

    expect(res.status).toBe(403);
    expect(mockAplicarConjunto).not.toHaveBeenCalled();
  });
});
