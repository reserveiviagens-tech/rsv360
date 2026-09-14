import { PaymentProviderInterface } from './interfaces';
import { SubscriptionProviderInterface } from './interfaces';
import { PIXProviderInterface } from './interfaces';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { StripeProvider } from './providers/stripe.provider';
import { MercadoPagoSubscriptionProvider } from './providers/mercadopago-subscription.provider';
import { StripeSubscriptionProvider } from './providers/stripe-subscription.provider';
import { OpenFinancePIXProvider } from './providers/openfinance-pix.provider';

/** Aruanda B3a: services must call this provider (no silent mock). */
export function getPaymentProvider(): PaymentProviderInterface {
  const provider = process.env.PAYMENT_PROVIDER || 'mercadopago';
  switch (provider) {
    case 'stripe':
      return new StripeProvider();
    case 'mercadopago':
    default:
      return new MercadoPagoProvider();
  }
}

export function getSubscriptionProvider(): SubscriptionProviderInterface {
  const provider = process.env.SUBSCRIPTION_PROVIDER || 'mercadopago';
  switch (provider) {
    case 'stripe':
      return new StripeSubscriptionProvider();
    case 'mercadopago':
    default:
      return new MercadoPagoSubscriptionProvider();
  }
}

export function getPIXProvider(): PIXProviderInterface {
  const provider = process.env.PIX_PROVIDER || 'mercadopago';
  switch (provider) {
    case 'openfinance':
      return new OpenFinancePIXProvider();
    case 'mercadopago':
    default:
      return new MercadoPagoProvider(); // MP implements PIXProviderInterface
  }
}
