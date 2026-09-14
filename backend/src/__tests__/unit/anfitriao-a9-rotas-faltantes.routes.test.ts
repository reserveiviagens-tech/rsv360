/**
 * Aruanda A9 — route coverage for desempenho, sms-status, NFSe draft,
 * verificação-local admin, and iCal endpoints previously untested at route layer.
 */
const mockObterMetricas = jest.fn();
const mockRelatorioCsv = jest.fn();
const mockPrepareNfseDraft = jest.fn();
const mockListNfseDrafts = jest.fn();
const mockGarantirIcalToken = jest.fn();
const mockSalvarIcalImportUrl = jest.fn();
const mockSincronizarIcalImport = jest.fn();
const mockGerarIcalFeed = jest.fn();
const mockListarVerificacoesLocal = jest.fn();
const mockDecidirVerificacaoLocal = jest.fn();
const mockGetTwilioSmsConfigStatus = jest.fn();

jest.mock('../../../../server/modules/acomodacoes/services/anfitriao.service', () => ({
  anfitriaoService: {
    listarVerificacoesLocal: (...args: unknown[]) => mockListarVerificacoesLocal(...args),
    decidirVerificacaoLocal: (...args: unknown[]) => mockDecidirVerificacaoLocal(...args),
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
    obterMetricas: (...args: unknown[]) => mockObterMetricas(...args),
    relatorioCsv: (...args: unknown[]) => mockRelatorioCsv(...args),
    relatorioFiscalCsv: jest.fn(),
  },
}));

jest.mock('../../../../server/modules/acomodacoes/services/anfitriao-nfse.service', () => ({
  anfitriaoNfseService: {
    prepareNfseDraft: (...args: unknown[]) => mockPrepareNfseDraft(...args),
    listNfseDrafts: (...args: unknown[]) => mockListNfseDrafts(...args),
  },
}));

jest.mock('../../../../server/modules/acomodacoes/services/rate-calendar.service', () => ({
  rateCalendarService: {
    garantirIcalToken: (...args: unknown[]) => mockGarantirIcalToken(...args),
    salvarIcalImportUrl: (...args: unknown[]) => mockSalvarIcalImportUrl(...args),
    sincronizarIcalImport: (...args: unknown[]) => mockSincronizarIcalImport(...args),
    gerarIcalFeed: (...args: unknown[]) => mockGerarIcalFeed(...args),
  },
}));

jest.mock('../../../../server/modules/acomodacoes/services/coanfitriao-invite-sms.service', () => ({
  getTwilioSmsConfigStatus: (...args: unknown[]) => mockGetTwilioSmsConfigStatus(...args),
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

describe('Aruanda A9 — anfitrião rotas faltantes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('desempenho', () => {
    it('GET /desempenho returns metrics for parceiro', async () => {
      mockObterMetricas.mockResolvedValue({
        periodo: { mes: '2026-03' },
        resumo: { reservas: 2 },
      });

      const res = await request(buildApp())
        .get('/api/v1/acomodacoes/anfitriao/desempenho?mes=2026-03')
        .set(authHeaders('anfitriao', 1));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resumo.reservas).toBe(2);
      expect(mockObterMetricas).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, role: 'anfitriao' }),
        '2026-03',
      );
    });

    it('GET /desempenho returns 401 without auth', async () => {
      const res = await request(buildApp()).get('/api/v1/acomodacoes/anfitriao/desempenho');
      expect(res.status).toBe(401);
      expect(mockObterMetricas).not.toHaveBeenCalled();
    });

    it('GET /desempenho/relatorio.csv returns CSV attachment', async () => {
      mockRelatorioCsv.mockResolvedValue('unidade,reservas\nCasa,3\n');

      const res = await request(buildApp())
        .get('/api/v1/acomodacoes/anfitriao/desempenho/relatorio.csv?mes=2026-03')
        .set(authHeaders('anfitriao', 1));

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="desempenho-rsv360-2026-03.csv"',
      );
      expect(res.text).toContain('unidade,reservas');
      expect(mockRelatorioCsv).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, role: 'anfitriao' }),
        '2026-03',
      );
    });
  });

  describe('sms-status', () => {
    it('GET /comunicacao/sms-status returns readiness without secrets', async () => {
      mockGetTwilioSmsConfigStatus.mockReturnValue({
        configured: false,
        hasAccountSid: false,
        hasAuthToken: false,
        hasFromNumber: false,
      });

      const res = await request(buildApp())
        .get('/api/v1/acomodacoes/anfitriao/comunicacao/sms-status')
        .set(authHeaders('anfitriao', 1));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        configured: false,
        hasAccountSid: false,
        hasAuthToken: false,
        hasFromNumber: false,
      });
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('ACtest');
      expect(serialized).not.toContain('secret-token-value');
      expect(serialized).not.toMatch(/\+\d{10,}/);
    });

    it('GET /comunicacao/sms-status returns 401 without auth', async () => {
      const res = await request(buildApp()).get(
        '/api/v1/acomodacoes/anfitriao/comunicacao/sms-status',
      );
      expect(res.status).toBe(401);
    });
  });

  describe('NFSe draft', () => {
    it('POST /unidades/:id/nfse/preparar creates draft for master', async () => {
      mockPrepareNfseDraft.mockResolvedValue({
        data: { status: 'nfse_pending', mes: '2026-03' },
      });

      const res = await request(buildApp())
        .post('/api/v1/acomodacoes/anfitriao/unidades/10/nfse/preparar')
        .set(authHeaders('anfitriao', 1))
        .send({ mes: '2026-03' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('nfse_pending');
      expect(res.body.message).toMatch(/Rascunho NFSe/i);
      expect(mockPrepareNfseDraft).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, role: 'anfitriao' }),
        10,
        { mes: '2026-03' },
      );
    });

    it('POST /unidades/:id/nfse/preparar returns 403 for corretor', async () => {
      const res = await request(buildApp())
        .post('/api/v1/acomodacoes/anfitriao/unidades/10/nfse/preparar')
        .set(authHeaders('corretor', 3))
        .send({ mes: '2026-03' });

      expect(res.status).toBe(403);
      expect(mockPrepareNfseDraft).not.toHaveBeenCalled();
    });

    it('POST /unidades/:id/nfse/preparar returns 404 when not found', async () => {
      mockPrepareNfseDraft.mockResolvedValue({ error: 'not_found' });

      const res = await request(buildApp())
        .post('/api/v1/acomodacoes/anfitriao/unidades/999/nfse/preparar')
        .set(authHeaders('anfitriao', 1))
        .send({ mes: '2026-03' });

      expect(res.status).toBe(404);
    });

    it('GET /unidades/:id/nfse/rascunhos lists drafts', async () => {
      mockListNfseDrafts.mockResolvedValue({
        data: [{ status: 'nfse_pending', mes: '2026-03' }],
      });

      const res = await request(buildApp())
        .get('/api/v1/acomodacoes/anfitriao/unidades/10/nfse/rascunhos')
        .set(authHeaders('anfitriao', 1));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(mockListNfseDrafts).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, role: 'anfitriao' }),
        10,
      );
    });
  });

  describe('verificação-local admin', () => {
    it('GET /admin/verificacoes-local returns 403 for anfitrião', async () => {
      const res = await request(buildApp())
        .get('/api/v1/acomodacoes/anfitriao/admin/verificacoes-local')
        .set(authHeaders('anfitriao', 1));

      expect(res.status).toBe(403);
      expect(mockListarVerificacoesLocal).not.toHaveBeenCalled();
    });

    it('GET /admin/verificacoes-local returns list for admin', async () => {
      mockListarVerificacoesLocal.mockResolvedValue({
        data: [{ id: 10, status: 'enviado' }],
      });

      const res = await request(buildApp())
        .get('/api/v1/acomodacoes/anfitriao/admin/verificacoes-local?status=enviado')
        .set(authHeaders('admin', 9));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(mockListarVerificacoesLocal).toHaveBeenCalledWith('admin', 'enviado');
    });

    it('POST /admin/unidades/:id/verificacao-local/aprovar succeeds for manager', async () => {
      mockDecidirVerificacaoLocal.mockResolvedValue({
        data: { id: 10, status: 'aprovado' },
      });

      const res = await request(buildApp())
        .post('/api/v1/acomodacoes/anfitriao/admin/unidades/10/verificacao-local/aprovar')
        .set(authHeaders('manager', 8));

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('aprovado');
      expect(mockDecidirVerificacaoLocal).toHaveBeenCalledWith('manager', 10, 'aprovar');
    });

    it('POST /admin/unidades/:id/verificacao-local/rejeitar returns 409 invalid_status', async () => {
      mockDecidirVerificacaoLocal.mockResolvedValue({ error: 'invalid_status' });

      const res = await request(buildApp())
        .post('/api/v1/acomodacoes/anfitriao/admin/unidades/10/verificacao-local/rejeitar')
        .set(authHeaders('admin', 9))
        .send({ motivo: 'fora do raio' });

      expect(res.status).toBe(409);
      expect(mockDecidirVerificacaoLocal).toHaveBeenCalledWith(
        'admin',
        10,
        'rejeitar',
        'fora do raio',
      );
    });
  });

  describe('iCal', () => {
    it('POST /unidades/:id/ical-token returns token for master', async () => {
      mockGarantirIcalToken.mockResolvedValue({
        data: { token: 'a'.repeat(32), created: true },
      });

      const res = await request(buildApp())
        .post('/api/v1/acomodacoes/anfitriao/unidades/10/ical-token')
        .set(authHeaders('anfitriao', 1))
        .send({ regenerate: false });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toHaveLength(32);
      expect(mockGarantirIcalToken).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, role: 'anfitriao' }),
        10,
        { regenerate: false },
      );
    });

    it('PUT /unidades/:id/ical-import returns 400 when url missing', async () => {
      const res = await request(buildApp())
        .put('/api/v1/acomodacoes/anfitriao/unidades/10/ical-import')
        .set(authHeaders('anfitriao', 1))
        .send({});

      expect(res.status).toBe(400);
      expect(mockSalvarIcalImportUrl).not.toHaveBeenCalled();
    });

    it('PUT /unidades/:id/ical-import saves url', async () => {
      mockSalvarIcalImportUrl.mockResolvedValue({
        data: { url: 'https://example.com/cal.ics' },
      });

      const res = await request(buildApp())
        .put('/api/v1/acomodacoes/anfitriao/unidades/10/ical-import')
        .set(authHeaders('anfitriao', 1))
        .send({ url: 'https://example.com/cal.ics' });

      expect(res.status).toBe(200);
      expect(res.body.data.url).toContain('example.com');
    });

    it('POST /unidades/:id/ical-import/sync returns 400 when no_url', async () => {
      mockSincronizarIcalImport.mockResolvedValue({ error: 'no_url' });

      const res = await request(buildApp())
        .post('/api/v1/acomodacoes/anfitriao/unidades/10/ical-import/sync')
        .set(authHeaders('anfitriao', 1));

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/URL/i);
    });

    it('GET /unidades/:id/ical.ics returns 401 for short token', async () => {
      const res = await request(buildApp()).get(
        '/api/v1/acomodacoes/anfitriao/unidades/10/ical.ics?token=short',
      );

      expect(res.status).toBe(401);
      expect(mockGerarIcalFeed).not.toHaveBeenCalled();
    });

    it('GET /unidades/:id/ical.ics returns calendar feed', async () => {
      mockGerarIcalFeed.mockResolvedValue({
        data: 'BEGIN:VCALENDAR\nEND:VCALENDAR\n',
      });
      const token = 'tokensecretvalue12';

      const res = await request(buildApp()).get(
        `/api/v1/acomodacoes/anfitriao/unidades/10/ical.ics?token=${token}&de=2026-03-01&ate=2026-09-01`,
      );

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/calendar/);
      expect(res.text).toContain('BEGIN:VCALENDAR');
      expect(mockGerarIcalFeed).toHaveBeenCalledWith(10, token, '2026-03-01', '2026-09-01');
    });
  });
});
