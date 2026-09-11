const mockListarReservas = jest.fn();
const mockObterCalendario = jest.fn();
const mockSalvarDisponibilidade = jest.fn();

jest.mock('../../../../server/modules/acomodacoes/services/anfitriao.service', () => ({
  anfitriaoService: {
    listarReservas: (...args: unknown[]) => mockListarReservas(...args),
    obterCalendarioUnidade: (...args: unknown[]) => mockObterCalendario(...args),
    salvarDisponibilidade: (...args: unknown[]) => mockSalvarDisponibilidade(...args),
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

describe('PR-A — reservas e calendario anfitriao', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /reservas retorna lista mascarada', async () => {
    mockListarReservas.mockResolvedValue({
      data: [
        {
          propostaId: 1,
          codigo: 'P-1',
          titulo: 'Estadia',
          status: 'accepted',
          acomodacaoId: 101,
          checkIn: '2026-08-01',
          checkOut: '2026-08-05',
          valorTotal: '1000.00',
          clienteNome: 'Cliente',
          clienteEmail: 'c***@dominio.com',
          clienteTelefone: '***1234',
          aceitoEm: '2026-08-01T12:00:00.000Z',
        },
      ],
    });

    const res = await request(buildApp())
      .get('/api/v1/acomodacoes/anfitriao/reservas?de=2026-08-01&ate=2026-08-31')
      .set(authHeaders('anfitriao', 1));

    expect(res.status).toBe(200);
    expect(res.body.data[0].clienteEmail).toBe('c***@dominio.com');
    expect(mockListarReservas).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, role: 'anfitriao' }),
      { de: '2026-08-01', ate: '2026-08-31', acomodacaoId: undefined },
    );
  });

  it('GET /reservas cross-owner → 403', async () => {
    mockListarReservas.mockResolvedValue({ error: 'forbidden' });
    const res = await request(buildApp())
      .get('/api/v1/acomodacoes/anfitriao/reservas?de=2026-08-01&ate=2026-08-31&acomodacaoId=202')
      .set(authHeaders('anfitriao', 1));
    expect(res.status).toBe(403);
  });

  it('GET /unidades/:id/calendario retorna estados', async () => {
    mockObterCalendario.mockResolvedValue({
      data: [
        { data: '2026-08-01', estado: 'livre', disponivel: true, precoOverride: null, observacao: null, readOnly: false },
        { data: '2026-08-02', estado: 'reservado', disponivel: false, precoOverride: null, observacao: 'reservado', readOnly: true },
      ],
    });

    const res = await request(buildApp())
      .get('/api/v1/acomodacoes/anfitriao/unidades/101/calendario?de=2026-08-01&ate=2026-08-07')
      .set(authHeaders('anfitriao', 1));

    expect(res.status).toBe(200);
    expect(res.body.data[1].estado).toBe('reservado');
  });

  it('PUT disponibilidade dia reservado → 403', async () => {
    mockSalvarDisponibilidade.mockResolvedValue({ error: 'day_reserved' });
    const res = await request(buildApp())
      .put('/api/v1/acomodacoes/anfitriao/unidades/101/disponibilidade')
      .set(authHeaders('anfitriao', 1))
      .send({ dias: [{ data: '2026-08-02', disponivel: true }] });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/reservado/i);
  });
});
