import express from 'express';
import request from 'supertest';

jest.mock('../../../../server/middleware/auth.middleware', () => ({
  authenticateJwt: (
    req: { headers: Record<string, string | undefined>; user?: unknown },
    res: { status: (n: number) => { json: (b: unknown) => void } },
    next: () => void,
  ) => {
    if (!req.headers['x-test-role']) {
      return res.status(401).json({ success: false, error: 'Token ausente' });
    }
    req.user = { id: 1, role: req.headers['x-test-role'], email: 'agent@test.com', name: 'Agent' };
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
  staffAuth: [
    (
      req: { headers: Record<string, string | undefined>; user?: unknown },
      res: { status: (n: number) => { json: (b: unknown) => void } },
      next: () => void,
    ) => {
      if (!req.headers['x-test-role']) {
        return res.status(401).json({ success: false });
      }
      req.user = { id: 1, role: req.headers['x-test-role'] };
      next();
    },
  ],
  optionalJwt: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import propostasRouter from '../../../../server/modules/propostas/routes/index';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/propostas', propostasRouter);
  return app;
}

describe('Propostas Rio Quente — Fatia 3', () => {
  it('GET /rio-quente/catalog requires auth', async () => {
    const res = await request(buildApp()).get('/api/v1/propostas/rio-quente/catalog');
    expect(res.status).toBe(401);
  });

  it('GET /rio-quente/catalog returns Luupi and Giardino', async () => {
    const res = await request(buildApp())
      .get('/api/v1/propostas/rio-quente/catalog')
      .set({ 'x-test-role': 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('POST /rio-quente/preview builds draft', async () => {
    const res = await request(buildApp())
      .post('/api/v1/propostas/rio-quente/preview')
      .set({ 'x-test-role': 'user' })
      .send({
        hotelId: 'luupi',
        checkIn: '2026-06-01',
        checkOut: '2026-06-04',
        adultos: 2,
        nomeCliente: 'Cliente',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.draft.hotel.nome).toBe('Luupi');
    expect(res.body.data.whatsapp).toContain('Cliente');
    expect(res.body.data.pdfHtml).toContain('Luupi');
  });
});