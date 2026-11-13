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

describe('Deals — PATCH /:id/stage', () => {
  beforeEach(() => {
    __resetDealsStoreForTests();
  });

  it('returns 401 without auth', async () => {
    const res = await request(buildApp())
      .patch('/api/v1/deals/deal_001/stage')
      .send({ stage: 'offer' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid stage', async () => {
    const res = await request(buildApp())
      .patch('/api/v1/deals/deal_001/stage')
      .set(authHeaders('corretor', 42))
      .send({ stage: 'invalid' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown deal', async () => {
    const res = await request(buildApp())
      .patch('/api/v1/deals/unknown/stage')
      .set(authHeaders('corretor', 42))
      .send({ stage: 'offer' });
    expect(res.status).toBe(404);
  });

  it('updates stage for corretor', async () => {
    const res = await request(buildApp())
      .patch('/api/v1/deals/deal_001/stage')
      .set(authHeaders('corretor', 42))
      .send({ stage: 'under_contract' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stage).toBe('under_contract');
    expect(res.body.data.id).toBe('deal_001');
  });

  it('returns 403 for role without parceiro access', async () => {
    const res = await request(buildApp())
      .patch('/api/v1/deals/deal_001/stage')
      .set(authHeaders('guest', 1))
      .send({ stage: 'offer' });
    expect(res.status).toBe(403);
  });
});
