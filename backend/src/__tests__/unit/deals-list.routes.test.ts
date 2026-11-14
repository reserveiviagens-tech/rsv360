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
});
