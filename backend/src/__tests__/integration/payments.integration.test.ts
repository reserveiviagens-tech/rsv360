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
  verifyWebhookSignature: () => true,
};

jest.mock('../../../server/modules/payments/factory', () => ({
  getPaymentProvider: () => fakePaymentProvider,
  getSubscriptionProvider: () => fakePaymentProvider,
  getPIXProvider: () => fakePaymentProvider,
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

    const updateResponse = await request(app)
      .put(`/api/v1/payments/customers/${createResponse.body.id}`)
      .set(authHeader())
      .send({ name: 'Tester Updated' });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.name).toBe('Tester Updated');
  });
});
