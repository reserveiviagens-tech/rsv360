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
import dealsRouter from '../../../../server/modules/deals/routes/index';
import { __resetDealsStoreForTests } from '../../../../server/modules/deals/services/deals.service';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/deals', dealsRouter);
  return app;
}

function authHeaders(role: string, userId: number) {
  return { 'x-test-role': role, 'x-test-user-id': String(userId) };
}

describe('Deals — GET / and GET /health', () => {
  beforeEach(() => {
    __resetDealsStoreForTests();
  });

  it('GET /health returns 200 without auth', async () => {
    const res = await request(buildApp()).get('/api/v1/deals/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ module: 'deals', status: 'ok' });
  });

  it('GET / returns 401 without auth', async () => {
    const res = await request(buildApp()).get('/api/v1/deals');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET / returns 403 for unauthorized role (ex: guest)', async () => {
    const res = await request(buildApp())
      .get('/api/v1/deals')
      .set(authHeaders('guest', 1));
    expect(res.status).toBe(403);
  });

  it('GET / returns deals list for corretor', async () => {
    const res = await request(buildApp())
      .get('/api/v1/deals')
      .set(authHeaders('corretor', 42));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);

    const first = res.body.data.items[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('propertyName');
    expect(first).toHaveProperty('stage');
    expect(first).toHaveProperty('price');
    expect(first).toHaveProperty('commission');
  });

  describe('POST / (Create Deal)', () => {
    it('returns 201 and creates deal successfully for corretor', async () => {
      const payload = {
        propertyName: 'Residência James Thornwood',
        price: 1_600_000,
        propertyType: 'House',
        location: 'La Jolla Cove',
        stage: 'viewing',
        clientName: 'James Thornwood',
        notes: 'Lead VIP convertido de compra',
      };

      const res = await request(buildApp())
        .post('/api/v1/deals')
        .set(authHeaders('corretor', 101))
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.propertyName).toBe('Residência James Thornwood');
      expect(res.body.data.price).toBe(1_600_000);
      expect(res.body.data.stage).toBe('viewing');
      expect(res.body.data.status).toBe('active');
    });

    it('returns 400 when propertyName is missing', async () => {
      const res = await request(buildApp())
        .post('/api/v1/deals')
        .set(authHeaders('corretor', 101))
        .send({ price: 500_000 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Payload inválido');
    });

    it('returns 401 when unauthenticated', async () => {
      const res = await request(buildApp())
        .post('/api/v1/deals')
        .send({ propertyName: 'Test Deal' });

      expect(res.status).toBe(401);
    });

    it('returns 403 for unauthorized role', async () => {
      const res = await request(buildApp())
        .post('/api/v1/deals')
        .set(authHeaders('guest', 99))
        .send({ propertyName: 'Test Deal' });

      expect(res.status).toBe(403);
    });
  });
});
