const mockConvidar = jest.fn();
const mockRevogar = jest.fn();
const mockAceitar = jest.fn();
const mockRemover = jest.fn();

jest.mock('../../../../server/modules/acomodacoes/services/anfitriao.service', () => ({
  anfitriaoService: {
    convidarCoanfitriao: (...args: unknown[]) => mockConvidar(...args),
    revogarCoanfitriao: (...args: unknown[]) => mockRevogar(...args),
    aceitarConviteCoanfitriao: (...args: unknown[]) => mockAceitar(...args),
    removerCoanfitriao: (...args: unknown[]) => mockRemover(...args),
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
    const emailHeader = req.headers['x-test-email'];
    req.user = {
      id: Number(userId),
      role,
      email: typeof emailHeader === 'string' ? emailHeader : 'owner@test.local',
      name: 'Test',
    };
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

function authHeaders(role: string, userId: number, email?: string) {
  const headers: Record<string, string> = {
    'x-test-role': role,
    'x-test-user-id': String(userId),
  };
  if (email) headers['x-test-email'] = email;
  return headers;
}

describe('anfitriao coanfitrioes routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST convidar without email -> 400', async () => {
    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/anfitriao/unidades/101/coanfitrioes')
      .set(authHeaders('anfitriao', 1))
      .send({ nome: 'Maria', email: '   ', papel: 'tudo' });

    expect(res.status).toBe(400);
    expect(mockConvidar).not.toHaveBeenCalled();
  });

  it('POST convidar with email calls service with auth email context', async () => {
    mockConvidar.mockResolvedValue({
      data: [
        {
          id: 'c1',
          nome: 'Maria',
          email: 'cohost@test.local',
          papel: 'tudo',
          status: 'pendente',
        },
      ],
    });

    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/anfitriao/unidades/101/coanfitrioes')
      .set(authHeaders('anfitriao', 1, 'owner@test.local'))
      .send({ nome: 'Maria', email: 'cohost@test.local', papel: 'tudo' });

    expect(res.status).toBe(200);
    expect(mockConvidar).toHaveBeenCalledWith(
      { userId: 1, role: 'anfitriao', email: 'owner@test.local' },
      101,
      { nome: 'Maria', email: 'cohost@test.local', papel: 'tudo' },
    );
  });

  it('POST aceitar without matching invite email -> 403', async () => {
    mockAceitar.mockResolvedValue({ error: 'forbidden' });

    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/anfitriao/unidades/101/coanfitrioes/c1/aceitar')
      .set(authHeaders('anfitriao', 99, 'other@test.local'));

    expect(res.status).toBe(403);
    expect(mockAceitar).toHaveBeenCalledWith(
      { userId: 99, role: 'anfitriao', email: 'other@test.local' },
      101,
      'c1',
    );
  });

  it('POST aceitar without session email -> 400', async () => {
    mockAceitar.mockResolvedValue({ error: 'email_required' });

    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/anfitriao/unidades/101/coanfitrioes/c1/aceitar')
      .set(authHeaders('anfitriao', 99, ''));

    expect(res.status).toBe(400);
  });

  it('POST convidar with duplicate active email -> 409', async () => {
    mockConvidar.mockResolvedValue({ error: 'already_invited' });

    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/anfitriao/unidades/101/coanfitrioes')
      .set(authHeaders('anfitriao', 1, 'owner@test.local'))
      .send({ nome: 'Maria', email: 'cohost@test.local', papel: 'tudo' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/convite/i);
  });
});
