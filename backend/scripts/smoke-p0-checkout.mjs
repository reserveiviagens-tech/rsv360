import 'dotenv/config';
import { createRequire } from 'module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { signJwt } = require('../src/api/v1/auth/jwt-verify.js');
const { getJwtSecret } = require('@rsv360/shared');

const BASE = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001';
const bookingId = Number(process.env.SMOKE_BOOKING_ID || 2);

function mask(s) {
  const t = String(s || '');
  if (t.length <= 12) return '***';
  return `${t.slice(0, 6)}...${t.slice(-4)}`;
}

const staffJwt = signJwt(
  { userId: 1, email: 'smoke@test.local', name: 'Smoke Admin', role: 'admin' },
  getJwtSecret(),
  3600,
);

const tokenRes = await fetch(`${BASE}/api/admin/portal/tokens`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${staffJwt}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ bookingId: String(bookingId) }),
});
const tokenBody = await tokenRes.json().catch(() => ({}));
console.log('portal=', tokenRes.status, mask(tokenBody.token));
if (!tokenRes.ok || !tokenBody.token) {
  console.log(tokenBody);
  process.exit(1);
}

const checkoutRes = await fetch(`${BASE}/api/v1/payments/public/checkout/session`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Portal-Token': tokenBody.token,
  },
  body: JSON.stringify({
    bookingId,
    // Prefer https; http/localhost works after provider omit of auto_return.
    successUrl: process.env.SMOKE_SUCCESS_URL || 'https://www.mercadopago.com.br/',
    cancelUrl: process.env.SMOKE_CANCEL_URL || 'https://www.mercadopago.com.br/',
  }),
});
const checkoutBody = await checkoutRes.json().catch(() => ({}));
console.log(
  'checkout=',
  checkoutRes.status,
  JSON.stringify({
    paymentId: checkoutBody.paymentId,
    sessionId: checkoutBody.sessionId ? mask(checkoutBody.sessionId) : undefined,
    provider: checkoutBody.provider,
    status: checkoutBody.status,
    hasUrl: Boolean(checkoutBody.url),
    error: checkoutBody.error,
    code: checkoutBody.code,
  }),
);
if (checkoutRes.status !== 201) process.exit(2);

const sql =
  `SELECT id::text, status::text, left(coalesce(external_id,''),12), booking_id::text, amount::text ` +
  `FROM payments WHERE booking_id = ${bookingId} ORDER BY created_at DESC LIMIT 1;`;
const out = execSync(
  `docker exec rsv360-postgres psql -U rsv360 -d rsv_360_ecosystem -tAc ${JSON.stringify(sql)}`,
  { encoding: 'utf8' },
).trim();
console.log('db=', out);
const parts = out.split('|');
const ok = parts[1] === 'pending' && parts[3] === String(bookingId);
console.log('SMOKE_PASS=', ok);
process.exit(ok ? 0 : 3);
