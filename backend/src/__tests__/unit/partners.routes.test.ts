const mockCreate = jest.fn();
const mockList = jest.fn();
const mockGetById = jest.fn();
const mockUpdate = jest.fn();
const mockListMemberships = jest.fn();
const mockCreateMembership = jest.fn();
const mockGetMembershipForPartner = jest.fn();

jest.mock('../../../../server/modules/partners/services/partners.service', () => {
  const actual = jest.requireActual(
    '../../../../server/modules/partners/services/partners.service',
  );
  return {
    ...actual,
    partnersService: {
      create: (...args: unknown[]) => mockCreate(...args),
      list: (...args: unknown[]) => mockList(...args),
      getById: (...args: unknown[]) => mockGetById(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      listMemberships: (...args: unknown[]) => mockListMemberships(...args),
      createMembership: (...args: unknown[]) => mockCreateMembership(...args),
      getMembershipForPartner: (...args: unknown[]) => mockGetMembershipForPartner(...args),
    },
  };
});

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
import partnersRouter from '../../../../server/modules/partners/routes/index';
import { PartnerNotFoundError } from '../../../../server/modules/partners/services/partners.service';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/partners', partnersRouter);
  return app;
}

function authHeaders(role: string, userId = 10) {
  return { 'x-test-role': role, 'x-test-user-id': String(userId) };
}

const PARTNER_A = '11111111-1111-4111-8111-111111111111';
const PARTNER_B = '22222222-2222-4222-8222-222222222222';
const MEMBERSHIP_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const samplePartner = {
  id: PARTNER_A,
  code: 'acme',
  displayName: 'Acme Travel',
  status: 'draft',
  primaryUserId: null,
  metadata: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('partners Fatia A API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('401 — ausência de autenticação', () => {
    it('GET /api/v1/partners sem token → 401', async () => {
      const res = await request(buildApp()).get('/api/v1/partners');
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ success: false });
      expect(mockList).not.toHaveBeenCalled();
    });

    it('POST /api/v1/partners sem token → 401', async () => {
      const res = await request(buildApp())
        .post('/api/v1/partners')
        .send({ code: 'x', displayName: 'X' });
      expect(res.status).toBe(401);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('GET partner by id sem token → 401', async () => {
      const res = await request(buildApp()).get(`/api/v1/partners/${PARTNER_A}`);
      expect(res.status).toBe(401);
      expect(mockGetById).not.toHaveBeenCalled();
    });
  });

  describe('403 — autenticado sem role autorizada', () => {
    const denied = ['user', 'anfitriao', 'corretor'] as const;

    describe.each(denied)('role %s', (role) => {
      it('GET list → 403', async () => {
        const res = await request(buildApp()).get('/api/v1/partners').set(authHeaders(role));
        expect(res.status).toBe(403);
        expect(res.body).toMatchObject({ success: false, error: 'Acesso negado' });
        expect(mockList).not.toHaveBeenCalled();
      });

      it('POST create → 403', async () => {
        const res = await request(buildApp())
          .post('/api/v1/partners')
          .set(authHeaders(role))
          .send({ code: 'x', displayName: 'X' });
        expect(res.status).toBe(403);
        expect(mockCreate).not.toHaveBeenCalled();
      });
    });
  });

  describe('IDOR — autenticado sem autorização sobre Partner/membership de outro contexto', () => {
    it('corretor não consulta Partner de outro contexto por ID', async () => {
      const res = await request(buildApp())
        .get(`/api/v1/partners/${PARTNER_B}`)
        .set(authHeaders('corretor', 99));
      expect(res.status).toBe(403);
      expect(mockGetById).not.toHaveBeenCalled();
    });

    it('anfitriao não altera Partner protegido', async () => {
      const res = await request(buildApp())
        .patch(`/api/v1/partners/${PARTNER_A}`)
        .set(authHeaders('anfitriao', 88))
        .send({ displayName: 'Hijack' });
      expect(res.status).toBe(403);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('user não lista memberships de Partner alheio', async () => {
      const res = await request(buildApp())
        .get(`/api/v1/partners/${PARTNER_A}/memberships`)
        .set(authHeaders('user', 77));
      expect(res.status).toBe(403);
      expect(mockListMemberships).not.toHaveBeenCalled();
    });

    it('corretor não cria membership em Partner alheio', async () => {
      const res = await request(buildApp())
        .post(`/api/v1/partners/${PARTNER_A}/memberships`)
        .set(authHeaders('corretor', 66))
        .send({ userId: 66, role: 'owner' });
      expect(res.status).toBe(403);
      expect(mockCreateMembership).not.toHaveBeenCalled();
    });

    it('cross-partner membership probe: membership de A sob path de B → 404', async () => {
      mockGetMembershipForPartner.mockRejectedValue(
        new PartnerNotFoundError('Membership não encontrada neste Partner'),
      );
      const res = await request(buildApp())
        .get(`/api/v1/partners/${PARTNER_B}/memberships/${MEMBERSHIP_A}`)
        .set(authHeaders('admin', 1));
      expect(res.status).toBe(404);
      expect(mockGetMembershipForPartner).toHaveBeenCalledWith(
        { id: 1, role: 'admin' },
        PARTNER_B,
        MEMBERSHIP_A,
      );
    });
  });

  describe('400 — payload/parâmetro inválido', () => {
    it('POST body sem code → 400', async () => {
      const res = await request(buildApp())
        .post('/api/v1/partners')
        .set(authHeaders('admin'))
        .send({ displayName: 'No Code' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('GET :id com UUID inválido → 400', async () => {
      const res = await request(buildApp())
        .get('/api/v1/partners/not-a-uuid')
        .set(authHeaders('manager'));
      expect(res.status).toBe(400);
      expect(mockGetById).not.toHaveBeenCalled();
    });

    it('PATCH body vazio → 400', async () => {
      const res = await request(buildApp())
        .patch(`/api/v1/partners/${PARTNER_A}`)
        .set(authHeaders('admin'))
        .send({});
      expect(res.status).toBe(400);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('POST membership role inválido → 400', async () => {
      const res = await request(buildApp())
        .post(`/api/v1/partners/${PARTNER_A}/memberships`)
        .set(authHeaders('admin'))
        .send({ userId: 5, role: 'superadmin' });
      expect(res.status).toBe(400);
      expect(mockCreateMembership).not.toHaveBeenCalled();
    });

    it('GET list com status inválido → 400', async () => {
      const res = await request(buildApp())
        .get('/api/v1/partners?status=bogus')
        .set(authHeaders('admin'));
      expect(res.status).toBe(400);
      expect(mockList).not.toHaveBeenCalled();
    });
  });

  describe('casos positivos autorizados', () => {
    it('admin cria Partner → 201', async () => {
      mockCreate.mockResolvedValue(samplePartner);
      const res = await request(buildApp())
        .post('/api/v1/partners')
        .set(authHeaders('admin', 1))
        .send({ code: 'acme', displayName: 'Acme Travel' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ success: true, data: { code: 'acme' } });
      expect(mockCreate).toHaveBeenCalledWith(
        { id: 1, role: 'admin' },
        expect.objectContaining({ code: 'acme', displayName: 'Acme Travel' }),
      );
    });

    it('manager lista Partners → 200', async () => {
      mockList.mockResolvedValue({ items: [samplePartner], page: 1, pageSize: 20, total: 1 });
      const res = await request(buildApp()).get('/api/v1/partners').set(authHeaders('manager', 2));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
    });

    it('admin getById → 200', async () => {
      mockGetById.mockResolvedValue(samplePartner);
      const res = await request(buildApp())
        .get(`/api/v1/partners/${PARTNER_A}`)
        .set(authHeaders('admin'));
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(PARTNER_A);
    });

    it('admin patch → 200', async () => {
      mockUpdate.mockResolvedValue({ ...samplePartner, displayName: 'Acme Plus', status: 'active' });
      const res = await request(buildApp())
        .patch(`/api/v1/partners/${PARTNER_A}`)
        .set(authHeaders('admin'))
        .send({ displayName: 'Acme Plus', status: 'active' });
      expect(res.status).toBe(200);
      expect(res.body.data.displayName).toBe('Acme Plus');
    });

    it('admin cria membership → 201', async () => {
      mockCreateMembership.mockResolvedValue({
        id: MEMBERSHIP_A,
        partnerId: PARTNER_A,
        userId: 5,
        role: 'owner',
        createdAt: new Date(),
      });
      const res = await request(buildApp())
        .post(`/api/v1/partners/${PARTNER_A}/memberships`)
        .set(authHeaders('admin'))
        .send({ userId: 5, role: 'owner' });
      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe('owner');
    });
  });

  describe('404 — recurso inexistente', () => {
    it('getById Partner inexistente → 404', async () => {
      mockGetById.mockRejectedValue(new PartnerNotFoundError());
      const res = await request(buildApp())
        .get(`/api/v1/partners/${PARTNER_B}`)
        .set(authHeaders('admin'));
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
