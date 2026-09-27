const mockList = jest.fn();
const mockGet = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockSuspend = jest.fn();
const mockEnd = jest.fn();
const mockReactivate = jest.fn();
const mockListInherited = jest.fn();

jest.mock('../../../../server/modules/partners/services/partner-associations.service', () => {
  const actual = jest.requireActual(
    '../../../../server/modules/partners/services/partner-associations.service',
  );
  return {
    ...actual,
    partnerAssociationsService: {
      list: (...args: unknown[]) => mockList(...args),
      get: (...args: unknown[]) => mockGet(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      suspend: (...args: unknown[]) => mockSuspend(...args),
      end: (...args: unknown[]) => mockEnd(...args),
      reactivate: (...args: unknown[]) => mockReactivate(...args),
      listInheritedAcomodacoes: (...args: unknown[]) => mockListInherited(...args),
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
import {
  PartnerValidationError,
  assertAssociationAccess,
  isPeaAssociationUniqueViolation,
  l1AllowsAssociationAction,
  PEA_PARTNER_EMPREENDIMENTO_UNIQUE,
} from '../../../../server/modules/partners/services/partner-associations.service';
import {
  PartnerConflictError,
  PartnerForbiddenError,
  PartnerNotFoundError,
} from '../../../../server/modules/partners/services/partners.service';
import { L1_ASSOCIATION_CAPABILITIES } from '../../../../server/modules/partners/schema';

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
const EMP_ID = 42;

const sampleAssoc = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  partnerId: PARTNER_A,
  empreendimentoId: EMP_ID,
  associationRole: 'agency',
  status: 'active',
  effectiveFrom: null,
  effectiveTo: null,
  metadata: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  createdByUserId: 10,
  empreendimento: {
    id: EMP_ID,
    hotelId: 'hotel-demo',
    slug: 'hotel-demo',
    nomeOficial: 'Hotel Demo',
    ativo: true,
  },
};

describe('partners API L3 associations (C36-BD)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthZ structure (L1 matrix + staff v1)', () => {
    it('L1 matrix: owner/partner_admin mutate; ops/finance/member read-only', () => {
      expect(l1AllowsAssociationAction('owner', 'mutate')).toBe(true);
      expect(l1AllowsAssociationAction('partner_admin', 'mutate')).toBe(true);
      expect(l1AllowsAssociationAction('ops', 'mutate')).toBe(false);
      expect(l1AllowsAssociationAction('finance', 'read')).toBe(true);
      expect(l1AllowsAssociationAction('member', 'mutate')).toBe(false);
      expect(L1_ASSOCIATION_CAPABILITIES.ops.read).toBe(true);
    });

    it('v1 assertAssociationAccess allows staff and denies others', () => {
      expect(() => assertAssociationAccess({ id: 1, role: 'admin' }, 'mutate')).not.toThrow();
      expect(() => assertAssociationAccess({ id: 1, role: 'manager' }, 'read')).not.toThrow();
      expect(() => assertAssociationAccess({ id: 1, role: 'user' }, 'read')).toThrow(
        PartnerForbiddenError,
      );
    });

    it('association service does not import soft-link AuthZ tables', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs') as typeof import('fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path') as typeof import('path');
      const src = fs.readFileSync(
        path.join(
          __dirname,
          '../../../../server/modules/partners/services/partner-associations.service.ts',
        ),
        'utf8',
      );
      expect(src).not.toMatch(/\bpartnerLinks\b/);
      expect(src).not.toMatch(/['"]partner_links['"]/);
    });
  });

  describe('401', () => {
    it('GET empreendimentos sem token → 401', async () => {
      const res = await request(buildApp()).get(`/api/v1/partners/${PARTNER_A}/empreendimentos`);
      expect(res.status).toBe(401);
      expect(mockList).not.toHaveBeenCalled();
    });
  });

  describe('403', () => {
    it.each(['user', 'anfitriao', 'corretor'])('role %s → 403', async (role) => {
      const res = await request(buildApp())
        .get(`/api/v1/partners/${PARTNER_A}/empreendimentos`)
        .set(authHeaders(role));
      expect(res.status).toBe(403);
      expect(mockList).not.toHaveBeenCalled();
    });
  });

  describe('400', () => {
    it('POST body inválido (missing role) → 400', async () => {
      const res = await request(buildApp())
        .post(`/api/v1/partners/${PARTNER_A}/empreendimentos`)
        .set(authHeaders('admin'))
        .send({ empreendimentoId: EMP_ID });
      expect(res.status).toBe(400);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('POST rejects partnerId in body (strict) → 400', async () => {
      const res = await request(buildApp())
        .post(`/api/v1/partners/${PARTNER_A}/empreendimentos`)
        .set(authHeaders('admin'))
        .send({
          partnerId: PARTNER_B,
          empreendimentoId: EMP_ID,
          associationRole: 'agency',
        });
      expect(res.status).toBe(400);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('lifecycle inválido → 400', async () => {
      mockSuspend.mockRejectedValueOnce(
        new PartnerValidationError('Transição de status inválida: ended → suspended'),
      );
      const res = await request(buildApp())
        .post(`/api/v1/partners/${PARTNER_A}/empreendimentos/${EMP_ID}/suspend`)
        .set(authHeaders('admin'));
      expect(res.status).toBe(400);
    });
  });

  describe('404 / 409 / IDOR', () => {
    it('Partner inexistente → 404', async () => {
      mockList.mockRejectedValueOnce(new PartnerNotFoundError());
      const res = await request(buildApp())
        .get(`/api/v1/partners/${PARTNER_A}/empreendimentos`)
        .set(authHeaders('manager'));
      expect(res.status).toBe(404);
    });

    it('IDOR cross-partner assoc → 404', async () => {
      mockGet.mockRejectedValueOnce(
        new PartnerNotFoundError('Associação não encontrada neste Partner'),
      );
      const res = await request(buildApp())
        .get(`/api/v1/partners/${PARTNER_B}/empreendimentos/${EMP_ID}`)
        .set(authHeaders('admin'));
      expect(res.status).toBe(404);
      expect(mockGet).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'admin' }),
        PARTNER_B,
        EMP_ID,
      );
    });

    it('duplicate association → 409', async () => {
      mockCreate.mockRejectedValueOnce(
        new PartnerConflictError('Associação já existe para este Partner e Empreendimento'),
      );
      const res = await request(buildApp())
        .post(`/api/v1/partners/${PARTNER_A}/empreendimentos`)
        .set(authHeaders('admin'))
        .send({ empreendimentoId: EMP_ID, associationRole: 'agency' });
      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        success: false,
        error: 'Associação já existe para este Partner e Empreendimento',
      });
    });
  });

  describe('C36-BL PEA unique → 409 mapping', () => {
    it('detects Drizzle-wrapped PG 23505 for pea_partner_empreendimento_unique', () => {
      const cause = Object.assign(
        new Error(
          `duplicate key value violates unique constraint "${PEA_PARTNER_EMPREENDIMENTO_UNIQUE}"`,
        ),
        { code: '23505', constraint: PEA_PARTNER_EMPREENDIMENTO_UNIQUE },
      );
      const wrapped = Object.assign(new Error('Failed query: insert into "partner_empreendimento_associations"'), {
        cause,
      });
      expect(isPeaAssociationUniqueViolation(wrapped)).toBe(true);
    });

    it('detects 23505 when constraint only appears in cause message', () => {
      const cause = Object.assign(
        new Error(
          `duplicate key value violates unique constraint "${PEA_PARTNER_EMPREENDIMENTO_UNIQUE}"`,
        ),
        { code: '23505' },
      );
      const wrapped = Object.assign(new Error('Failed query'), { cause });
      expect(isPeaAssociationUniqueViolation(wrapped)).toBe(true);
    });

    it('rejects unrelated unique constraints (does not mask)', () => {
      const err = Object.assign(new Error('duplicate key'), {
        code: '23505',
        constraint: 'partners_code_unique',
      });
      expect(isPeaAssociationUniqueViolation(err)).toBe(false);
    });

    it('rejects non-unique DB failures', () => {
      expect(isPeaAssociationUniqueViolation(new Error('connection terminated'))).toBe(false);
      expect(
        isPeaAssociationUniqueViolation(Object.assign(new Error('fk'), { code: '23503' })),
      ).toBe(false);
    });
  });

  describe('happy path + lifecycle', () => {
    it('POST create → 201 (partnerId from path only)', async () => {
      mockCreate.mockResolvedValueOnce(sampleAssoc);
      const res = await request(buildApp())
        .post(`/api/v1/partners/${PARTNER_A}/empreendimentos`)
        .set(authHeaders('admin', 99))
        .send({ empreendimentoId: EMP_ID, associationRole: 'agency' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith(
        { id: 99, role: 'admin' },
        PARTNER_A,
        expect.objectContaining({ empreendimentoId: EMP_ID, associationRole: 'agency' }),
      );
    });

    it('GET list → 200', async () => {
      mockList.mockResolvedValueOnce({
        items: [sampleAssoc],
        page: 1,
        pageSize: 20,
        total: 1,
      });
      const res = await request(buildApp())
        .get(`/api/v1/partners/${PARTNER_A}/empreendimentos`)
        .set(authHeaders('manager'));
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1);
    });

    it('suspend → 200', async () => {
      mockSuspend.mockResolvedValueOnce({ ...sampleAssoc, status: 'suspended' });
      const res = await request(buildApp())
        .post(`/api/v1/partners/${PARTNER_A}/empreendimentos/${EMP_ID}/suspend`)
        .set(authHeaders('admin'));
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('suspended');
    });

    it('end → 200', async () => {
      mockEnd.mockResolvedValueOnce({ ...sampleAssoc, status: 'ended' });
      const res = await request(buildApp())
        .post(`/api/v1/partners/${PARTNER_A}/empreendimentos/${EMP_ID}/end`)
        .set(authHeaders('admin'));
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ended');
    });

    it('reactivate → 200', async () => {
      mockReactivate.mockResolvedValueOnce({ ...sampleAssoc, status: 'active' });
      const res = await request(buildApp())
        .post(`/api/v1/partners/${PARTNER_A}/empreendimentos/${EMP_ID}/reactivate`)
        .set(authHeaders('admin'));
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('active');
    });

    it('PATCH status → 200', async () => {
      mockUpdate.mockResolvedValueOnce({ ...sampleAssoc, status: 'suspended' });
      const res = await request(buildApp())
        .patch(`/api/v1/partners/${PARTNER_A}/empreendimentos/${EMP_ID}`)
        .set(authHeaders('admin'))
        .send({ status: 'suspended' });
      expect(res.status).toBe(200);
    });
  });

  describe('C36-BT L3-INHERIT acomodacoes', () => {
    const inheritPath = `/api/v1/partners/${PARTNER_A}/empreendimentos/${EMP_ID}/acomodacoes`;

    const sampleInheritEmpty = {
      partnerId: PARTNER_A,
      empreendimentoId: EMP_ID,
      empreendimento: {
        id: EMP_ID,
        hotelId: 'c36bt-hotel',
        slug: 'c36bt-hotel',
        nomeOficial: 'C36BT Hotel',
        ativo: true,
      },
      association: {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        status: 'active',
        associationRole: 'agency',
      },
      items: [] as Array<Record<string, unknown>>,
      page: 1,
      pageSize: 20,
      total: 0,
    };

    const sampleInheritItems = {
      ...sampleInheritEmpty,
      total: 2,
      items: [
        {
          id: 101,
          hotelId: 'c36bt-hotel',
          titulo: 'Apto 1',
          ativo: true,
          statusPublicacao: 'publicado',
          capacidadeMax: 4,
          proprietarioId: 7,
          tipoId: 1,
          precoDiaria: '200.00',
          atualizadoEm: new Date('2026-01-02T00:00:00Z'),
        },
        {
          id: 102,
          hotelId: 'c36bt-hotel',
          titulo: 'Apto 2',
          ativo: true,
          statusPublicacao: 'rascunho',
          capacidadeMax: 2,
          proprietarioId: 8,
          tipoId: 1,
          precoDiaria: '150.00',
          atualizadoEm: new Date('2026-01-03T00:00:00Z'),
        },
      ],
    };

    // T1
    it('T1 inherit sem token → 401', async () => {
      const res = await request(buildApp()).get(inheritPath);
      expect(res.status).toBe(401);
      expect(mockListInherited).not.toHaveBeenCalled();
    });

    // T2
    it('T2 inherit role user → 403', async () => {
      const res = await request(buildApp())
        .get(inheritPath)
        .set(authHeaders('user'));
      expect(res.status).toBe(403);
      expect(mockListInherited).not.toHaveBeenCalled();
    });

    // T3
    it('T3 partner inexistente → 404', async () => {
      mockListInherited.mockRejectedValueOnce(new PartnerNotFoundError('Partner não encontrado'));
      const res = await request(buildApp())
        .get(inheritPath)
        .set(authHeaders('admin'));
      expect(res.status).toBe(404);
    });

    // T4 IDOR / PEA missing
    it('T4 IDOR PEA inexistente neste partner → 404', async () => {
      mockListInherited.mockRejectedValueOnce(
        new PartnerNotFoundError('Associação não encontrada neste Partner'),
      );
      const res = await request(buildApp())
        .get(`/api/v1/partners/${PARTNER_B}/empreendimentos/${EMP_ID}/acomodacoes`)
        .set(authHeaders('admin'));
      expect(res.status).toBe(404);
    });

    // T5
    it('T5 PEA suspended → 404', async () => {
      mockListInherited.mockRejectedValueOnce(
        new PartnerNotFoundError('Associação não encontrada neste Partner'),
      );
      const res = await request(buildApp())
        .get(inheritPath)
        .set(authHeaders('admin'));
      expect(res.status).toBe(404);
    });

    // T6
    it('T6 PEA ended → 404', async () => {
      mockListInherited.mockRejectedValueOnce(
        new PartnerNotFoundError('Associação não encontrada neste Partner'),
      );
      const res = await request(buildApp())
        .get(inheritPath)
        .set(authHeaders('manager'));
      expect(res.status).toBe(404);
    });

    // T7
    it('T7 PEA active sem acomodações → 200 total 0', async () => {
      mockListInherited.mockResolvedValueOnce(sampleInheritEmpty);
      const res = await request(buildApp())
        .get(inheritPath)
        .set(authHeaders('admin'));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(0);
      expect(res.body.data.items).toEqual([]);
      expect(mockListInherited).toHaveBeenCalled();
    });

    // T8
    it('T8 PEA active com items → 200 e hotelId consistente', async () => {
      mockListInherited.mockResolvedValueOnce(sampleInheritItems);
      const res = await request(buildApp())
        .get(inheritPath)
        .set(authHeaders('admin'));
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(2);
      const hotelId = res.body.data.empreendimento.hotelId;
      for (const item of res.body.data.items) {
        expect(item.hotelId).toBe(hotelId);
      }
    });

    // T9
    it('T9 pagination page/pageSize passed to service', async () => {
      mockListInherited.mockResolvedValueOnce({
        ...sampleInheritEmpty,
        page: 2,
        pageSize: 10,
      });
      const res = await request(buildApp())
        .get(`${inheritPath}?page=2&pageSize=10`)
        .set(authHeaders('admin'));
      expect(res.status).toBe(200);
      expect(mockListInherited).toHaveBeenCalledWith(
        expect.anything(),
        PARTNER_A,
        EMP_ID,
        expect.objectContaining({ page: 2, pageSize: 10 }),
      );
    });

    // T10
    it('T10 ativo inválido → 400', async () => {
      const res = await request(buildApp())
        .get(`${inheritPath}?ativo=maybe`)
        .set(authHeaders('admin'));
      expect(res.status).toBe(400);
      expect(mockListInherited).not.toHaveBeenCalled();
    });

    // T11
    it('T11 unknown query key → 400 strict', async () => {
      const res = await request(buildApp())
        .get(`${inheritPath}?hotelId=evil`)
        .set(authHeaders('admin'));
      expect(res.status).toBe(400);
      expect(mockListInherited).not.toHaveBeenCalled();
    });

    // T12 already covered by partner_links static test; reinforce inherit path source
    it('T12 inherit service source does not use partner_links', () => {
      const fs = require('fs') as typeof import('fs');
      const path = require('path') as typeof import('path');
      const src = fs.readFileSync(
        path.join(
          __dirname,
          '../../../../server/modules/partners/services/partner-associations.service.ts',
        ),
        'utf8',
      );
      expect(src).not.toMatch(/['"]partner_links['"]/);
      expect(src).not.toMatch(/partnerLinks/);
      expect(src).toContain('listInheritedAcomodacoes');
    });

    // T13
    it('T13 active gate appears before acomodacoes query in source', () => {
      const fs = require('fs') as typeof import('fs');
      const path = require('path') as typeof import('path');
      const src = fs.readFileSync(
        path.join(
          __dirname,
          '../../../../server/modules/partners/services/partner-associations.service.ts',
        ),
        'utf8',
      );
      const start = src.indexOf('listInheritedAcomodacoes');
      expect(start).toBeGreaterThan(-1);
      const chunk = src.slice(start, start + 1200);
      const activeGate = chunk.indexOf("status !== 'active'");
      const acoQuery = chunk.indexOf('acomodacoes.hotelId');
      expect(activeGate).toBeGreaterThan(-1);
      expect(acoQuery).toBeGreaterThan(-1);
      expect(activeGate).toBeLessThan(acoQuery);
    });

    it('T-extra empreendimento path invalid → 400', async () => {
      const res = await request(buildApp())
        .get(`/api/v1/partners/${PARTNER_A}/empreendimentos/abc/acomodacoes`)
        .set(authHeaders('admin'));
      expect(res.status).toBe(400);
    });

    it('T-extra existing GET empreendimentos still works (regression)', async () => {
      mockGet.mockResolvedValueOnce(sampleAssoc);
      const res = await request(buildApp())
        .get(`/api/v1/partners/${PARTNER_A}/empreendimentos/${EMP_ID}`)
        .set(authHeaders('admin'));
      expect(res.status).toBe(200);
      expect(mockGet).toHaveBeenCalled();
    });
  });

});
