import { eq } from 'drizzle-orm';
import { db } from '../../../../src/db/drizzle';
import { bookings, payments } from '../../../../src/db/schema';
import { getPaymentProvider } from '../factory';
import { assertPaymentProviderConfigured } from './payment.service';
import {
  resolveEnterpriseId,
  resolvePaymentProvider,
} from '../config';
import type { PublicCheckoutSessionInput } from '../schemas/checkout-session.schema';

export class CheckoutBookingNotFoundError extends Error {
  readonly code = 'CHECKOUT_BOOKING_NOT_FOUND';

  constructor() {
    super('Reserva não encontrada');
    this.name = 'CheckoutBookingNotFoundError';
  }
}

export class CheckoutBookingNotPayableError extends Error {
  readonly code = 'CHECKOUT_BOOKING_NOT_PAYABLE';

  constructor() {
    super('Reserva não está elegível para pagamento');
    this.name = 'CheckoutBookingNotPayableError';
  }
}

export class CheckoutService {
  async createPublicCheckoutSession(input: PublicCheckoutSessionInput) {
    assertPaymentProviderConfigured();

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, input.bookingId))
      .limit(1);

    if (!booking) {
      throw new CheckoutBookingNotFoundError();
    }

    const bookingStatus = String(booking.status || '').toLowerCase();
    if (bookingStatus === 'cancelled' || bookingStatus === 'canceled') {
      throw new CheckoutBookingNotPayableError();
    }

    const amount = Number.parseFloat(String(booking.totalAmount));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new CheckoutBookingNotPayableError();
    }

    const provider = getPaymentProvider();
    const providerName = resolvePaymentProvider();
    const enterpriseId = resolveEnterpriseId(
      (booking.metadata as { enterpriseId?: string } | null)?.enterpriseId,
    );

    const metadata: Record<string, unknown> = {
      bookingId: input.bookingId,
      bookingCode: booking.bookingCode,
      ...(input.metadata || {}),
    };

    const session = await provider.createCheckoutSession({
      amount,
      currency: booking.currency || 'BRL',
      description: `Reserva ${booking.bookingCode}`,
      customerEmail: booking.customerEmail,
      customerName: booking.customerName,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      paymentMethod: input.paymentMethod,
      items: input.items,
      metadata,
    });

    const [paymentRow] = await db
      .insert(payments)
      .values({
        enterpriseId,
        provider: providerName as 'mercadopago' | 'stripe' | 'openfinance',
        method: (input.paymentMethod || 'credit_card') as
          | 'credit_card'
          | 'debit_card'
          | 'pix'
          | 'boleto'
          | 'wallet'
          | 'bank_transfer',
        status: 'pending',
        amount: amount.toFixed(2),
        currency: booking.currency || 'BRL',
        description: `Checkout ${booking.bookingCode}`,
        externalId: session.sessionId,
        bookingId: input.bookingId,
        metadata: {
          checkoutUrl: session.url,
          sessionId: session.sessionId,
          ...metadata,
        },
      })
      .returning();

    return {
      paymentId: paymentRow.id,
      sessionId: session.sessionId,
      url: session.url,
      provider: session.provider,
      status: 'pending' as const,
    };
  }
}
