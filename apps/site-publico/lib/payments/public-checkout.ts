/**
 * B2C public checkout against RSV360 backend (P0 payments).
 * Requires guest portal token ownership of bookingId — no staff JWT.
 */

export type PublicCheckoutSessionInput = {
  bookingId: number;
  portalToken: string;
  successUrl: string;
  cancelUrl: string;
  paymentMethod?: string;
};

export type PublicCheckoutSessionResult = {
  paymentId: string;
  sessionId: string;
  url: string;
  provider: string;
  status: 'pending';
};

function backendBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    'http://127.0.0.1:3001'
  ).replace(/\/$/, '');
}

export async function createPublicCheckoutSession(
  input: PublicCheckoutSessionInput,
): Promise<PublicCheckoutSessionResult> {
  const res = await fetch(`${backendBaseUrl()}/api/v1/payments/public/checkout/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Portal-Token': input.portalToken,
    },
    body: JSON.stringify({
      bookingId: input.bookingId,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      paymentMethod: input.paymentMethod,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as Partial<PublicCheckoutSessionResult> & {
    error?: string;
    code?: string;
  };

  if (!res.ok) {
    throw new Error(body.error || `Public checkout failed (${res.status})`);
  }

  if (!body.paymentId || !body.sessionId || !body.url) {
    throw new Error('Public checkout response incomplete');
  }

  return {
    paymentId: body.paymentId,
    sessionId: body.sessionId,
    url: body.url,
    provider: body.provider || 'unknown',
    status: 'pending',
  };
}
