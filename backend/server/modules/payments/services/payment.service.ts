import { getPaymentProvider } from '../factory';
import {
  CreatePaymentDTO,
  PaymentResult,
  PaymentFilters,
  PaginatedResult,
  PaymentProviderInterface,
} from '../interfaces';
import { resolveMpAccessToken, resolvePaymentProvider, resolveStripeSecretKey } from '../config';

export class PaymentProviderNotConfiguredError extends Error {
  readonly code = 'PAYMENT_PROVIDER_NOT_CONFIGURED';

  constructor(message: string) {
    super(message);
    this.name = 'PaymentProviderNotConfiguredError';
  }
}

/**
 * Assert live payment credentials. Never fall back to silent mocks (Aruanda B3b).
 */
export function assertPaymentProviderConfigured(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const provider = resolvePaymentProvider(env);
  if (provider === 'none' || provider === 'disabled') {
    throw new PaymentProviderNotConfiguredError(
      'Payment provider disabled (PAYMENT_PROVIDER=none|disabled)',
    );
  }
  if (provider === 'mercadopago' && !resolveMpAccessToken(env)) {
    throw new PaymentProviderNotConfiguredError(
      'MercadoPago not configured: MP_ACCESS_TOKEN required (MERCADOPAGO_ACCESS_TOKEN deprecated)',
    );
  }
  if (provider === 'stripe' && !resolveStripeSecretKey(env)) {
    throw new PaymentProviderNotConfiguredError(
      'Stripe not configured: STRIPE_SECRET_KEY required',
    );
  }
}

export class PaymentService {
  constructor(private readonly provider: PaymentProviderInterface = getPaymentProvider()) {}

  async createPayment(enterpriseId: string, data: CreatePaymentDTO): Promise<PaymentResult> {
    assertPaymentProviderConfigured();
    return this.provider.createPayment({
      ...data,
      metadata: {
        ...(data.metadata || {}),
        enterpriseId,
      },
    });
  }

  async getPayment(_enterpriseId: string, paymentId: string): Promise<PaymentResult> {
    assertPaymentProviderConfigured();
    return this.provider.getPayment(paymentId);
  }

  async listPayments(
    _enterpriseId: string,
    filters: PaymentFilters = {},
  ): Promise<PaginatedResult<PaymentResult>> {
    assertPaymentProviderConfigured();
    return this.provider.listPayments(filters);
  }

  async cancelPayment(_enterpriseId: string, paymentId: string): Promise<PaymentResult> {
    assertPaymentProviderConfigured();
    return this.provider.cancelPayment(paymentId);
  }

  async getPaymentsByBooking(_bookingId: string): Promise<PaymentResult[]> {
    throw new Error('PaymentService.getPaymentsByBooking not implemented');
  }

  async getPaymentsByCustomer(_customerId: string): Promise<PaymentResult[]> {
    throw new Error('PaymentService.getPaymentsByCustomer not implemented');
  }

  async getPaymentStats(_enterpriseId: string): Promise<unknown> {
    throw new Error('PaymentService.getPaymentStats not implemented');
  }
}
