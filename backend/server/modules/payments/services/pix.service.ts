import { getPIXProvider } from '../factory';
import {
  CreatePIXDTO,
  PIXResult,
  PIXProviderInterface,
} from '../interfaces';
import {
  PaymentProviderNotConfiguredError,
} from './payment.service';

/**
 * Assert PIX provider credentials. Never fall back to silent mocks (Aruanda B3c).
 */
export function assertPixProviderConfigured(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const provider = (env.PIX_PROVIDER || env.PAYMENT_PROVIDER || 'mercadopago').toLowerCase();
  if (provider === 'none' || provider === 'disabled') {
    throw new PaymentProviderNotConfiguredError(
      'PIX provider disabled (PIX_PROVIDER=none|disabled)',
    );
  }
  if (provider === 'mercadopago' && !String(env.MP_ACCESS_TOKEN || '').trim()) {
    throw new PaymentProviderNotConfiguredError(
      'MercadoPago PIX not configured: MP_ACCESS_TOKEN required',
    );
  }
  if (provider === 'openfinance') {
    if (!String(env.PIX_CLIENT_ID || '').trim() || !String(env.PIX_CLIENT_SECRET || '').trim()) {
      throw new PaymentProviderNotConfiguredError(
        'OpenFinance PIX not configured: PIX_CLIENT_ID and PIX_CLIENT_SECRET required',
      );
    }
  }
}

export class PIXService {
  constructor(private readonly provider: PIXProviderInterface = getPIXProvider()) {}

  async createPIXCharge(_enterpriseId: string, data: CreatePIXDTO): Promise<PIXResult> {
    assertPixProviderConfigured();
    return this.provider.createPIXCharge(data);
  }

  async getPIXCharge(id: string): Promise<PIXResult> {
    assertPixProviderConfigured();
    return this.provider.getPIXCharge(id);
  }

  async cancelPIXCharge(id: string): Promise<PIXResult> {
    assertPixProviderConfigured();
    return this.provider.cancelPIXCharge(id);
  }

  async generateQRCode(pixCode: string): Promise<string> {
    assertPixProviderConfigured();
    return this.provider.generateQRCode(pixCode);
  }

  async checkPIXStatus(id: string): Promise<string> {
    assertPixProviderConfigured();
    const charge = await this.provider.getPIXCharge(id);
    return charge.status;
  }

  async listPIXCharges(_limit = 10, _offset = 0): Promise<PIXResult[]> {
    assertPixProviderConfigured();
    throw new Error('PIXService.listPIXCharges not implemented by provider contract');
  }
}
