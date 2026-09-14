const mockContarInboxNaoLidas = jest.fn();
const mockListarInboxMensagens = jest.fn();

jest.mock('../../../../server/modules/acomodacoes/services/anfitriao.service', () => ({
  anfitriaoService: {
    contarInboxNaoLidas: (...args: unknown[]) => mockContarInboxNaoLidas(...args),
    listarInboxMensagens: (...args: unknown[]) => mockListarInboxMensagens(...args),
    listarMensagensReserva: jest.fn(),
    enviarMensagemReserva: jest.fn(),
    desarquivarUnidadesBulk: jest.fn(),
    exportImpostosCsv: jest.fn(),
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

jest.mock('../../../../server/modules/acomodacoes/services/desempenho.service', () => ({
  desempenhoService: {
    obterMetricas: jest.fn(),
    relatorioCsv: jest.fn(),
    relatorioFiscalCsv: jest.fn(),
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

describe('Aruanda A12 — mensagens unread-count', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /mensagens/unread-count returns count for parceiro', async () => {
    mockContarInboxNaoLidas.mockResolvedValue({ data: { unread: 3 } });

    const res = await request(buildApp())
      .get('/api/v1/acomodacoes/anfitriao/mensagens/unread-count?de=2026-01-01&ate=2026-12-31')
      .set(authHeaders('anfitriao', 1));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { unread: 3 } });
    expect(mockContarInboxNaoLidas).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, role: 'anfitriao' }),
      { de: '2026-01-01', ate: '2026-12-31' },
    );
  });

  it('GET /mensagens/unread-count returns 400 without dates', async () => {
    const res = await request(buildApp())
      .get('/api/v1/acomodacoes/anfitriao/mensagens/unread-count')
      .set(authHeaders('anfitriao', 1));

    expect(res.status).toBe(400);
    expect(mockContarInboxNaoLidas).not.toHaveBeenCalled();
  });

  it('GET /mensagens/unread-count returns 401 without auth', async () => {
    const res = await request(buildApp()).get(
      '/api/v1/acomodacoes/anfitriao/mensagens/unread-count?de=2026-01-01&ate=2026-12-31',
    );

    expect(res.status).toBe(401);
    expect(mockContarInboxNaoLidas).not.toHaveBeenCalled();
  });
});
