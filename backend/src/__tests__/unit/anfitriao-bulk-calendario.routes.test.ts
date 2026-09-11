const mockBulkBloquear = jest.fn();
const mockBulkDesbloquear = jest.fn();
const mockAjustarPreco = jest.fn();
const mockObterCalendarioAgregado = jest.fn();
const mockObterCalendario = jest.fn();

jest.mock('../../../../server/modules/acomodacoes/services/anfitriao.service', () => ({
  anfitriaoService: {
    bulkBloquearDatas: (...args: unknown[]) => mockBulkBloquear(...args),
    bulkDesbloquearDatas: (...args: unknown[]) => mockBulkDesbloquear(...args),
    ajustarPrecoDatas: (...args: unknown[]) => mockAjustarPreco(...args),
    obterCalendarioAgregado: (...args: unknown[]) => mockObterCalendarioAgregado(...args),
    obterCalendarioUnidade: (...args: unknown[]) => mockObterCalendario(...args),
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

const datas30 = Array.from({ length: 30 }, (_, i) => {
  const d = new Date('2026-08-01T12:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
});

describe('PR-C — bulk calendario anfitriao', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST bloquear bulk 30 dias -> ok', async () => {
    mockBulkBloquear.mockResolvedValue({ ok: true, count: 30 });
    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/anfitriao/unidades/101/disponibilidade/bloquear')
      .set(authHeaders('anfitriao', 1))
      .send({ datas: datas30 });

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(30);
    expect(mockBulkBloquear).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, role: 'anfitriao' }),
      101,
      datas30,
      undefined,
    );
  });

  it('POST bloquear dia reservado -> 409', async () => {
    mockBulkBloquear.mockResolvedValue({ error: 'day_reserved_conflict' });
    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/anfitriao/unidades/101/disponibilidade/bloquear')
      .set(authHeaders('anfitriao', 1))
      .send({ datas: ['2026-08-02'] });

    expect(res.status).toBe(409);
  });

  it('POST desbloquear mantem reservado -> 403', async () => {
    mockBulkDesbloquear.mockResolvedValue({ error: 'day_reserved' });
    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/anfitriao/unidades/101/disponibilidade/desbloquear')
      .set(authHeaders('anfitriao', 1))
      .send({ datas: ['2026-08-02'] });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/reservado/i);
  });

  it('POST desbloquear bulk -> ok', async () => {
    mockBulkDesbloquear.mockResolvedValue({ ok: true, count: 2 });
    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/anfitriao/unidades/101/disponibilidade/desbloquear')
      .set(authHeaders('anfitriao', 1))
      .send({ datas: ['2026-08-01', '2026-08-03'] });

    expect(res.status).toBe(200);
  });

  it('POST preco override -> ok e GET calendario reflete', async () => {
    mockAjustarPreco.mockResolvedValue({ ok: true, count: 1, preco: '350.00' });
    mockObterCalendario.mockResolvedValue({
      data: [
        {
          data: '2026-08-01',
          estado: 'livre',
          disponivel: true,
          precoOverride: '350.00',
          observacao: null,
          readOnly: false,
        },
      ],
    });

    const precoRes = await request(buildApp())
      .post('/api/v1/acomodacoes/anfitriao/unidades/101/disponibilidade/preco')
      .set(authHeaders('anfitriao', 1))
      .send({ datas: ['2026-08-01'], preco: 350 });

    expect(precoRes.status).toBe(200);

    const calRes = await request(buildApp())
      .get('/api/v1/acomodacoes/anfitriao/unidades/101/calendario?de=2026-08-01&ate=2026-08-07')
      .set(authHeaders('anfitriao', 1));

    expect(calRes.status).toBe(200);
    expect(calRes.body.data[0].precoOverride).toBe('350.00');
  });

  it('escopo 403 unidade de outro anfitriao', async () => {
    mockBulkBloquear.mockResolvedValue({ error: 'forbidden' });
    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/anfitriao/unidades/202/disponibilidade/bloquear')
      .set(authHeaders('anfitriao', 1))
      .send({ datas: ['2026-08-01'] });

    expect(res.status).toBe(403);
  });

  it('GET /calendario agregado', async () => {
    mockObterCalendarioAgregado.mockResolvedValue({
      data: [
        {
          acomodacaoId: 101,
          titulo: 'Apto',
          hotelId: 'hotel-x',
          dias: [{ data: '2026-08-01', estado: 'bloqueado', precoOverride: null }],
        },
      ],
      de: '2026-08-01',
      ate: '2026-08-31',
    });

    const res = await request(buildApp())
      .get('/api/v1/acomodacoes/anfitriao/calendario?de=2026-08-01&ate=2026-08-31')
      .set(authHeaders('anfitriao', 1));

    expect(res.status).toBe(200);
    expect(res.body.data.data[0].dias[0].estado).toBe('bloqueado');
  });
});
