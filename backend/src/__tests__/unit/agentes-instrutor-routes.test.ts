const mockIsAtivo = jest.fn();
const mockIsInstrutor = jest.fn();
const mockObterConfig = jest.fn();
const mockPerguntar = jest.fn();
const mockRegistrar = jest.fn();

jest.mock('../../../../server/modules/agentes/config.service', () => ({
  AgentesConfigService: {
    isModuloAtivo: () => mockIsAtivo(),
    isInstrutorAtivo: () => mockIsInstrutor(),
    obterConfig: () => mockObterConfig(),
  },
}));

jest.mock('../../../../server/modules/agentes/instrutor/instrutor.service', () => ({
  InstrutorService: {
    perguntar: (...args: unknown[]) => mockPerguntar(...args),
  },
}));

jest.mock('../../../../server/modules/agentes/execucoes.service', () => ({
  AgentesExecucoesService: {
    registrar: (...args: unknown[]) => mockRegistrar(...args),
  },
}));

jest.mock('../../../../server/middleware/auth.middleware', () => ({
  authenticateJwt: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = { id: 42, role: 'admin', email: 't@t.com', name: 'T' };
    next();
  },
}));

import express from 'express';
import request from 'supertest';
import agentesRouter from '../../../../server/modules/agentes/routes/index';
import { AGENTES_CONFIG_PADRAO } from '../../../../server/modules/agentes/schema';

describe('Instrutor — endpoint + dupla flag', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/agentes', agentesRouter);

  beforeEach(() => {
    jest.clearAllMocks();
    mockObterConfig.mockResolvedValue({ ...AGENTES_CONFIG_PADRAO, agentesModuloAtivo: true });
  });

  it('módulo OFF → 404 pergunta', async () => {
    mockIsAtivo.mockResolvedValue(false);
    const res = await request(app)
      .post('/api/v1/agentes/instrutor/perguntar')
      .send({ pergunta: 'Oi' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/desligado/i);
  });

  it('módulo ON + instrutor OFF → 404', async () => {
    mockIsAtivo.mockResolvedValue(true);
    mockIsInstrutor.mockResolvedValue(false);
    const res = await request(app)
      .post('/api/v1/agentes/instrutor/perguntar')
      .send({ pergunta: 'Como criar orçamento?' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/desligado/i);
  });

  it('dupla ON → 200 com resposta', async () => {
    mockIsAtivo.mockResolvedValue(true);
    mockIsInstrutor.mockResolvedValue(true);
    mockPerguntar.mockResolvedValue({
      resposta: 'Use /orcamentos\n\nOnde clicar: /orcamentos',
      tier: 't0',
      cacheHit: 'none',
      status: 200,
    });

    const res = await request(app)
      .post('/api/v1/agentes/instrutor/perguntar')
      .send({ pergunta: 'Como criar orçamento?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tier).toBe('t0');
    expect(mockPerguntar).toHaveBeenCalled();
  });

  it('T1 sem chave → 503', async () => {
    mockIsAtivo.mockResolvedValue(true);
    mockIsInstrutor.mockResolvedValue(true);
    mockPerguntar.mockResolvedValue({
      resposta: 'Instrutor temporariamente indisponível',
      tier: 't1',
      cacheHit: 'none',
      status: 503,
    });

    const res = await request(app)
      .post('/api/v1/agentes/instrutor/perguntar')
      .send({ pergunta: 'xyzzy plugh foobar' });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/indisponível/i);
  });

  it('payload inválido → 400', async () => {
    mockIsAtivo.mockResolvedValue(true);
    mockIsInstrutor.mockResolvedValue(true);
    const res = await request(app)
      .post('/api/v1/agentes/instrutor/perguntar')
      .send({ pergunta: '' });
    expect(res.status).toBe(400);
  });

  it('G-D.8: body.papel diverge do claim → 403 (não chama instrutor)', async () => {
    mockIsAtivo.mockResolvedValue(true);
    mockIsInstrutor.mockResolvedValue(true);
    const res = await request(app)
      .post('/api/v1/agentes/instrutor/perguntar')
      .send({ pergunta: 'Como criar orçamento?', papel: 'anfitriao' });
    // mock JWT user.role = admin → claim staff; body anfitriao = mismatch
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/negado/i);
    expect(mockPerguntar).not.toHaveBeenCalled();
  });
});
