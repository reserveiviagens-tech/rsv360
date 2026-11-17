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
    req.user = { id: Number(userId), role, email: 'corretor@rsv360.com', name: 'Corretor Lintel' };
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
import {
  __resetDealsStoreForTests,
  listDeals,
} from '../../../../server/modules/deals/services/deals.service';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/deals', dealsRouter);
  return app;
}

function authHeaders(role: string = 'corretor', userId: number = 42) {
  return { 'x-test-role': role, 'x-test-user-id': String(userId) };
}

describe('E2E Integration Test — Lintel CRM Funnel (Lead ➔ Deal ➔ Kanban ➔ Closed)', () => {
  beforeEach(() => {
    __resetDealsStoreForTests();
  });

  it('1. GET /health — verifica disponibilidade operacional do módulo CRM Deals', async () => {
    const res = await request(buildApp()).get('/api/v1/deals/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ module: 'deals', status: 'ok' });
  });

  it('2. E2E Complete Funnel: converte lead, lista no pipeline, avança etapas e fecha com vitória', async () => {
    const app = buildApp();

    // Passo A: Simula conversão do Lead VIP em Deal
    const leadPayload = {
      propertyName: 'Mansão Thornwood - Vista Mar',
      price: 1_600_000,
      propertyType: 'House',
      location: 'La Jolla Cove',
      stage: 'viewing' as const,
      clientName: 'James Thornwood',
      clientEmail: 'j.thornwood@apexholdings.co.uk',
      clientPhone: '+44 7700 900123',
      notes: 'Lead VIP convertido da esteira Luxury Portfolio Web com Score 94',
      leadId: 'l1',
    };

    const createRes = await request(app)
      .post('/api/v1/deals')
      .set(authHeaders('corretor', 42))
      .send(leadPayload);

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);

    const deal = createRes.body.data;
    expect(deal).toHaveProperty('id');
    expect(deal.propertyName).toBe('Mansão Thornwood - Vista Mar');
    expect(deal.price).toBe(1_600_000);
    expect(deal.commission).toBe(24_000); // 1.5% de 1.6M
    expect(deal.stage).toBe('viewing');
    expect(deal.status).toBe('active');

    const dealId = deal.id;

    // Passo B: Verifica presença na listagem ativa do Kanban
    const listRes = await request(app)
      .get('/api/v1/deals')
      .set(authHeaders('corretor', 42));

    expect(listRes.status).toBe(200);
    const allItems = listRes.body.data.items;
    const foundInList = allItems.find((d: any) => d.id === dealId);
    expect(foundInList).toBeDefined();
    expect(foundInList.stage).toBe('viewing');

    // Passo C: Avança etapa: viewing ➔ offer
    const toOfferRes = await request(app)
      .patch(`/api/v1/deals/${dealId}/stage`)
      .set(authHeaders('corretor', 42))
      .send({ stage: 'offer' });

    expect(toOfferRes.status).toBe(200);
    expect(toOfferRes.body.data.stage).toBe('offer');
    expect(toOfferRes.body.data.status).toBe('active');

    // Passo D: Avança etapa: offer ➔ negotiation
    const toNegRes = await request(app)
      .patch(`/api/v1/deals/${dealId}/stage`)
      .set(authHeaders('corretor', 42))
      .send({ stage: 'negotiation' });

    expect(toNegRes.status).toBe(200);
    expect(toNegRes.body.data.stage).toBe('negotiation');

    // Passo E: Avança etapa: negotiation ➔ under_contract
    const toContractRes = await request(app)
      .patch(`/api/v1/deals/${dealId}/stage`)
      .set(authHeaders('corretor', 42))
      .send({ stage: 'under_contract' });

    expect(toContractRes.status).toBe(200);
    expect(toContractRes.body.data.stage).toBe('under_contract');

    // Passo F: Fechamento: under_contract ➔ closed (ganho)
    const toClosedRes = await request(app)
      .patch(`/api/v1/deals/${dealId}/stage`)
      .set(authHeaders('corretor', 42))
      .send({ stage: 'closed' });

    expect(toClosedRes.status).toBe(200);
    expect(toClosedRes.body.data.stage).toBe('closed');
    expect(toClosedRes.body.data.status).toBe('won');

    // Passo G: Auditoria de Win Rate pós-fechamento
    const dealsSnapshot = listDeals();
    const wonCount = dealsSnapshot.filter((d) => d.status === 'won').length;
    const lostCount = dealsSnapshot.filter((d) => d.status === 'lost').length;
    const decided = wonCount + lostCount;
    expect(decided).toBeGreaterThan(0);
    const winRate = Math.round((wonCount / decided) * 100);
    expect(winRate).toBeGreaterThan(0);
    expect(winRate).toBeLessThanOrEqual(100);
  });

  it('3. RBAC Enforcement: bloqueia anônimos e perfis sem autorização', async () => {
    const app = buildApp();

    // 401 sem header de autenticação
    const unauthPost = await request(app)
      .post('/api/v1/deals')
      .send({ propertyName: 'Deal Anônimo' });
    expect(unauthPost.status).toBe(401);

    const unauthGet = await request(app).get('/api/v1/deals');
    expect(unauthGet.status).toBe(401);

    // 403 para perfil 'guest' (não parceiro e não staff)
    const forbiddenPost = await request(app)
      .post('/api/v1/deals')
      .set(authHeaders('guest', 999))
      .send({ propertyName: 'Deal Convidado' });
    expect(forbiddenPost.status).toBe(403);
  });
});
