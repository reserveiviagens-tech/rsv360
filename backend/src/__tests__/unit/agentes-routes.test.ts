const mockIsAtivo = jest.fn();
const mockObterConfig = jest.fn();

jest.mock('../../../../server/modules/agentes/config.service', () => ({
  AgentesConfigService: {
    isModuloAtivo: () => mockIsAtivo(),
    obterConfig: () => mockObterConfig(),
  },
}));

jest.mock('../../../../server/middleware/auth.middleware', () => ({
  authenticateJwt: (
    req: { headers?: { authorization?: string }; user?: unknown },
    res: { status: (n: number) => { json: (b: unknown) => unknown } },
    next: () => void,
  ) => {
    if (req.headers?.authorization === 'Bearer ok') {
      req.user = { id: 1, role: 'admin', email: 't@t.com', name: 'T' };
      return next();
    }
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  },
}));

import express from 'express';
import request from 'supertest';
import agentesRouter from '../../../../server/modules/agentes/routes/index';

describe('Agentes routes — flag gate + G-D.8 JWT /config', () => {
  const app = express();
  app.use('/api/v1/agentes', agentesRouter);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('flag OFF: /health e /config respondem 404 desligado', async () => {
    mockIsAtivo.mockResolvedValue(false);

    const health = await request(app).get('/api/v1/agentes/health');
    expect(health.status).toBe(404);
    expect(health.body.error).toMatch(/desligado/i);

    const config = await request(app).get('/api/v1/agentes/config');
    expect(config.status).toBe(404);
  });

  it('flag ON: health público; /config sem JWT → 401', async () => {
    mockIsAtivo.mockResolvedValue(true);

    const health = await request(app).get('/api/v1/agentes/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ module: 'agentes', status: 'ok' });

    const config = await request(app).get('/api/v1/agentes/config');
    expect(config.status).toBe(401);
  });

  it('flag ON: /config com JWT → 200', async () => {
    mockIsAtivo.mockResolvedValue(true);
    mockObterConfig.mockResolvedValue({
      agentesModuloAtivo: true,
      agenteInstrutorAtivo: false,
      limiarSemanticoHit: 0.92,
      limiarSemanticoVerificar: 0.85,
      ttlCacheInstitucionalDias: 7,
      ttlCacheCatalogoHoras: 24,
      modeloT1: 'gpt-4o-mini',
      modeloEmbedding: 'text-embedding-3-small',
      ragTopK: 4,
    });

    const config = await request(app)
      .get('/api/v1/agentes/config')
      .set('Authorization', 'Bearer ok');
    expect(config.status).toBe(200);
    expect(config.body.success).toBe(true);
    expect(config.body.data.agentes_modulo_ativo).toBe(true);
    expect(config.body.data.limiar_semantico_hit).toBe(0.92);
  });
});
