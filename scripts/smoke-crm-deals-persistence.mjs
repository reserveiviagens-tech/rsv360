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
  const readStage = () => {
    const item = (listJson.data?.items || []).find((d) => d.id === dealId);
    return item?.stage;
  };

  let stage = readStage();
  if (stage !== 'viewing') {
    throw new Error(`Estágio inicial esperado viewing, recebido: ${stage ?? '—'}`);
  }
  console.log('✅ GET /deals contém o deal criado (viewing).');

  const patchRes = await fetch(`${API}/api/v1/deals/${encodeURIComponent(dealId)}/stage`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ stage: 'offer' }),
  });
  const patchJson = await patchRes.json();
  if (!patchRes.ok || patchJson?.data?.stage !== 'offer') {
    throw new Error(`PATCH stage falhou: ${patchRes.status} ${JSON.stringify(patchJson)}`);
  }
  console.log('✅ PATCH stage → offer');

  const list2Res = await fetch(`${API}/api/v1/deals`, { headers });
  const list2Json = await list2Res.json();
  if (!list2Res.ok) throw new Error(`GET /deals (2) falhou: ${list2Res.status}`);
  const stageAfter = (list2Json.data?.items || []).find((d) => d.id === dealId)?.stage;
  if (stageAfter !== 'offer') {
    throw new Error(`Persistência de estágio falhou: esperado offer, recebido ${stageAfter ?? '—'}`);
  }
  console.log('✅ GET /deals reflete offer (K3 persistência de estágio).');
  console.log('ℹ️  Restart: reinicie o backend e repita GET para validar sobrevivência a restart.');
  console.log(`   curl -s -H "Authorization: Bearer $SMOKE_BEARER" ${API}/api/v1/deals | findstr ${dealId}`);
}

run().catch((err) => {
  console.error('❌ Smoke CRM deals persistence:', err.message);
  process.exit(1);
});