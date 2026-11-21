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
import rentalContractsRouter from '../../../../server/modules/rental-contracts/routes/index';
import {
  __resetSignStoreForTests,
  completeSignRequest,
  createSignRequest,
} from '../../../../server/modules/rental-contracts/services/rental-contract.service';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/rental-contracts', rentalContractsRouter);
  return app;
}

function authHeaders(role: string, userId: number) {
  return { 'x-test-role': role, 'x-test-user-id': String(userId) };
}

describe('Rental sign audit export (admin)', () => {
  beforeEach(() => {
    __resetSignStoreForTests();
  });

  it('returns 403 for corretor', async () => {
    const res = await request(buildApp())
      .get('/api/v1/rental-contracts/admin/sign-audit/export')
      .set(authHeaders('corretor', 1));
    expect(res.status).toBe(403);
  });

  it('exports JSON for admin with signed events', async () => {
    const created = await createSignRequest({
      unitId: 'u-export',
      unitName: 'Tower',
      address: '1 St',
      monthlyRent: 2000,
      startDate: '2026-11-17',
      signerEmail: 'x@example.com',
      signerName: 'Export Test',
      signerCpf: '12345678901',
      termMonths: 12,
      depositType: 'caucao',
    });
    await completeSignRequest(created.id, created.signingToken!);

    const res = await request(buildApp())
      .get('/api/v1/rental-contracts/admin/sign-audit/export')
      .query({ unitId: 'u-export', requestId: created.id })
      .set(authHeaders('admin', 99));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBeGreaterThan(0);
    expect(JSON.stringify(res.body)).not.toMatch(/cpf|token/i);
  });

  it('exports CSV for manager', async () => {
    const created = await createSignRequest({
      unitId: 'u-csv',
      unitName: 'CSV Tower',
      address: '2 St',
      monthlyRent: 2100,
      startDate: '2026-11-17',
      signerEmail: 'csv@example.com',
      signerName: 'CSV User',
      signerCpf: '98765432100',
      termMonths: 6,
      depositType: 'caucao',
    });

    const res = await request(buildApp())
      .get('/api/v1/rental-contracts/admin/sign-audit/export')
      .query({ format: 'csv', unitId: 'u-csv', requestId: created.id })
      .set(authHeaders('manager', 12));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('event_id');
    expect(res.text).toContain('created');
  });
});