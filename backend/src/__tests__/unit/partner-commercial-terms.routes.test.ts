/**
 * C36-CK — commercial terms routes AuthZ / validation (mocked service).
 */
import express from 'express';
import request from 'supertest';

const mockListByPea = jest.fn();
const mockCreateDraft = jest.fn();
const mockActivate = jest.fn();
const mockResolve = jest.fn();

jest.mock('../../../../server/modules/partners/services/partner-commercial-terms.service', () => ({
  partnerCommercialTermsService: {
    listByPea: (...a: unknown[]) => mockListByPea(...a),
    createDraft: (...a: unknown[]) => mockCreateDraft(...a),
    activate: (...a: unknown[]) => mockActivate(...a),
    resolveEffectiveAt: (...a: unknown[]) => mockResolve(...a),
  },
}));

jest.mock('../../../../server/modules/partners/services/partners.service', () => {
  class PartnerForbiddenError extends Error {
    constructor(m?: string) {
      super(m ?? 'Forbidden');
      this.name = 'PartnerForbiddenError';
    }
  }
  class PartnerNotFoundError extends Error {
    constructor(m?: string) {
      super(m ?? 'Not found');
      this.name = 'PartnerNotFoundError';
    }
  }
  class PartnerConflictError extends Error {
    constructor(m?: string) {
      super(m ?? 'Conflict');
      this.name = 'PartnerConflictError';
    }
  }
  return {
    PartnerForbiddenError,
    PartnerNotFoundError,
    PartnerConflictError,
    partnersService: {},
    assertPartnerStaffAccess: (actor: { role: string }) => {
      if (actor.role !== 'admin' && actor.role !== 'manager') {
        throw new PartnerForbiddenError('Forbidden');
      }
    },
  };
});

jest.mock('../../../../server/modules/partners/services/partner-associations.service', () => {
  class PartnerValidationError extends Error {
    constructor(m?: string) {
      super(m ?? 'Invalid');
      this.name = 'PartnerValidationError';
    }
  }
  return {
    PartnerValidationError,
    partnerAssociationsService: {},
  };
});

jest.mock('../../../../server/middleware/auth.middleware', () => ({
  authenticateJwt: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const role = (req.headers['x-test-role'] as string) || 'admin';
    const id = Number(req.headers['x-test-user-id'] || 1);
    (req as express.Request & { user?: { id: number; role: string } }).user = { id, role };
    return next();
  },
  requireRole:
    (...roles: string[]) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const role = (req as express.Request & { user?: { role: string } }).user?.role;
      if (!role || !roles.includes(role)) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
      return next();
    },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const partnersRouter = require('../../../../server/modules/partners/routes/index');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/partners', partnersRouter);
  return app;
}

function authHeaders(role = 'admin') {
  return { Authorization: 'Bearer test', 'x-test-role': role, 'x-test-user-id': '10' };
}

const PEA = '11111111-1111-1111-1111-111111111111';
const TERMS = '22222222-2222-2222-2222-222222222222';

describe('partners commercial-terms API (C36-CK)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('401 sem token', async () => {
    const res = await request(buildApp()).get(
      `/api/v1/partners/associations/${PEA}/commercial-terms`,
    );
    expect(res.status).toBe(401);
    expect(mockListByPea).not.toHaveBeenCalled();
  });

  it('403 role user', async () => {
    const res = await request(buildApp())
      .get(`/api/v1/partners/associations/${PEA}/commercial-terms`)
      .set(authHeaders('user'));
    expect(res.status).toBe(403);
  });

  it('400 rateBps inválido', async () => {
    const res = await request(buildApp())
      .post(`/api/v1/partners/associations/${PEA}/commercial-terms`)
      .set(authHeaders('admin'))
      .send({ rateBps: 10001 });
    expect(res.status).toBe(400);
    expect(mockCreateDraft).not.toHaveBeenCalled();
  });

  it('201 create draft', async () => {
    mockCreateDraft.mockResolvedValue({ id: TERMS, rateBps: 1500, status: 'draft' });
    const res = await request(buildApp())
      .post(`/api/v1/partners/associations/${PEA}/commercial-terms`)
      .set(authHeaders('admin'))
      .send({ rateBps: 1500 });
    expect(res.status).toBe(201);
    expect(mockCreateDraft).toHaveBeenCalled();
  });

  it('404 activate termo inexistente', async () => {
    const { PartnerNotFoundError } = jest.requireMock(
      '../../../../server/modules/partners/services/partners.service',
    );
    mockActivate.mockRejectedValue(new PartnerNotFoundError('Termo comercial não encontrado'));
    const res = await request(buildApp())
      .post(`/api/v1/partners/associations/${PEA}/commercial-terms/${TERMS}/activate`)
      .set(authHeaders('manager'));
    expect(res.status).toBe(404);
  });

  it('resolve ok', async () => {
    mockResolve.mockResolvedValue({ kind: 'ok', rateBps: 1500, terms: { id: TERMS } });
    const res = await request(buildApp())
      .get(`/api/v1/partners/associations/${PEA}/commercial-terms/resolve`)
      .query({ tPay: '2026-06-15T12:00:00.000Z' })
      .set(authHeaders('admin'));
    expect(res.status).toBe(200);
    expect(res.body.data.kind).toBe('ok');
  });

  it('service source does not reference partner_links AuthZ', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(
      path.join(
        __dirname,
        '../../../../server/modules/partners/services/partner-commercial-terms.service.ts',
      ),
      'utf8',
    );
    expect(src).not.toMatch(/\bpartnerLinks\b/);
    expect(src).not.toMatch(/partner_links/);
    expect(src).not.toMatch(/partner_earnings/);
    expect(src).not.toMatch(/partner_ledger/);
  });
});
