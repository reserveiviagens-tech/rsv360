import { MercadoPagoConfig, Payment, Preference, Customer } from 'mercadopago';
import {
  PaymentProviderInterface,
  PIXProviderInterface,
  CreatePaymentDTO,
  PaymentResult,
  CreateRefundDTO,
  RefundResult,
  PaymentFilters,
  PaginatedResult,
  CreatePIXDTO,
  CreateCheckoutSessionDTO,
  CheckoutSessionResult,
  ProviderCustomerInput,
  ProviderCustomerResult,
} from '../interfaces';
import {
  resolveMpAccessToken,
  resolveMpWebhookSecret,
} from '../config';
import { verifyMercadoPagoWebhookSignature } from '../lib/mp-webhook-signature';

export class MercadoPagoProvider implements PaymentProviderInterface, PIXProviderInterface {
  name = 'mercadopago';
  private client: MercadoPagoConfig;

  constructor(accessToken?: string) {
    this.client = new MercadoPagoConfig({
      accessToken: accessToken ?? resolveMpAccessToken(),
      options: { timeout: 5000 },
    });
  }

  async createPayment(data: CreatePaymentDTO): Promise<PaymentResult> {
    const payment = new Payment(this.client);

    const paymentData = {
      transaction_amount: data.amount,
      description: data.description,
      payment_method_id: this.mapPaymentMethod(data.paymentMethod),
      payer: {
        email: 'customer@example.com',
      },
      installments: data.installments || 1,
      metadata: data.metadata,
    };

    const result = await payment.create({ body: paymentData });

    return {
      id: result.id!.toString(),
      externalId: result.id!.toString(),
      status: this.mapStatus(result.status || 'pending'),
      amount: result.transaction_amount!,
      currency: result.currency_id || 'BRL',
      qrCode: result.point_of_interaction?.transaction_data?.qr_code,
      qrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64,
      boletoUrl: result.transaction_details?.external_resource_url,
      boletoBarcode: result.transaction_details?.barcode?.content,
      expiresAt: result.date_of_expiration ? new Date(result.date_of_expiration) : undefined,
      metadata: result.metadata,
    };
  }

  async getPayment(externalId: string): Promise<PaymentResult> {
    const payment = new Payment(this.client);
    const result = await payment.get({ id: externalId });

    return {
      id: result.id!.toString(),
      externalId: result.id!.toString(),
      status: this.mapStatus(result.status || 'pending'),
      amount: result.transaction_amount!,
      currency: result.currency_id || 'BRL',
      qrCode: result.point_of_interaction?.transaction_data?.qr_code,
      qrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64,
      boletoUrl: result.transaction_details?.external_resource_url,
      boletoBarcode: result.transaction_details?.barcode?.content,
      expiresAt: result.date_of_expiration ? new Date(result.date_of_expiration) : undefined,
      metadata: result.metadata,
    };
  }

  async cancelPayment(externalId: string): Promise<PaymentResult> {
    const payment = new Payment(this.client);
    const result = await payment.cancel({ id: externalId });

    return {
      id: result.id!.toString(),
      externalId: result.id!.toString(),
      status: this.mapStatus(result.status || 'cancelled'),
      amount: result.transaction_amount!,
      currency: result.currency_id || 'BRL',
      metadata: result.metadata,
    };
  }

  async createRefund(_data: CreateRefundDTO): Promise<RefundResult> {
    throw new Error('Refund not implemented for Mercado Pago provider');
  }

  async listPayments(filters: PaymentFilters): Promise<PaginatedResult<PaymentResult>> {
    return {
      data: [],
      total: 0,
      limit: filters.limit || 10,
      offset: filters.offset || 0,
    };
  }

  async createCheckoutSession(data: CreateCheckoutSessionDTO): Promise<CheckoutSessionResult> {
    const preference = new Preference(this.client);
    const itemIdBase =
      typeof data.metadata?.bookingId === 'string' || typeof data.metadata?.bookingId === 'number'
        ? String(data.metadata.bookingId)
        : 'checkout';
    const items =
      data.items && data.items.length > 0
        ? data.items.map((item, index) => ({
            id: `${itemIdBase}-${index + 1}`,
            title: item.name,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.amount,
            currency_id: data.currency.toUpperCase(),
          }))
        : [
            {
              id: `${itemIdBase}-1`,
              title: data.description || 'Reserva RSV360',
              quantity: 1,
              unit_price: data.amount,
              currency_id: data.currency.toUpperCase(),
            },
          ];

    // MP rejects auto_return unless back_urls.success is a public https URL
    // (localhost / http → "auto_return invalid. back_url.success must be defined").
    const httpsSuccess = /^https:\/\//i.test(data.successUrl);

    const result = await preference.create({
      body: {
        items,
        payer: {
          email: data.customerEmail,
          name: data.customerName,
        },
        back_urls: {
          success: data.successUrl,
          failure: data.cancelUrl,
          pending: data.successUrl,
        },
        ...(httpsSuccess ? { auto_return: 'approved' as const } : {}),
        metadata: data.metadata as Record<string, string> | undefined,
        external_reference:
          typeof data.metadata?.bookingId === 'string' ||
          typeof data.metadata?.bookingId === 'number'
            ? String(data.metadata.bookingId)
            : undefined,
      },
    });

    const sessionId = result.id!;
    const url = result.init_point || result.sandbox_init_point;
    if (!url) {
      throw new Error('Mercado Pago preference did not return checkout URL');
    }

    return {
      sessionId,
      url,
      provider: this.name,
    };
  }

  async createProviderCustomer(data: ProviderCustomerInput): Promise<ProviderCustomerResult> {
    const customer = new Customer(this.client);
    const result = await customer.create({
      body: {
        email: data.email,
        first_name: data.name.split(' ')[0] || data.name,
        last_name: data.name.split(' ').slice(1).join(' ') || data.name,
        phone: data.phone ? { number: data.phone } : undefined,
        identification: data.document
          ? { type: 'CPF', number: data.document.replace(/\D/g, '') }
          : undefined,
      },
    });

    if (!result.id) {
      throw new Error('Mercado Pago customer creation did not return id');
    }

    return { externalId: String(result.id) };
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    try {
      const bodyStr = typeof payload === 'string' ? payload : payload.toString('utf8');
      let dataIdFromQuery: string | undefined;
      try {
        const parsed = JSON.parse(bodyStr) as { data?: { id?: string | number } };
        if (parsed?.data?.id != null) {
          dataIdFromQuery = String(parsed.data.id);
        }
      } catch {
        // body may not be JSON when called with raw buffer
      }

      verifyMercadoPagoWebhookSignature({
        xSignature: signature,
        xRequestId: undefined,
        dataIdFromQuery,
        secret: resolveMpWebhookSecret(),
      });
      return true;
    } catch {
      return false;
    }
  }

  async createPIXCharge(data: CreatePIXDTO): Promise<any> {
    return this.createPayment({
      ...data,
      paymentMethod: 'pix',
      currency: 'BRL',
    });
  }

  async getPIXCharge(externalId: string): Promise<any> {
    return this.getPayment(externalId);
  }

  async cancelPIXCharge(externalId: string): Promise<any> {
    return this.cancelPayment(externalId);
  }

  async generateQRCode(pixCode: string): Promise<string> {
    const QRCode = require('qrcode');
    return await QRCode.toDataURL(pixCode);
  }

  private mapPaymentMethod(method: string): string {
    switch (method) {
      case 'credit_card':
        return 'visa';
      case 'pix':
        return 'pix';
      case 'boleto':
        return 'bolbradesco';
      default:
        return method;
    }
  }

  private mapStatus(status: string): string {
    switch (status) {
      case 'approved':
        return 'approved';
      case 'pending':
        return 'pending';
      case 'in_process':
        return 'processing';
      case 'rejected':
        return 'rejected';
      case 'cancelled':
        return 'cancelled';
      case 'refunded':
        return 'refunded';
      case 'charged_back':
        return 'charged_back';
      default:
        return 'pending';
    }
  }
}
