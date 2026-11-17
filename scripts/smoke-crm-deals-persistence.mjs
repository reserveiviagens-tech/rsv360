#!/usr/bin/env node
/**
 * Smoke — CRM deals com persistência Postgres.
 * Uso:
 *   npm run migrate
 *   SMOKE_API_URL=http://127.0.0.1:3002 SMOKE_BEARER=<jwt> node scripts/smoke-crm-deals-persistence.mjs
 */
const API = (process.env.SMOKE_API_URL || 'http://127.0.0.1:3002').replace(/\/$/, '');
const bearer = process.env.SMOKE_BEARER || process.env.SMOKE_JWT;

if (!bearer) {
  console.error('Defina SMOKE_BEARER ou SMOKE_JWT (token parceiro/corretor).');
  process.exit(2);
}

const headers = {
  Authorization: `Bearer ${bearer}`,
  'Content-Type': 'application/json',
};

const propertyName = `Smoke Persist ${Date.now()}`;

async function run() {
  const health = await fetch(`${API}/api/v1/deals/health`);
  if (!health.ok) throw new Error(`Health falhou HTTP ${health.status}`);

  const createdRes = await fetch(`${API}/api/v1/deals`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      propertyName,
      price: 1_600_000,
      stage: 'viewing',
      location: 'Smoke Test',
    }),
  });
  const createdJson = await createdRes.json();
  if (!createdRes.ok || !createdJson?.data?.id) {
    throw new Error(`POST /deals falhou: ${createdRes.status} ${JSON.stringify(createdJson)}`);
  }
  const dealId = createdJson.data.id;
  console.log(`✅ POST deal criado: ${dealId}`);

  const listRes = await fetch(`${API}/api/v1/deals`, { headers });
  const listJson = await listRes.json();
  if (!listRes.ok) throw new Error(`GET /deals falhou: ${listRes.status}`);
  const found = (listJson.data?.items || []).some((d) => d.id === dealId);
  if (!found) throw new Error('Deal não encontrado na listagem imediata');

  console.log('✅ GET /deals contém o deal criado (persistência ativa nesta instância).');
  console.log('ℹ️  Para validar sobrevivência a restart: reinicie o container backend e rode GET novamente.');
  console.log(`   curl -s -H "Authorization: Bearer $SMOKE_BEARER" ${API}/api/v1/deals | findstr ${dealId}`);
}

run().catch((err) => {
  console.error('❌ Smoke CRM deals persistence:', err.message);
  process.exit(1);
});