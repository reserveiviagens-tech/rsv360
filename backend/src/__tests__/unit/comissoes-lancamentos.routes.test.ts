const mockGerarLancamentos = jest.fn();

jest.mock('../../../../server/modules/comissoes/services/comissoes.service', () => ({
  comissoesService: {
    gerarLancamentos: (...args: unknown[]) => mockGerarLancamentos(...args),
    getConfig: jest.fn(),
    listarMinhas: jest.fn(),
  },
  simularComissoes: jest.fn(),
}));

jest.mock('../../../../server/middleware/auth.middleware', () => ({
  authenticateJwt: (
    req: { headers: Record<string, string | undefined>; user?: unknown },
    res: { status: (n: number) => { json: (b: unknown) => void } },
    next: () => void,
  ) => {
    if (!req.headers['x-test-role']) {
      return res.status(401).json({ success: false, error: 'Token ausente' });
    }
    req.user = { id: 1, role: req.headers['x-test-role'] };
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
import comissoesRouter from '../../../../server/modules/comissoes/routes/index';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/comissoes', comissoesRouter);
  return app;
}

describe('POST /comissoes/lancamentos/gerar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('409 when proposta not paid', async () => {
    mockGerarLancamentos.mockResolvedValue({
      generated: false,
      reason: 'proposta_status_blocked',
      statusProposta: 'pending',
      message: 'Liquidação bloqueada',
    });

    const res = await request(buildApp())
      .post('/api/v1/comissoes/lancamentos/gerar')
      .set({ 'x-test-role': 'admin' })
      .send({ propostaId: 9 });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('proposta_status_blocked');
  });

  it('403 for corretor', async () => {
    const res = await request(buildApp())
      .post('/api/v1/comissoes/lancamentos/gerar')
      .set({ 'x-test-role': 'corretor' })
      .send({ propostaId: 1 });
    expect(res.status).toBe(403);
    expect(mockGerarLancamentos).not.toHaveBeenCalled();
  });
});