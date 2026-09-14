/**
 * Aruanda B3d — webhook HMAC regression after Payment/PIX wire.
 * Complements pr02-mp-webhook-hmac.test.ts (full suite still required in CI).
 */
import crypto from 'crypto';
import {
  buildMpWebhookManifest,
  normalizeMpDataId,
  verifyMercadoPagoWebhookSignature,
  MpWebhookAuthError,
} from '../../../server/modules/payments/lib/mp-webhook-signature';

const SECRET = 'b3dwebhookregressionsecret';

describe('payments webhook regression (Aruanda B3d)', () => {
  it('verifies Mercado Pago HMAC signature (intact after B3b/B3c)', () => {
    const dataId = normalizeMpDataId('12345')!;
    const requestId = 'reqb3d1';
    const ts = Date.now();
    const manifest = buildMpWebhookManifest({
      dataId,
      requestId,
      ts: String(ts),
    });
    const v1 = crypto.createHmac('sha256', SECRET).update(manifest).digest('hex');

    expect(() =>
      verifyMercadoPagoWebhookSignature({
        secret: SECRET,
        dataIdFromQuery: dataId,
        xRequestId: requestId,
        xSignature: `ts=${ts},v1=${v1}`,
        nowMs: Date.now(),
      }),
    ).not.toThrow();
  });

  it('rejects invalid HMAC (fail-closed)', () => {
    const dataId = normalizeMpDataId('999')!;
    const requestId = 'reqb3dbad';
    const ts = Date.now();

    expect(() =>
      verifyMercadoPagoWebhookSignature({
        secret: SECRET,
        dataIdFromQuery: dataId,
        xRequestId: requestId,
        xSignature: `ts=${ts},v1=${'0'.repeat(64)}`,
        nowMs: Date.now(),
      }),
    ).toThrow(MpWebhookAuthError);
  });
});
