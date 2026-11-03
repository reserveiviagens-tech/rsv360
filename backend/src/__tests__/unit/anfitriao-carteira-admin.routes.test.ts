const mockListarCarteiraCorretor = jest.fn();
const mockBuscarCorretoresStaff = jest.fn();
const mockBuscarProprietariosStaff = jest.fn();
const mockAtribuirCarteira = jest.fn();
const mockAtribuirCarteiraBulk = jest.fn();
const mockAtualizarStatusCarteira = jest.fn();

jest.mock('../../../../server/modules/acomodacoes/services/anfitriao.service', () => ({
  anfitriaoService: {
    listarCarteiraCorretor: (...args: unknown[]) => mockListarCarteiraCorretor(...args),
    buscarCorretoresStaff: (...args: unknown[]) => mockBuscarCorretoresStaff(...args),
    buscarProprietariosStaff: (...args: unknown[]) => mockBuscarProprietariosStaff(...args),
    atribuirCarteira: (...args: unknown[]) => mockAtribuirCarteira(...args),
    atribuirCarteiraBulk: (...args: unknown[]) => mockAtribuirCarteiraBulk(...args),
    atualizarStatusCarteira: (...args: unknown[]) => mockAtualizarStatusCarteira(...args),
    listarVerificacoesLocal: jest.fn(),
    decidirVerificacaoLocal: jest.fn(),
    listarMinhas: jest.fn(),
    obterUnidade: jest.fn(),
    aprovarUnidade: jest.fn(),
    rejeitarUnidade: jest.fn(),
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

describe('P0.5 — admin carteira corretor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /admin/carteira returns paginated list for manager', async () => {
    mockListarCarteiraCorretor.mockResolvedValue({
      items: [{ corretorId: 2, proprietarioId: 10, status: 'ativo' }],
      page: 1,
      pageSize: 25,
      total: 1,
    });

    const res = await request(buildApp())
      .get('/api/v1/acomodacoes/anfitriao/admin/carteira?corretorId=2')
      .set(authHeaders('manager', 1));

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(mockListarCarteiraCorretor).toHaveBeenCalledWith(
      'manager',
      expect.objectContaining({ corretorId: 2 }),
    );
  });

  it('GET /admin/carteira → 403 for corretor', async () => {
    const res = await request(buildApp())
      .get('/api/v1/acomodacoes/anfitriao/admin/carteira')
      .set(authHeaders('corretor', 5));

    expect(res.status).toBe(403);
    expect(mockListarCarteiraCorretor).not.toHaveBeenCalled();
  });

  it('POST /admin/carteira/bulk validates body', async () => {
    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/anfitriao/admin/carteira/bulk')
      .set(authHeaders('admin', 1))
      .send({});

    expect(res.status).toBe(400);
    expect(mockAtribuirCarteiraBulk).not.toHaveBeenCalled();
  });

  it('POST /admin/carteira/bulk forwards items', async () => {
    mockAtribuirCarteiraBulk.mockResolvedValue({
      summary: { ok: 1, fail: 0, total: 1 },
      results: [{ corretorId: 2, proprietarioId: 10, ok: true }],
    });

    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/anfitriao/admin/carteira/bulk')
      .set(authHeaders('admin', 1))
      .send({ items: [{ corretorId: 2, proprietarioId: 10 }] });

    expect(res.status).toBe(200);
    expect(res.body.data.summary.ok).toBe(1);
  });

  it('PATCH /admin/carteira inactivates link', async () => {
    mockAtualizarStatusCarteira.mockResolvedValue({ ok: true, data: { status: 'inativo' } });

    const res = await request(buildApp())
      .patch('/api/v1/acomodacoes/anfitriao/admin/carteira')
      .set(authHeaders('admin', 1))
      .send({ corretorId: 2, proprietarioId: 10, status: 'inativo' });

    expect(res.status).toBe(200);
    expect(mockAtualizarStatusCarteira).toHaveBeenCalledWith('admin', 2, 10, 'inativo');
  });

  it('GET /admin/carteira/corretores autocomplete', async () => {
    mockBuscarCorretoresStaff.mockResolvedValue({ items: [{ id: 2, name: 'Cor', email: 'c@x.com' }] });

    const res = await request(buildApp())
      .get('/api/v1/acomodacoes/anfitriao/admin/carteira/corretores?q=cor')
      .set(authHeaders('admin', 1));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});
