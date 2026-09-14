import {
  PaymentService,
  PaymentProviderNotConfiguredError,
  assertPaymentProviderConfigured,
} from '../../../server/modules/payments/services/payment.service';
import type {
  CreatePaymentDTO,
  PaymentFilters,
  PaymentProviderInterface,
  PaymentResult,
  PaginatedResult,
  CreateRefundDTO,
  RefundResult,
} from '../../../server/modules/payments/interfaces';

function makeFakeProvider(overrides: Partial<PaymentProviderInterface> = {}): PaymentProviderInterface {
  const base: PaymentProviderInterface = {
    name: 'fake',
    createPayment: async (data: CreatePaymentDTO): Promise<PaymentResult> => ({
      id: 'pay_live_1',
      externalId: 'ext_1',
      status: 'pending',
      amount: data.amount,
      currency: data.currency,
      metadata: data.metadata || {},
    }),
    getPayment: async (externalId: string): Promise<PaymentResult> => ({
      id: externalId,
      externalId,
      status: 'approved',
      amount: 10,
      currency: 'BRL',
      metadata: {},
    }),
    cancelPayment: async (externalId: string): Promise<PaymentResult> => ({
      id: externalId,
      externalId,
      status: 'cancelled',
      amount: 10,
      currency: 'BRL',
      metadata: {},
    }),
    createRefund: async (_data: CreateRefundDTO): Promise<RefundResult> => {
      throw new Error('not used');
    },
    listPayments: async (filters: PaymentFilters): Promise<PaginatedResult<PaymentResult>> => ({
      data: [
        {
          id: 'pay_live_1',
          externalId: 'ext_1',
          status: 'approved',
          amount: 100,
          currency: 'BRL',
          metadata: {},
        },
      ],
      total: 1,
      limit: filters.limit || 10,
      offset: filters.offset || 0,
    }),
    verifyWebhookSignature: () => true,
  };
  return { ...base, ...overrides };
}

describe('PaymentService (Aruanda B3b)', () => {
  const prevProvider = process.env.PAYMENT_PROVIDER;
  const prevMp = process.env.MP_ACCESS_TOKEN;

  afterEach(() => {
    process.env.PAYMENT_PROVIDER = prevProvider;
    process.env.MP_ACCESS_TOKEN = prevMp;
  });

  it('delegates createPayment to provider and preserves metadata + enterpriseId', async () => {
    process.env.PAYMENT_PROVIDER = 'mercadopago';
    process.env.MP_ACCESS_TOKEN = 'TEST_TOKEN';
    const provider = makeFakeProvider();
    const createSpy = jest.spyOn(provider, 'createPayment');
    const service = new PaymentService(provider);

    const result = await service.createPayment('ent_1', {
      amount: 123.45,
      currency: 'BRL',
      customerId: 'cus_1',
      paymentMethod: 'pix',
      metadata: { source: 'test' },
    });

    expect(result.id).toBe('pay_live_1');
    expect(result.status).toBe('pending');
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 123.45,
        metadata: { source: 'test', enterpriseId: 'ent_1' },
      }),
    );
  });

  it('delegates listPayments to provider', async () => {
    process.env.PAYMENT_PROVIDER = 'mercadopago';
    process.env.MP_ACCESS_TOKEN = 'TEST_TOKEN';
    const service = new PaymentService(makeFakeProvider());
    const result = await service.listPayments('ent_1');

    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe('pay_live_1');
    expect(result.limit).toBe(10);
  });

  it('throws explicit error when provider disabled', () => {
    expect(() =>
      assertPaymentProviderConfigured({ PAYMENT_PROVIDER: 'none' } as NodeJS.ProcessEnv),
    ).toThrow(PaymentProviderNotConfiguredError);
  });

  it('throws explicit error when MP token missing', async () => {
    process.env.PAYMENT_PROVIDER = 'mercadopago';
    delete process.env.MP_ACCESS_TOKEN;
    const service = new PaymentService(makeFakeProvider());
    await expect(
      service.createPayment('ent_1', {
        amount: 1,
        currency: 'BRL',
        customerId: 'cus_1',
        paymentMethod: 'pix',
      }),
    ).rejects.toThrow(PaymentProviderNotConfiguredError);
  });
});
