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

describe('Deals — create + stage persists in list', () => {
  beforeEach(() => {
    __resetDealsStoreForTests();
  });

  it('POST then PATCH stage then GET list reflects offer', async () => {
    const app = buildApp();
    const created = await request(app)
      .post('/api/v1/deals')
      .set(authHeaders('corretor', 42))
      .send({
        propertyName: 'Persist Route Test',
        price: 1_200_000,
        stage: 'viewing',
        location: 'Test',
      });

    expect(created.status).toBe(201);
    const dealId = created.body.data?.id as string;
    expect(dealId).toBeTruthy();

    const patched = await request(app)
      .patch(`/api/v1/deals/${dealId}/stage`)
      .set(authHeaders('corretor', 42))
      .send({ stage: 'offer' });

    expect(patched.status).toBe(200);
    expect(patched.body.data.stage).toBe('offer');

    const list = await request(app).get('/api/v1/deals').set(authHeaders('corretor', 42));
    expect(list.status).toBe(200);
    const row = (list.body.data?.items || []).find((d: { id: string }) => d.id === dealId);
    expect(row?.stage).toBe('offer');
  });
});