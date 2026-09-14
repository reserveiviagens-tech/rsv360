/**
 * Canonical payment env resolution (backend).
 *
 * Access token: prefer MP_ACCESS_TOKEN (.env.example). MERCADOPAGO_ACCESS_TOKEN is deprecated fallback.
 * Webhook HMAC: MERCADO_PAGO_WEBHOOK_SECRET (aligned with site-publico).
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveMpAccessToken(env: NodeJS.ProcessEnv = process.env): string {
  return String(
    env.MP_ACCESS_TOKEN || env.MERCADOPAGO_ACCESS_TOKEN || '',
  ).trim();
}

export function resolveMpWebhookSecret(env: NodeJS.ProcessEnv = process.env): string {
  return String(env.MERCADO_PAGO_WEBHOOK_SECRET || '').trim();
}

export function resolveStripeSecretKey(env: NodeJS.ProcessEnv = process.env): string {
  return String(env.STRIPE_SECRET_KEY || '').trim();
}

export function resolveStripeWebhookSecret(env: NodeJS.ProcessEnv = process.env): string {
  return String(env.STRIPE_WEBHOOK_SECRET || '').trim();
}

export function resolvePaymentProvider(env: NodeJS.ProcessEnv = process.env): string {
  return String(env.PAYMENT_PROVIDER || 'mercadopago').toLowerCase();
}

/** Default tenant for B2C checkout when booking has no enterprise uuid in metadata. */
export function resolveDefaultEnterpriseId(env: NodeJS.ProcessEnv = process.env): string {
  const configured = String(env.PAYMENT_DEFAULT_ENTERPRISE_ID || '').trim();
  if (configured && UUID_RE.test(configured)) return configured;
  return '00000000-0000-0000-0000-000000000001';
}

export function resolveEnterpriseId(
  candidate: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const value = String(candidate || '').trim();
  if (value && UUID_RE.test(value)) return value;
  return resolveDefaultEnterpriseId(env);
}
