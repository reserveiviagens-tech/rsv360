import {
  PIXService,
  assertPixProviderConfigured,
} from '../../../server/modules/payments/services/pix.service';
import { PaymentProviderNotConfiguredError } from '../../../server/modules/payments/services/payment.service';
import type {
  CreatePIXDTO,
  PIXProviderInterface,
  PIXResult,
} from '../../../server/modules/payments/interfaces';

function makeFakePixProvider(
  overrides: Partial<PIXProviderInterface> = {},
): PIXProviderInterface {
  const base: PIXProviderInterface = {
    name: 'fake-pix',
    createPIXCharge: async (data: CreatePIXDTO): Promise<PIXResult> => ({
      id: 'pix_live_1',
      externalId: 'pix_ext_1',
      status: 'pending',
      qrCode: 'qr_payload',
      qrCodeBase64: 'qr_b64',
      amount: data.amount,
      description: data.description,
      expiresAt: new Date(Date.now() + 3600_000),
    }),
    getPIXCharge: async (externalId: string): Promise<PIXResult> => ({
      id: externalId,
      externalId,
      status: 'pending',
      qrCode: 'qr_payload',
      qrCodeBase64: 'qr_b64',
      amount: 50,
      description: 'test',
      expiresAt: new Date(Date.now() + 3600_000),
    }),
    cancelPIXCharge: async (externalId: string): Promise<PIXResult> => ({
      id: externalId,
      externalId,
      status: 'cancelled',
      qrCode: 'qr_payload',
      qrCodeBase64: 'qr_b64',
      amount: 50,
      description: 'cancelled',
      expiresAt: new Date(Date.now() + 3600_000),
    }),
    generateQRCode: async () => 'generated_b64',
  };
  return { ...base, ...overrides };
}

describe('PIXService (Aruanda B3c)', () => {
  const prevPix = process.env.PIX_PROVIDER;
  const prevMp = process.env.MP_ACCESS_TOKEN;

  afterEach(() => {
    process.env.PIX_PROVIDER = prevPix;
    process.env.MP_ACCESS_TOKEN = prevMp;
  });

  it('delegates createPIXCharge to provider', async () => {
    process.env.PIX_PROVIDER = 'mercadopago';
    process.env.MP_ACCESS_TOKEN = 'TEST_TOKEN';
    const provider = makeFakePixProvider();
    const spy = jest.spyOn(provider, 'createPIXCharge');
    const service = new PIXService(provider);

    const result = await service.createPIXCharge('ent_1', {
      amount: 50,
      description: 'stay',
      customerId: 'cus_1',
    });

    expect(result.id).toBe('pix_live_1');
    expect(String(result.id)).not.toContain('pix_mock_');
    expect(spy).toHaveBeenCalled();
  });

  it('throws when MP token missing', async () => {
    process.env.PIX_PROVIDER = 'mercadopago';
    delete process.env.MP_ACCESS_TOKEN;
    const service = new PIXService(makeFakePixProvider());
    await expect(
      service.createPIXCharge('ent_1', {
        amount: 10,
        description: 'x',
        customerId: 'cus_1',
      }),
    ).rejects.toThrow(PaymentProviderNotConfiguredError);
  });

  it('assertPixProviderConfigured rejects disabled', () => {
    expect(() =>
      assertPixProviderConfigured({ PIX_PROVIDER: 'none' } as NodeJS.ProcessEnv),
    ).toThrow(PaymentProviderNotConfiguredError);
  });
});
