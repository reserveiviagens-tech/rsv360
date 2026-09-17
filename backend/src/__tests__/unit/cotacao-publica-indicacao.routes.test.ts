const mockRegistrarIndicacao = jest.fn();
const mockSelect = jest.fn();
const mockGetPropostaByToken = jest.fn();
const mockRegistrarVisualizacao = jest.fn();

jest.mock('../../../../server/modules/propostas/mgm', () => ({
  registrarIndicacao: (...args: unknown[]) => mockRegistrarIndicacao(...args),
}));

jest.mock('../../../../server/lib/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

jest.mock('../../../../server/modules/cotacao-publica/services/cotacao-publica.service', () => ({
  cotacaoPublicaService: {
    getPropostaByToken: (...args: unknown[]) => mockGetPropostaByToken(...args),
  },
}));

jest.mock('../../../../server/modules/propostas/services/propostas.service', () => ({
  propostasService: {
    registrarVisualizacao: (...args: unknown[]) => mockRegistrarVisualizacao(...args),
  },
}));

jest.mock('../../../../server/middleware/public-limiter', () => ({
  publicLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((...args: unknown[]) => args),
}));

import express from 'express';
import request from 'supertest';
import { registerCotacaoPublicaModule } from '../../../../server/modules/cotacao-publica/index';

const TOKEN = 'rt-public-token-abc12345';

function selectChain(rows: unknown[]) {
  return {
    from: () => ({
      where: () => ({
        limit: async () => rows,
      }),
    }),
  };
}

function mockPropostaThenUser(
  propostaRows: unknown[],
  userRows: unknown[],
) {
  mockSelect
    .mockReturnValueOnce(selectChain(propostaRows))
    .mockReturnValueOnce(selectChain(userRows));
}

describe('POST /api/v1/cotacao-publica/proposta/:token/indicacao', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRegistrarIndicacao.mockResolvedValue({ id: 'ind-1' });
  });

  function app() {
    const instance = express();
    instance.use(express.json());
    registerCotacaoPublicaModule(instance);
    return instance;
  }

  it('T1 — público válido registra indicação (201)', async () => {
    mockPropostaThenUser(
      [{ tokenPublico: TOKEN, isPublica: true }],
      [{ id: 9, isActive: true }],
    );

    const res = await request(app())
      .post(`/api/v1/cotacao-publica/proposta/${TOKEN}/indicacao`)
      .send({ indicadorId: 9, canal: 'whatsapp' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true });
    expect(mockRegistrarIndicacao).toHaveBeenCalledWith({
      indicadorId: 9,
      tokenProposta: TOKEN,
      canal: 'whatsapp',
    });
  });

  it('T2 — proposta inexistente → 404', async () => {
    mockSelect.mockReturnValueOnce(selectChain([]));

    const res = await request(app())
      .post(`/api/v1/cotacao-publica/proposta/missing-token/indicacao`)
      .send({ indicadorId: 9 });

    expect(res.status).toBe(404);
    expect(mockRegistrarIndicacao).not.toHaveBeenCalled();
  });

  it('T3 — proposta não pública → 404', async () => {
    mockSelect.mockReturnValueOnce(
      selectChain([{ tokenPublico: TOKEN, isPublica: false }]),
    );

    const res = await request(app())
      .post(`/api/v1/cotacao-publica/proposta/${TOKEN}/indicacao`)
      .send({ indicadorId: 9 });

    expect(res.status).toBe(404);
    expect(mockRegistrarIndicacao).not.toHaveBeenCalled();
  });

  it('T4 — indicadorId inválido → 400', async () => {
    for (const body of [{}, { indicadorId: 0 }, { indicadorId: -1 }, { indicadorId: 1.5 }, { indicadorId: 'x' }]) {
      const res = await request(app())
        .post(`/api/v1/cotacao-publica/proposta/${TOKEN}/indicacao`)
        .send(body);
      expect(res.status).toBe(400);
      expect(mockRegistrarIndicacao).not.toHaveBeenCalled();
    }
  });

  it('T5 — indicador inexistente/inativo → 400', async () => {
    mockPropostaThenUser(
      [{ tokenPublico: TOKEN, isPublica: true }],
      [],
    );
    const missing = await request(app())
      .post(`/api/v1/cotacao-publica/proposta/${TOKEN}/indicacao`)
      .send({ indicadorId: 99 });
    expect(missing.status).toBe(400);

    mockPropostaThenUser(
      [{ tokenPublico: TOKEN, isPublica: true }],
      [{ id: 9, isActive: false }],
    );
    const inactive = await request(app())
      .post(`/api/v1/cotacao-publica/proposta/${TOKEN}/indicacao`)
      .send({ indicadorId: 9 });
    expect(inactive.status).toBe(400);
    expect(mockRegistrarIndicacao).not.toHaveBeenCalled();
  });

  it('T6 — repetição idempotente → 201 sem dados extras', async () => {
    mockPropostaThenUser(
      [{ tokenPublico: TOKEN, isPublica: true }],
      [{ id: 9, isActive: true }],
    );
    mockPropostaThenUser(
      [{ tokenPublico: TOKEN, isPublica: true }],
      [{ id: 9, isActive: true }],
    );
    mockRegistrarIndicacao
      .mockResolvedValueOnce({ id: 'ind-1' })
      .mockResolvedValueOnce({ id: 'ind-1' });

    const a = await request(app())
      .post(`/api/v1/cotacao-publica/proposta/${TOKEN}/indicacao`)
      .send({ indicadorId: 9, canal: 'whatsapp' });
    const b = await request(app())
      .post(`/api/v1/cotacao-publica/proposta/${TOKEN}/indicacao`)
      .send({ indicadorId: 9, canal: 'whatsapp' });

    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body).toEqual({ success: true });
    expect(b.body).toEqual({ success: true });
    expect(mockRegistrarIndicacao).toHaveBeenCalledTimes(2);
  });

  it('T7 — race 23505 → 201 (não 500)', async () => {
    mockPropostaThenUser(
      [{ tokenPublico: TOKEN, isPublica: true }],
      [{ id: 9, isActive: true }],
    );
    const err = Object.assign(new Error('duplicate key'), { code: '23505' });
    mockRegistrarIndicacao.mockRejectedValueOnce(err);

    const res = await request(app())
      .post(`/api/v1/cotacao-publica/proposta/${TOKEN}/indicacao`)
      .send({ indicadorId: 9 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true });
  });

  it('T8 — não incrementa visualização / não chama getPropostaByToken', async () => {
    mockPropostaThenUser(
      [{ tokenPublico: TOKEN, isPublica: true }],
      [{ id: 9, isActive: true }],
    );

    await request(app())
      .post(`/api/v1/cotacao-publica/proposta/${TOKEN}/indicacao`)
      .send({ indicadorId: 9 });

    expect(mockGetPropostaByToken).not.toHaveBeenCalled();
    expect(mockRegistrarVisualizacao).not.toHaveBeenCalled();
  });
});
