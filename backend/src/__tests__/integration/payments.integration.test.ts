import request from 'supertest';
import { authHeader } from '../../test/fase1-test-helpers';

const fakePaymentProvider = {
  name: 'fake',
  createPayment: jest.fn(async (data: { amount: number; currency: string; metadata?: Record<string, unknown> }) => ({
    id: 'pay_live_int_1',
    externalId: 'ext_int_1',
    status: 'pending',
    amount: data.amount,
    currency: data.currency,
    metadata: data.metadata || {},
  })),
  getPayment: jest.fn(async (externalId: string) => ({
    id: externalId,
    externalId,
    status: 'approved',
    amount: 150,
    currency: 'BRL',
    metadata: {},
  })),
  cancelPayment: jest.fn(async (externalId: string) => ({
    id: externalId,
    externalId,
    status: 'cancelled',
    amount: 150,
    currency: 'BRL',
    metadata: {},
  })),
  createRefund: jest.fn(),
  listPayments: jest.fn(async () => ({
    data: [
      {
        id: 'pay_live_int_1',
        externalId: 'ext_int_1',
        status: 'approved',
        amount: 150,
        currency: 'BRL',
        metadata: {},
      },
    ],
    total: 1,
    limit: 10,
    offset: 0,
  })),
  createCheckoutSession: jest.fn(async () => ({
    sessionId: 'chk_sess_int_1',
    url: 'https://checkout.example/session',
    provider: 'fake',
  })),
  createProviderCustomer: jest.fn(async (data: { email: string; name: string }) => ({
    externalId: `ext_cus_${data.email}`,
  })),
  verifyWebhookSignature: () => true,
};

jest.mock('../../../server/modules/payments/factory', () => ({
  getPaymentProvider: () => fakePaymentProvider,
  getSubscriptionProvider: () => fakePaymentProvider,
  getPIXProvider: () => fakePaymentProvider,
}));

jest.mock('../../../src/db/drizzle', () => {
  const paymentRows: Array<Record<string, unknown>> = [];
  const customerRows: Array<Record<string, unknown>> = [];
  let paymentSeq = 0;
  let customerSeq = 0;

  return {
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: 1,
                bookingCode: 'BK-INT-1',
                totalAmount: '150.00',
                currency: 'BRL',
                customerEmail: 'guest@example.com',
                customerName: 'Guest',
                status: 'pending',
                metadata: {},
              },
            ],
          }),
        }),
      }),
      insert: (table: { _: { name?: string } }) => ({
        values: (row: Record<string, unknown>) => ({
          returning: async () => {
            if (table?._?.name === 'payment_customers' || row.email) {
              customerSeq += 1;
              const created = {
                id: `cus_int_${customerSeq}`,
                stripeCustomerId: null,
                mpCustomerId: row.mpCustomerId || 'mp_int_1',
                metadata: row.metadata || {},
                ...row,
              };
              customerRows.push(created);
              return [created];
            }
            paymentSeq += 1;
            const created = {
              id: `pay_int_${paymentSeq}`,
              status: 'pending',
              externalId: row.externalId,
              ...row,
            };
            paymentRows.push(created);
            return [created];
          },
        }),
      }),
      update: () => ({
        set: (patch: Record<string, unknown>) => ({
          where: () => ({
            returning: async () => [
              {
                id: 'cus_int_1',
                email: patch.email || 'test@rsv360.com',
                name: patch.name || 'Tester Updated',
                stripeCustomerId: null,
                mpCustomerId: 'mp_int_1',
                metadata: patch.metadata || {},
              },
            ],
          }),
        }),
      }),
      delete: () => ({
        where: async () => undefined,
      }),
    },
  };
});

jest.mock('../../../../server/modules/guest-portal/services/token.service', () => ({
  tokenService: {
    validateToken: jest.fn(async (token: string) => {
      if (token !== 'valid_portal_token') return null;
      return {
        booking: { id: 1 },
        guest: {},
        token: { token },
      };
    }),
  },
}));

jest.mock('../../../../server/middleware/public-limiter', () => ({
  publicLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  initPublicLimiter: async () => undefined,
}));

const { createApp } = require('../../../app');

describe('Payments Integration', () => {
  let app: any;

  beforeAll(async () => {
    process.env.PAYMENT_PROVIDER = 'mercadopago';
    process.env.MP_ACCESS_TOKEN = 'test-token';
    app = await createApp();
  });

  it('rejects staff payments routes without JWT (PR-01)', async () => {
    const response = await request(app)
      .get('/api/v1/payments/payments')
      .query({ enterpriseId: 'ent_1' });
    expect(response.status).toBe(401);
  });

  it('cria e consulta pagamento via provider (sem mock silencioso)', async () => {
    const createResponse = await request(app)
      .post('/api/v1/payments/payments')
      .set(authHeader())
      .send({
        enterpriseId: 'ent_1',
        amount: 150,
        currency: 'BRL',
        customerId: 'cus_1',
        paymentMethod: 'pix',
      });

    expect(createResponse.status).toBe(200);
    expect(createResponse.body.id).toBe('pay_live_int_1');
    expect(String(createResponse.body.id)).not.toContain('pay_mock_');
    expect(fakePaymentProvider.createPayment).toHaveBeenCalled();

    const getResponse = await request(app)
      .get(`/api/v1/payments/payments/${createResponse.body.id}`)
      .set(authHeader())
      .query({ enterpriseId: 'ent_1' });

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.id).toBe(createResponse.body.id);
  });

  it('lista pagamentos e pix', async () => {
    const paymentsResponse = await request(app)
      .get('/api/v1/payments/payments')
      .set(authHeader())
      .query({ enterpriseId: 'ent_1' });

    expect(paymentsResponse.status).toBe(200);
    expect(Array.isArray(paymentsResponse.body.data)).toBe(true);

    const pixResponse = await request(app)
      .get('/api/v1/payments/pix')
      .set(authHeader());
    // listPIXCharges is not on provider contract — explicit error, not silent mock (B3c)
    expect([200, 500, 503]).toContain(pixResponse.status);
    if (pixResponse.status === 200) {
      expect(Array.isArray(pixResponse.body)).toBe(true);
    } else {
      expect(pixResponse.body.error).toBeTruthy();
    }
  });

  it('cria e atualiza cliente', async () => {
    const createResponse = await request(app)
      .post('/api/v1/payments/customers')
      .set(authHeader())
      .send({ enterpriseId: 'ent_1', email: 'test@rsv360.com', name: 'Tester' });

    expect(createResponse.status).toBe(200);
    expect(fakePaymentProvider.createProviderCustomer).toHaveBeenCalled();

    const updateResponse = await request(app)
      .put(`/api/v1/payments/customers/${createResponse.body.id}`)
      .set(authHeader())
      .send({ name: 'Tester Updated' });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.name).toBe('Tester Updated');
  });

  it('rejeita checkout público sem portal token', async () => {
    const response = await request(app)
      .post('/api/v1/payments/public/checkout/session')
      .send({
        bookingId: 1,
        successUrl: 'https://app.example/success',
        cancelUrl: 'https://app.example/cancel',
      });

    expect(response.status).toBe(401);
  });

  it('cria checkout público com portal token válido (201 + persistência)', async () => {
    const response = await request(app)
      .post('/api/v1/payments/public/checkout/session')
      .set('X-Portal-Token', 'valid_portal_token')
      .send({
        bookingId: 1,
        successUrl: 'https://app.example/success',
        cancelUrl: 'https://app.example/cancel',
      });

    expect(response.status).toBe(201);
    expect(response.body.sessionId).toBe('chk_sess_int_1');
    expect(response.body.url).toBeTruthy();
    expect(response.body.paymentId).toBeTruthy();
    expect(fakePaymentProvider.createCheckoutSession).toHaveBeenCalled();
  });
});
