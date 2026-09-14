import {
  CheckoutService,
  CheckoutBookingNotFoundError,
} from '../../../server/modules/payments/services/checkout.service';

const mockCreateCheckoutSession = jest.fn(async () => ({
  sessionId: 'sess_test_1',
  url: 'https://checkout.example/pay',
  provider: 'mercadopago',
}));

jest.mock('../../../server/modules/payments/factory', () => ({
  getPaymentProvider: () => ({
    createCheckoutSession: mockCreateCheckoutSession,
  }),
}));

const mockSelect = jest.fn();
const mockInsert = jest.fn();

jest.mock('../../../src/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

describe('CheckoutService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PAYMENT_PROVIDER = 'mercadopago';
    process.env.MP_ACCESS_TOKEN = 'test-token';

    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: 42,
              bookingCode: 'BK-42',
              totalAmount: '250.00',
              currency: 'BRL',
              customerEmail: 'guest@example.com',
              customerName: 'Guest',
              status: 'pending',
              metadata: {},
            },
          ],
        }),
      }),
    });

    mockInsert.mockReturnValue({
      values: () => ({
        returning: async () => [
          {
            id: 'pay_uuid_1',
            externalId: 'sess_test_1',
            status: 'pending',
          },
        ],
      }),
    });
  });

  it('cria sessão e persiste pagamento PENDING antes de retornar', async () => {
    const service = new CheckoutService();
    const result = await service.createPublicCheckoutSession({
      bookingId: 42,
      successUrl: 'https://app.example/success',
      cancelUrl: 'https://app.example/cancel',
    });

    expect(mockCreateCheckoutSession).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalled();
    expect(result).toMatchObject({
      paymentId: 'pay_uuid_1',
      sessionId: 'sess_test_1',
      url: 'https://checkout.example/pay',
      status: 'pending',
    });
  });

  it('falha quando reserva não existe', async () => {
    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    });

    const service = new CheckoutService();
    await expect(
      service.createPublicCheckoutSession({
        bookingId: 999,
        successUrl: 'https://app.example/success',
        cancelUrl: 'https://app.example/cancel',
      }),
    ).rejects.toBeInstanceOf(CheckoutBookingNotFoundError);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
