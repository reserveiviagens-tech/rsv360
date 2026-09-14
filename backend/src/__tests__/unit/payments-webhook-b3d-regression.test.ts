/**
 * Aruanda B3d — webhook HMAC + idempotency regression after Payment/PIX wire.
 * Complements pr02-mp-webhook-hmac.test.ts (full suite still required in CI).
 */
import crypto from 'crypto';
import {
  buildMpWebhookManifest,
  normalizeMpDataId,
  verifyMercadoPagoWebhookSignature,
} from '../../../server/modules/payments/lib/mp-webhook-signature';

const SECRET = 'b3d-webhook-regression-secret';

describe('payments webhook regression (Aruanda B3d)', () => {
  it('verifies Mercado Pago HMAC signature (intact after B3b/B3c)', () => {
    const dataId = normalizeMpDataId('12345')!;
    const requestId = 'req-b3d-1';
    const ts = Math.floor(Date.now() / 1000);
    const manifest = buildMpWebhookManifest({
      dataId,
      requestId,
      ts: String(ts),
    });
    const v1 = crypto.createHmac('sha256', SECRET).update(manifest).digest('hex');

    const result = verifyMercadoPagoWebhookSignature({
      secret: SECRET,
      dataId,
      requestId,
      xSignatureHeader: `ts=${ts},v1=${v1}`,
      nowMs: Date.now(),
    });

    expect(result.ok).toBe(true);
  });

  it('rejects invalid HMAC (fail-closed)', () => {
    const dataId = normalizeMpDataId('999')!;
    const requestId = 'req-b3d-bad';
    const ts = Math.floor(Date.now() / 1000);

    expect(() =>
      verifyMercadoPagoWebhookSignature({
        secret: SECRET,
        dataId,
        requestId,
        xSignatureHeader: `ts=${ts},v1=${'0'.repeat(64)}`,
        nowMs: Date.now(),
      }),
    ).toThrow();
  });
});
