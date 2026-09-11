const mockExportImpostosCsv = jest.fn();

jest.mock('../../../../server/modules/acomodacoes/services/anfitriao.service', () => ({
  anfitriaoService: {
    exportImpostosCsv: (...args: unknown[]) => mockExportImpostosCsv(...args),
    desarquivarUnidadesBulk: jest.fn(),
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

describe('anfitriao impostos export route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET impostos/export.csv returns CSV with attachment headers', async () => {
    mockExportImpostosCsv.mockResolvedValue(
      'id,titulo,hotelId,isento,aliquotaPct,inscricaoMunicipal,cnpjMascarado,temNotas\n1,"Test",H1,false,,,**.***.***/****-81,nao',
    );

    const res = await request(buildApp())
      .get('/api/v1/acomodacoes/anfitriao/impostos/export.csv?ativo=true')
      .set(authHeaders('anfitriao', 1));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="impostos-anfitriao-rsv360.csv"',
    );
    expect(res.text).toContain('cnpjMascarado');
    expect(mockExportImpostosCsv).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, role: 'anfitriao' }),
      { ativo: 'true' },
    );
  });

  it('GET impostos/export.csv returns 400 for invalid ativo', async () => {
    const res = await request(buildApp())
      .get('/api/v1/acomodacoes/anfitriao/impostos/export.csv?ativo=invalid')
      .set(authHeaders('anfitriao', 1));

    expect(res.status).toBe(400);
    expect(mockExportImpostosCsv).not.toHaveBeenCalled();
  });

  it('GET impostos/export.csv returns 401 without auth', async () => {
    const res = await request(buildApp()).get(
      '/api/v1/acomodacoes/anfitriao/impostos/export.csv',
    );

    expect(res.status).toBe(401);
    expect(mockExportImpostosCsv).not.toHaveBeenCalled();
  });
});
