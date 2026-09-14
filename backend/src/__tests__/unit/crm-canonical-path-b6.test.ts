/**
 * Aruanda B6 — CRM remains under /api/crm (canonical exception outside /api/v1).
 */
describe('crm health canonical path (B6)', () => {
  it('advertises /api/crm and underApiV1=false', async () => {
    jest.resetModules();
    jest.doMock('../../../../server/middleware/auth.middleware', () => ({
      authenticateJwt: (_req: unknown, _res: unknown, next: () => void) => next(),
      requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    }));

    const express = require('express');
    const request = require('supertest');
    const crmRouter = require('../../../../server/modules/crm/routes/index');

    const app = express();
    app.use('/api/crm', crmRouter);

    const res = await request(app).get('/api/crm/health');
    expect(res.status).toBe(200);
    expect(res.body.module).toBe('crm');
    expect(res.body.apiPrefix).toBe('/api/crm');
    expect(res.body.underApiV1).toBe(false);
    expect(res.body.routes.guests).toBe('/api/crm/guests');
  });
});
