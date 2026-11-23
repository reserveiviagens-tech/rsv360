#!/usr/bin/env node
/**
 * Smoke — CRM deals com persistência Postgres (K3a + K4).
 *
 * K3a (padrão):
 *   SMOKE_API_URL=http://127.0.0.1:3002 SMOKE_BEARER=<jwt> npm run smoke:crm-deals-persistence
 *
 * K4 após restart (manual):
 *   docker compose restart backend
 *   SMOKE_DEAL_ID=<id> SMOKE_EXPECT_STAGE=offer npm run smoke:crm-deals-persistence:k4
 *
 * K4 automatizado (reinicia backend no host — Docker disponível):
 *   SMOKE_K4_RESTART=1 SMOKE_BEARER=<jwt> npm run smoke:crm-deals-persistence
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const STATE_FILE = path.join(os.tmpdir(), 'rsv360-smoke-deal-persist.json');

const API = (process.env.SMOKE_API_URL || 'http://127.0.0.1:3002').replace(/\/$/, '');
const bearer = process.env.SMOKE_BEARER || process.env.SMOKE_JWT;
const k4Verify =
  process.argv.includes('--k4-verify') ||
  process.env.SMOKE_K4_VERIFY === '1' ||
  process.env.npm_lifecycle_event === 'smoke:crm-deals-persistence:k4';

if (!bearer) {
  console.error('Defina SMOKE_BEARER ou SMOKE_JWT (token parceiro/corretor).');
  process.exit(2);
}

const headers = {
  Authorization: `Bearer ${bearer}`,
  'Content-Type': 'application/json',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(maxMs = 90_000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    try {
      const health = await fetch(`${API}/api/v1/deals/health`);
      if (health.ok) {
        console.log('✅ Backend health OK após restart');
        return;
      }
    } catch {
      /* aguardar */
    }
    await sleep(2_000);
  }
  throw new Error(`Health não respondeu em ${maxMs / 1000}s (${API})`);
}

async function fetchDealStage(dealId) {
  const listRes = await fetch(`${API}/api/v1/deals`, { headers });
  const listJson = await listRes.json();
  if (!listRes.ok) throw new Error(`GET /deals falhou: ${listRes.status}`);
  const item = (listJson.data?.items || []).find((d) => d.id === dealId);
  if (!item) throw new Error(`Deal ${dealId} ausente na listagem (postgres/restart?)`);
  return item.stage;
}

async function verifyK4(dealId, expectedStage) {
  const stage = await fetchDealStage(dealId);
  if (stage !== expectedStage) {
    throw new Error(`K4 falhou: esperado ${expectedStage}, recebido ${stage ?? '—'}`);
  }
  console.log(`✅ K4: deal ${dealId} mantém estágio ${expectedStage} após restart`);
}

function readStateFile() {
  if (!fs.existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function writeStateFile(payload) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`ℹ️  Estado K4 salvo: ${STATE_FILE}`);
}

async function runK4VerifyOnly() {
  const fromEnvId = process.env.SMOKE_DEAL_ID?.trim();
  const fromEnvStage = process.env.SMOKE_EXPECT_STAGE?.trim() || 'offer';
  const saved = readStateFile();
  const dealId = fromEnvId || saved?.dealId;
  const expectedStage = fromEnvStage || saved?.stage || 'offer';

  if (!dealId) {
    throw new Error('Defina SMOKE_DEAL_ID ou rode K3a antes (estado em %TEMP%).');
  }

  await waitForHealth();
  await verifyK4(dealId, expectedStage);
}

async function runK3a() {
  const propertyName = `Smoke Persist ${Date.now()}`;

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

  let stage = await fetchDealStage(dealId);
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

  stage = await fetchDealStage(dealId);
  if (stage !== 'offer') {
    throw new Error(`Persistência de estágio falhou: esperado offer, recebido ${stage ?? '—'}`);
  }
  console.log('✅ GET /deals reflete offer (K3 persistência de estágio).');

  writeStateFile({ dealId, stage: 'offer', api: API, savedAt: new Date().toISOString() });

  if (process.env.SMOKE_K4_RESTART === '1') {
    console.log('↻ SMOKE_K4_RESTART=1 — reiniciando backend (Docker)...');
    execSync('docker compose restart backend', { stdio: 'inherit', cwd: REPO_ROOT });
    await waitForHealth();
    await verifyK4(dealId, 'offer');
    return;
  }

  console.log('ℹ️  K4: docker compose restart backend');
  console.log('ℹ️  Depois: npm run smoke:crm-deals-persistence:k4');
  console.log(`    (ou SMOKE_DEAL_ID=${dealId} SMOKE_EXPECT_STAGE=offer npm run smoke:crm-deals-persistence:k4)`);
}

async function run() {
  if (k4Verify) {
    await runK4VerifyOnly();
    return;
  }
  await runK3a();
}

run().catch((err) => {
  console.error('❌ Smoke CRM deals persistence:', err.message);
  process.exit(1);
});