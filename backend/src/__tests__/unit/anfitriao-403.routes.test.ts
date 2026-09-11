const mockListarMinhas = jest.fn();
const mockObterUnidade = jest.fn();
const mockAtualizarUnidade = jest.fn();
const mockEnviarAprovacao = jest.fn();
const mockAprovarUnidade = jest.fn();
const mockRejeitarUnidade = jest.fn();
const mockListarDisponibilidade = jest.fn();

jest.mock('../../../../server/modules/acomodacoes/services/anfitriao.service', () => ({
  anfitriaoService: {
    listarMinhas: (...args: unknown[]) => mockListarMinhas(...args),
    obterUnidade: (...args: unknown[]) => mockObterUnidade(...args),
    atualizarUnidade: (...args: unknown[]) => mockAtualizarUnidade(...args),
    enviarAprovacao: (...args: unknown[]) => mockEnviarAprovacao(...args),
    aprovarUnidade: (...args: unknown[]) => mockAprovarUnidade(...args),
    rejeitarUnidade: (...args: unknown[]) => mockRejeitarUnidade(...args),
    listarDisponibilidade: (...args: unknown[]) => mockListarDisponibilidade(...args),
    dashboardKpis: jest.fn().mockResolvedValue({}),
    salvarDisponibilidade: jest.fn(),
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
import acomodacoesRouter from '../../../../server/modules/acomodacoes/routes/index';
import anfitriaoRouter from '../../../../server/modules/acomodacoes/routes/anfitriao.routes';

const U_A = { id: 101, titulo: 'U_A', proprietarioId: 1, statusPublicacao: 'completo', dadosCompletos: true };
const U_B = { id: 202, titulo: 'U_B', proprietarioId: 2, statusPublicacao: 'rascunho', dadosCompletos: false };

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

describe('PR 24A — escopo cross-owner (403)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. GET /minhas — escopo por papel', () => {
    it('anfitrião A vê só U_A', async () => {
      mockListarMinhas.mockResolvedValue({ items: [U_A], total: 1, page: 1, pageSize: 20 });
      const res = await request(buildApp())
        .get('/api/v1/acomodacoes/anfitriao/minhas')
        .set(authHeaders('anfitriao', 1));
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].id).toBe(101);
      expect(mockListarMinhas).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, role: 'anfitriao' }),
        1,
        20,
        { ativo: 'true' },
      );
    });

    it('rejeita ativo inválido com 400', async () => {
      const res = await request(buildApp())
        .get('/api/v1/acomodacoes/anfitriao/minhas?ativo=sim')
        .set(authHeaders('anfitriao', 1));
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(mockListarMinhas).not.toHaveBeenCalled();
    });

    it('repassa filtro ativo=false ao serviço', async () => {
      mockListarMinhas.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
      await request(buildApp())
        .get('/api/v1/acomodacoes/anfitriao/minhas?ativo=false')
        .set(authHeaders('anfitriao', 1));
      expect(mockListarMinhas).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, role: 'anfitriao' }),
        1,
        20,
        { ativo: 'false' },
      );
    });

    it('corretor C vê U_A da carteira', async () => {
      mockListarMinhas.mockResolvedValue({ items: [U_A], total: 1, page: 1, pageSize: 20 });
      const res = await request(buildApp())
        .get('/api/v1/acomodacoes/anfitriao/minhas')
        .set(authHeaders('corretor', 3));
      expect(res.status).toBe(200);
      expect(res.body.data.items[0].proprietarioId).toBe(1);
    });

    it('anfitrião B vê U_B', async () => {
      mockListarMinhas.mockResolvedValue({ items: [U_B], total: 1, page: 1, pageSize: 20 });
      const res = await request(buildApp())
        .get('/api/v1/acomodacoes/anfitriao/minhas')
        .set(authHeaders('anfitriao', 2));
      expect(res.status).toBe(200);
      expect(res.body.data.items[0].id).toBe(202);
    });
  });

  describe('2. GET /unidades/:id — 403 cross-owner', () => {
    it('A em U_B → 403', async () => {
      mockObterUnidade.mockResolvedValue({ error: 'forbidden' });
      const res = await request(buildApp())
        .get('/api/v1/acomodacoes/anfitriao/unidades/202')
        .set(authHeaders('anfitriao', 1));
      expect(res.status).toBe(403);
    });

    it('corretor C fora da carteira em U_B → 403', async () => {
      mockObterUnidade.mockResolvedValue({ error: 'forbidden' });
      const res = await request(buildApp())
        .get('/api/v1/acomodacoes/anfitriao/unidades/202')
        .set(authHeaders('corretor', 3));
      expect(res.status).toBe(403);
    });

    it('A em U_A → 200', async () => {
      mockObterUnidade.mockResolvedValue({ data: U_A });
      const res = await request(buildApp())
        .get('/api/v1/acomodacoes/anfitriao/unidades/101')
        .set(authHeaders('anfitriao', 1));
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(101);
    });
  });

  describe('3. PATCH /unidades/:id — 403 e campos read-only', () => {
    it('B editando U_A → 403', async () => {
      mockAtualizarUnidade.mockResolvedValue({ error: 'forbidden' });
      const res = await request(buildApp())
        .patch('/api/v1/acomodacoes/anfitriao/unidades/101')
        .set(authHeaders('anfitriao', 2))
        .send({ precoDiaria: '999' });
      expect(res.status).toBe(403);
    });

    it('campos read-only são repassados ao service (strip no service)', async () => {
      mockAtualizarUnidade.mockResolvedValue({ data: { ...U_A, precoDiaria: '300' } });
      await request(buildApp())
        .patch('/api/v1/acomodacoes/anfitriao/unidades/101')
        .set(authHeaders('anfitriao', 1))
        .send({ hotelId: 'hack', proprietarioId: 99, tipoId: 9, codigoExterno: 'X', precoDiaria: '300' });
      expect(mockAtualizarUnidade).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, role: 'anfitriao' }),
        101,
        expect.objectContaining({ precoDiaria: '300', hotelId: 'hack' }),
      );
    });
  });

  describe('4. POST enviar-aprovacao — 403 e status completo', () => {
    it('terceiro sem escopo → 403', async () => {
      mockEnviarAprovacao.mockResolvedValue({ error: 'forbidden' });
      const res = await request(buildApp())
        .post('/api/v1/acomodacoes/anfitriao/unidades/101/enviar-aprovacao')
        .set(authHeaders('corretor', 9));
      expect(res.status).toBe(403);
    });

    it('status inválido → 409', async () => {
      mockEnviarAprovacao.mockResolvedValue({ error: 'invalid_status' });
      const res = await request(buildApp())
        .post('/api/v1/acomodacoes/anfitriao/unidades/202/enviar-aprovacao')
        .set(authHeaders('anfitriao', 2));
      expect(res.status).toBe(409);
    });

    it('completo → 200', async () => {
      mockEnviarAprovacao.mockResolvedValue({
        data: { ...U_A, statusPublicacao: 'em_aprovacao' },
      });
      const res = await request(buildApp())
        .post('/api/v1/acomodacoes/anfitriao/unidades/101/enviar-aprovacao')
        .set(authHeaders('anfitriao', 1));
      expect(res.status).toBe(200);
    });
  });

  describe('5. Staff aprovar/rejeitar', () => {
    it('anfitrião → 403 na rota staff', async () => {
      const res = await request(buildApp())
        .post('/api/v1/acomodacoes/anfitriao/admin/unidades/101/aprovar')
        .set(authHeaders('anfitriao', 1));
      expect(res.status).toBe(403);
    });

    it('staff → 200 ao aprovar', async () => {
      mockAprovarUnidade.mockResolvedValue({
        data: { ...U_A, statusPublicacao: 'publicado' },
      });
      const res = await request(buildApp())
        .post('/api/v1/acomodacoes/anfitriao/admin/unidades/101/aprovar')
        .set(authHeaders('admin', 10));
      expect(res.status).toBe(200);
      expect(res.body.data.statusPublicacao).toBe('publicado');
    });

    it('corretor → 403 ao rejeitar', async () => {
      const res = await request(buildApp())
        .post('/api/v1/acomodacoes/anfitriao/admin/unidades/101/rejeitar')
        .set(authHeaders('corretor', 3))
        .send({ motivo: 'teste' });
      expect(res.status).toBe(403);
    });
  });

  describe('6. Carteira pausada — corretor perde acesso', () => {
    it('GET unidade fora da carteira ativa → 403', async () => {
      mockObterUnidade.mockResolvedValue({ error: 'forbidden' });
      const res = await request(buildApp())
        .get('/api/v1/acomodacoes/anfitriao/unidades/101')
        .set(authHeaders('corretor', 3));
      expect(res.status).toBe(403);
      expect(mockObterUnidade).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 3, role: 'corretor' }),
        101,
      );
    });
  });

  describe('7. §11.2 — rota legado PATCH /anfitriao/:id removida', () => {
    it('PATCH legado retorna 404 (usar /anfitriao/unidades/:id)', async () => {
      const res = await request(buildApp())
        .patch('/api/v1/acomodacoes/anfitriao/101')
        .set(authHeaders('admin', 10))
        .send({ midia: [] });
      expect(res.status).toBe(404);
    });

    it('PATCH inexistente em /unidades/:id → 404', async () => {
      mockAtualizarUnidade.mockResolvedValue({ error: 'not_found' });
      const res = await request(buildApp())
        .patch('/api/v1/acomodacoes/anfitriao/unidades/99999')
        .set(authHeaders('anfitriao', 1))
        .send({ midia: [] });
      expect(res.status).toBe(404);
    });
  });
});
