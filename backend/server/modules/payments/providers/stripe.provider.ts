import Stripe from 'stripe';
import {
  PaymentProviderInterface,
  CreatePaymentDTO,
  PaymentResult,
  CreateRefundDTO,
  RefundResult,
  PaymentFilters,
  PaginatedResult,
  CreateCheckoutSessionDTO,
  CheckoutSessionResult,
  ProviderCustomerInput,
  ProviderCustomerResult,
} from '../interfaces';
import { resolveStripeSecretKey, resolveStripeWebhookSecret } from '../config';

export class StripeProvider implements PaymentProviderInterface {
  name = 'stripe';
  private client: Stripe;

  constructor(secretKey?: string) {
    this.client = new Stripe(secretKey ?? resolveStripeSecretKey());
  }

  async createPayment(data: CreatePaymentDTO): Promise<PaymentResult> {
    const paymentIntent = await this.client.paymentIntents.create({
      amount: Math.round(data.amount * 100),
      currency: data.currency.toLowerCase(),
      description: data.description,
      payment_method_types: this.mapPaymentMethod(data.paymentMethod),
      metadata: data.metadata as Stripe.MetadataParam | undefined,
    });

    return {
      id: paymentIntent.id,
      externalId: paymentIntent.id,
      status: this.mapStatus(paymentIntent.status),
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      metadata: paymentIntent.metadata,
    };
  }

  async getPayment(externalId: string): Promise<PaymentResult> {
    const paymentIntent = await this.client.paymentIntents.retrieve(externalId);

    return {
      id: paymentIntent.id,
      externalId: paymentIntent.id,
      status: this.mapStatus(paymentIntent.status),
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      metadata: paymentIntent.metadata,
    };
  }

  async cancelPayment(externalId: string): Promise<PaymentResult> {
    const paymentIntent = await this.client.paymentIntents.cancel(externalId);

    return {
      id: paymentIntent.id,
      externalId: paymentIntent.id,
      status: this.mapStatus(paymentIntent.status),
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      metadata: paymentIntent.metadata,
    };
  }

  async createRefund(data: CreateRefundDTO): Promise<RefundResult> {
    const refund = await this.client.refunds.create({
      payment_intent: data.paymentId,
      amount: Math.round(data.amount * 100),
      reason: data.reason as Stripe.RefundCreateParams.Reason | undefined,
      metadata: data.metadata as Stripe.MetadataParam | undefined,
    });

    return {
      id: refund.id,
      externalId: refund.id,
      status: refund.status === 'succeeded' ? 'approved' : 'pending',
      amount: refund.amount / 100,
      processedAt: new Date(refund.created * 1000),
      metadata: refund.metadata,
    };
  }

  async listPayments(filters: PaymentFilters): Promise<PaginatedResult<PaymentResult>> {
    const params: Stripe.PaymentIntentListParams = {
      limit: filters.limit || 10,
    };

    if (filters.customerId) {
      params.customer = filters.customerId;
    }

    const result = await this.client.paymentIntents.list(params);

    const data = result.data.map((pi) => ({
      id: pi.id,
      externalId: pi.id,
      status: this.mapStatus(pi.status),
      amount: pi.amount / 100,
      currency: pi.currency.toUpperCase(),
      metadata: pi.metadata,
    }));

    return {
      data,
      total: result.data.length,
      limit: params.limit!,
      offset: 0,
    };
  }

  async createCheckoutSession(data: CreateCheckoutSessionDTO): Promise<CheckoutSessionResult> {
    const lineItems =
      data.items && data.items.length > 0
        ? data.items.map((item) => ({
            price_data: {
              currency: data.currency.toLowerCase(),
              product_data: {
                name: item.name,
                description: item.description,
              },
              unit_amount: Math.round(item.amount * 100),
            },
            quantity: item.quantity,
          }))
        : [
            {
              price_data: {
                currency: data.currency.toLowerCase(),
                product_data: {
                  name: data.description || 'Reserva RSV360',
                },
                unit_amount: Math.round(data.amount * 100),
              },
              quantity: 1,
            },
          ];

    const session = await this.client.checkout.sessions.create({
      mode: 'payment',
      customer_email: data.customerEmail,
      line_items: lineItems,
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      metadata: data.metadata as Stripe.MetadataParam | undefined,
      payment_method_types: this.mapPaymentMethod(data.paymentMethod || 'credit_card'),
    });

    if (!session.url) {
      throw new Error('Stripe checkout session did not return URL');
    }

    return {
      sessionId: session.id,
      url: session.url,
      provider: this.name,
    };
  }

  async createProviderCustomer(data: ProviderCustomerInput): Promise<ProviderCustomerResult> {
    const customer = await this.client.customers.create({
      email: data.email,
      name: data.name,
      phone: data.phone,
      metadata: data.metadata as Stripe.MetadataParam | undefined,
    });

    return { externalId: customer.id };
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    try {
      this.client.webhooks.constructEvent(
        payload,
        signature,
        resolveStripeWebhookSecret(),
      );
      return true;
    } catch {
      return false;
    }
  }

  private mapPaymentMethod(method: string): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
    switch (method) {
      case 'credit_card':
        return ['card'];
      case 'boleto':
        return ['boleto'];
      case 'pix':
        return ['pix'];
      default:
        return ['card'];
    }
  }

  private mapStatus(status: string): string {
    switch (status) {
      case 'succeeded':
        return 'approved';
      case 'processing':
        return 'processing';
      case 'requires_payment_method':
        return 'pending';
      case 'canceled':
        return 'cancelled';
      default:
        return 'pending';
    }
  }
}
