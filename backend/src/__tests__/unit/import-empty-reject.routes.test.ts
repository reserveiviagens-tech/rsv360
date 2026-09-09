jest.mock('../../../../server/modules/acomodacoes/import/pipeline', () => {
  class ImportVazioError extends Error {
    readonly code = 'IMPORT_VAZIO';
    readonly statusCode = 422;
    constructor(message = 'Arquivo sem linhas de acomodação para importar') {
      super(message);
      this.name = 'ImportVazioError';
    }
  }
  return {
    ImportVazioError,
    IMPORT_VAZIO_CODE: 'IMPORT_VAZIO',
    pipelineImportacao: jest.fn(),
  };
});

jest.mock('../../../../server/queues/importacoes.queue', () => ({
  enfileirarImportacao: jest.fn().mockResolvedValue('import-test-job'),
}));

jest.mock('../../../../server/modules/acomodacoes/import/modelo', () => ({
  gerarModeloXlsxBuffer: jest.fn().mockReturnValue(Buffer.from('xlsx-fixture')),
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
import importRouter from '../../../../server/modules/acomodacoes/routes/import.routes';
import {
  ImportVazioError,
  pipelineImportacao,
} from '../../../../server/modules/acomodacoes/import/pipeline';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/acomodacoes/import', importRouter);
  return app;
}

const auth = { 'x-test-role': 'admin', 'x-test-user-id': '1' };
/** Minimal ZIP/XLSX magic so PR-08 assertImportMemoryFile accepts the upload before the pipeline mock runs. */
const XLSX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);

describe('D2 — rotas import IMPORT_VAZIO → 422', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /preview → 422 + code IMPORT_VAZIO', async () => {
    (pipelineImportacao as jest.Mock).mockRejectedValueOnce(new ImportVazioError());

    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/import/preview')
      .set(auth)
      .attach('file', XLSX_MAGIC, 'lixo.xlsx');

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      success: false,
      code: 'IMPORT_VAZIO',
      error: expect.stringMatching(/sem linhas/i),
    });
  });

  it('POST /commit sync → 422 + code IMPORT_VAZIO', async () => {
    (pipelineImportacao as jest.Mock).mockRejectedValueOnce(new ImportVazioError());

    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/import/commit')
      .set(auth)
      .attach('file', XLSX_MAGIC, 'lixo.xlsx');

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      success: false,
      code: 'IMPORT_VAZIO',
    });
  });

  it('POST /preview caminho feliz permanece 200', async () => {
    (pipelineImportacao as jest.Mock).mockResolvedValueOnce({
      dryRun: true,
      total: 1,
      sucesso: 1,
      erros: 0,
      linhas: [],
      formato: 'csv',
      errosNormalizacao: [],
      ignorados: 0,
    });

    const res = await request(buildApp())
      .post('/api/v1/acomodacoes/import/preview')
      .set(auth)
      .attach('file', Buffer.from('codigo_externo\nX'), 'ok.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
