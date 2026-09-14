import { CustomerService } from '../../../server/modules/payments/services/customer.service';

const mockCreateProviderCustomer = jest.fn(async () => ({ externalId: 'mp_cus_123' }));
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock('../../../server/modules/payments/factory', () => ({
  getPaymentProvider: () => ({
    createProviderCustomer: mockCreateProviderCustomer,
  }),
}));

jest.mock('../../../src/db/drizzle', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe('CustomerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PAYMENT_PROVIDER = 'mercadopago';
    process.env.MP_ACCESS_TOKEN = 'test-token';

    mockInsert.mockReturnValue({
      values: () => ({
        returning: async () => [
          {
            id: 'cus_db_1',
            email: 'qa@rsv360.com',
            name: 'Cliente QA',
            stripeCustomerId: null,
            mpCustomerId: 'mp_cus_123',
            metadata: {},
          },
        ],
      }),
    });

    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: 'cus_123',
              email: 'updated@example.com',
              name: 'Updated Customer',
              stripeCustomerId: null,
              mpCustomerId: 'mp_cus_123',
              metadata: {},
            },
          ],
        }),
      }),
    });

    mockUpdate.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: async () => [
            {
              id: 'cus_123',
              email: 'updated@example.com',
              name: 'Updated Customer',
              stripeCustomerId: null,
              mpCustomerId: 'mp_cus_123',
              metadata: {},
            },
          ],
        }),
      }),
    });
  });

  it('cria cliente no provider e persiste no banco', async () => {
    const service = new CustomerService();

    const result = await service.createCustomer('ent_1', {
      email: 'qa@rsv360.com',
      name: 'Cliente QA',
    });

    expect(mockCreateProviderCustomer).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalled();
    expect(result.email).toBe('qa@rsv360.com');
    expect(result.name).toBe('Cliente QA');
    expect(result.externalId).toBe('mp_cus_123');
    expect(result.id).toBe('cus_db_1');
  });

  it('atualiza cliente existente', async () => {
    const service = new CustomerService();
    const result = await service.updateCustomer('cus_123', { name: 'Updated Customer' });

    expect(result.id).toBe('cus_123');
    expect(result.name).toBe('Updated Customer');
    expect(mockUpdate).toHaveBeenCalled();
  });
});
