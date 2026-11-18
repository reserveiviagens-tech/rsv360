#!/usr/bin/env node
/**
 * Smoke — fluxo e-sign locações (API :3002 + página turismo opcional).
 *
 * Uso:
 *   node scripts/smoke-crm-rental-sign.mjs
 *
 * Env:
 *   SMOKE_API_URL (default http://127.0.0.1:3002)
 *   SMOKE_TURISMO_URL (default http://127.0.0.1:3005)
 *   SMOKE_BEARER | SMOKE_JWT — se omitido, faz login com credenciais de seed
 *   SEED_TEST_USER_EMAIL (default admin@rsv360.com.br)
 *   SEED_TEST_USER_PASSWORD (default dev-only-fallback-do-not-use-in-prod)
 */
const API = (process.env.SMOKE_API_URL || 'http://127.0.0.1:3002').replace(/\/$/, '');
const TURISMO = (process.env.SMOKE_TURISMO_URL || 'http://127.0.0.1:3005').replace(/\/$/, '');
const email = (process.env.SEED_TEST_USER_EMAIL || 'admin@rsv360.com.br').toLowerCase();
const password =
  process.env.SEED_TEST_USER_PASSWORD || 'dev-only-fallback-do-not-use-in-prod';

async function loginBearer() {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Login falhou HTTP ${res.status}`);
  }
  const token =
    json?.data?.access_token ??
    json?.data?.accessToken ??
    json?.access_token ??
    json?.accessToken;
  if (!token) throw new Error('Login sem accessToken na resposta');
  return token;
}

async function run() {
  const bearer = process.env.SMOKE_BEARER || process.env.SMOKE_JWT || (await loginBearer());
  const auth = { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' };

  const health = await fetch(`${API}/api/v1/rental-contracts/health`);
  if (!health.ok) throw new Error(`Health rental-contracts HTTP ${health.status}`);
  console.log('✅ GET /rental-contracts/health');

  const unitId = `smoke-unit-${Date.now()}`;
  const createRes = await fetch(`${API}/api/v1/rental-contracts/sign-request`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      unitId,
      unitName: 'Smoke Tower',
      address: '1 Test Ave',
      monthlyRent: 3200,
      startDate: '2026-11-17',
      signerEmail: 'smoke-signer@example.com',
      signerName: 'Smoke Signer',
      signerCpf: '12345678901',
      termMonths: 12,
      depositType: 'caucao',
    }),
  });
  const created = await createRes.json();
  if (!createRes.ok || !created?.data?.requestId || !created?.data?.signingToken) {
    throw new Error(`POST sign-request falhou: ${createRes.status}`);
  }
  const { requestId, signingToken } = created.data;
  console.log(`✅ POST sign-request (requestId=${requestId.slice(0, 8)}…)`);

  const publicQ = new URLSearchParams({ token: signingToken });
  const viewRes = await fetch(
    `${API}/api/v1/rental-contracts/public/sign/${encodeURIComponent(requestId)}?${publicQ}`,
  );
  const viewJson = await viewRes.json();
  if (!viewRes.ok || viewJson?.data?.status !== 'pending') {
    throw new Error(`GET public sign view falhou: ${viewRes.status}`);
  }
  console.log('✅ GET public sign (pending)');

  const pdfRes = await fetch(
    `${API}/api/v1/rental-contracts/public/sign/${encodeURIComponent(requestId)}/pdf?${publicQ}`,
  );
  if (!pdfRes.ok) throw new Error(`GET public pdf HTTP ${pdfRes.status}`);
  const pdfBuf = await pdfRes.arrayBuffer();
  if (pdfBuf.byteLength < 100) throw new Error('PDF público vazio ou inválido');
  console.log(`✅ GET public pdf (${pdfBuf.byteLength} bytes)`);

  const completeRes = await fetch(
    `${API}/api/v1/rental-contracts/public/sign/${encodeURIComponent(requestId)}/complete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: signingToken, acceptTerms: true }),
    },
  );
  const completeJson = await completeRes.json();
  if (!completeRes.ok || completeJson?.data?.status !== 'signed') {
    throw new Error(`POST public complete falhou: ${completeRes.status}`);
  }
  console.log('✅ POST public complete (signed)');

  const listRes = await fetch(
    `${API}/api/v1/rental-contracts/sign-requests?unitId=${encodeURIComponent(unitId)}`,
    { headers: { Authorization: `Bearer ${bearer}` } },
  );
  const listJson = await listRes.json();
  const item = (listJson?.data?.items || []).find((r) => r.id === requestId);
  if (!listRes.ok || !item || item.status !== 'signed') {
    throw new Error('Listagem parceiro não reflete assinatura');
  }
  console.log('✅ GET sign-requests (parceiro, signed)');

  const pageQ = new URLSearchParams({ requestId, token: signingToken });
  const pageRes = await fetch(`${TURISMO}/rentals/sign?${pageQ}`, {
    headers: { Accept: 'text/html' },
  });
  if (!pageRes.ok) {
    console.warn(`⚠️  Turismo /rentals/sign HTTP ${pageRes.status} (rebuild turismo se página antiga)`);
  } else {
    const html = await pageRes.text();
    if (!html.includes('Assinatura') && !html.includes('contrato')) {
      console.warn('⚠️  HTML da página pública não contém marcadores esperados');
    } else {
      console.log('✅ GET turismo /rentals/sign (HTML)');
    }
  }

  console.log('🟢 Smoke e-sign locações concluído.');
}

run().catch((err) => {
  console.error('❌ Smoke rental sign:', err.message);
  process.exit(1);
});