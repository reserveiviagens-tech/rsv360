import crypto from 'crypto';
import { MercadoPagoProvider } from '../../../server/modules/payments/providers/mercadopago.provider';
import {
  buildMpWebhookManifest,
  normalizeMpDataId,
} from '../../../server/modules/payments/lib/mp-webhook-signature';

const SECRET = 'provider-webhook-secret';

describe('MercadoPagoProvider.verifyWebhookSignature', () => {
  const prevSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = SECRET;
  });

  afterAll(() => {
    if (prevSecret === undefined) delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    else process.env.MERCADO_PAGO_WEBHOOK_SECRET = prevSecret;
  });

  it('returns true for valid HMAC', () => {
    const dataId = normalizeMpDataId('12345')!;
    const ts = Date.now();
    const manifest = buildMpWebhookManifest({ dataId, ts: String(ts) });
    const v1 = crypto.createHmac('sha256', SECRET).update(manifest).digest('hex');
    const payload = JSON.stringify({ data: { id: dataId } });

    const provider = new MercadoPagoProvider('test-token');
    expect(provider.verifyWebhookSignature(payload, `ts=${ts},v1=${v1}`)).toBe(true);
  });

  it('returns false for invalid HMAC (fail-closed)', () => {
    const payload = JSON.stringify({ data: { id: '999' } });
    const provider = new MercadoPagoProvider('test-token');
    expect(
      provider.verifyWebhookSignature(payload, `ts=${Date.now()},v1=${'f'.repeat(64)}`),
    ).toBe(false);
  });
});
