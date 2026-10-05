/**
 * WS-04 / S5 — probe HTTP do contexto autorizado (integracao). PARTE 1/2.
 * WHAT IS REAL: HTTP -> extract -> S4 resolver -> authorizedEnterpriseContext -> probe.
 * SUBSTITUTED: identidade via header X-Test-User (+ claim X-Test-Claim); lookup estatico
 * + DenyAll (fakes). Sem DB, sem JWT real, sem legado enterprise-context.js.
 */
import request from 'supertest';
import express from 'express';
import { createAuthorizedContextMiddleware } from '../../../../server/modules/multi-property/context/authorized-context.middleware';
import { createStaticEnterpriseKeyLookup } from '../../../../server/modules/multi-property/context/enterprise-key-bridge';
import { DenyAllMembershipPort } from '../../../../server/modules/multi-property/context/enterprise-membership.port';

const lookup = () => createStaticEnterpriseKeyLookup({ ent_1: 1, ent_42: 42 });
const denyAll = () => new DenyAllMembershipPort();

function buildProbeApp(mode: 'legacy' | 'enforce') {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const uid = req.header('x-test-user');
    const claim = req.header('x-test-claim');
    if (uid !== undefined) {
      (req as unknown as { user: { id: unknown; enterpriseId?: unknown } }).user = {
        id: Number(uid),
        ...(claim !== undefined ? { enterpriseId: claim } : {}),
      };
    }
    next();
  });
  app.use(
    '/probe',
    createAuthorizedContextMiddleware({ lookup: lookup(), membership: denyAll(), mode }),
    (req, res) => {
      res.status(200).json({
        authorized: (req.authorizedEnterpriseContext as { authorizedEnterpriseId?: string } | undefined)
          ?.authorizedEnterpriseId ?? null,
        internal: (req.authorizedEnterpriseContext as { internalEnterpriseId?: number | null } | undefined)
          ?.internalEnterpriseId ?? null,
        verified: (req.authorizedEnterpriseContext as { membershipVerified?: boolean } | undefined)
          ?.membershipVerified ?? null,
        requested: (req.requestedEnterpriseContext as { requestedEnterpriseId?: string | null } | undefined)
          ?.requestedEnterpriseId ?? null,
      });
    },
  );
  return app;
}

describe('S5 probe — parte 1: denies + happy path + requested por modo', () => {
  const legacy = buildProbeApp('legacy');
  const enforce = buildProbeApp('enforce');

  it('sem identidade => 401 (nao chega ao resolver)', async () => {
    const res = await request(legacy).get('/probe');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: 'enterprise_context_denied', reason: 'no-identity' });
  });

  it('claim ausente => 403 missing-claim', async () => {
    const res = await request(legacy).get('/probe').set('X-Test-User', '42');
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('missing-claim');
  });

  it('claim invalido => 403 malformed-claim', async () => {
    const res = await request(legacy).get('/probe').set('X-Test-User', '42').set('X-Test-Claim', 'foo');
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('malformed-claim');
  });

  it('enterprise desconhecida => 403 unknown-enterprise', async () => {
    const res = await request(legacy).get('/probe').set('X-Test-User', '42').set('X-Test-Claim', 'ent_999');
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('unknown-enterprise');
  });

  it('contexto valido => authorized + verified=false (DenyAll)', async () => {
    const res = await request(legacy).get('/probe').set('X-Test-User', '42').set('X-Test-Claim', 'ent_42');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ authorized: 'ent_42', internal: 42, verified: false, requested: null });
  });

  it('requested conflitante (legacy) => claim governa', async () => {
    const res = await request(legacy)
      .get('/probe?enterpriseId=ent_1')
      .set('X-Test-User', '42')
      .set('X-Test-Claim', 'ent_42');
    expect(res.status).toBe(200);
    expect(res.body.authorized).toBe('ent_42');
    expect(res.body.requested).toBe('ent_1');
  });

  it('requested conflitante (enforce) => 403 requested-mismatch', async () => {
    const res = await request(enforce)
      .get('/probe?enterpriseId=ent_1')
      .set('X-Test-User', '42')
      .set('X-Test-Claim', 'ent_42');
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('requested-mismatch');
  });
});

describe('S5 probe — parte 2: spoof nunca vira autoridade + cross-enterprise', () => {
  const legacy = buildProbeApp('legacy');
  const enforce = buildProbeApp('enforce');

  it('spoof via query nao promove: claim manda, query e so intencao (enforce)', async () => {
    const ok = await request(enforce)
      .get('/probe?enterpriseId=ent_42')
      .set('X-Test-User', '42')
      .set('X-Test-Claim', 'ent_42');
    expect(ok.status).toBe(200);
    expect(ok.body.authorized).toBe('ent_42');
    const spoof = await request(enforce)
      .get('/probe?enterpriseId=ent_1')
      .set('X-Test-User', '42')
      .set('X-Test-Claim', 'ent_42');
    expect(spoof.status).toBe(403);
  });

  it('spoof via header X-Enterprise-Id => 403 em enforce', async () => {
    const res = await request(enforce)
      .get('/probe')
      .set('X-Test-User', '42')
      .set('X-Test-Claim', 'ent_42')
      .set('X-Enterprise-Id', 'ent_1');
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('requested-mismatch');
  });

  it('spoof via body enterpriseId e ignorado (nunca carrier)', async () => {
    const res = await request(legacy)
      .post('/probe')
      .set('X-Test-User', '42')
      .set('X-Test-Claim', 'ent_42')
      .send({ enterpriseId: 'ent_1' });
    expect(res.status).toBe(200);
    expect(res.body.authorized).toBe('ent_42');
    expect(res.body.requested).toBeNull();
  });

  it('cross-enterprise: claim ent_1 nao autoriza ent_42 (enforce)', async () => {
    const res = await request(enforce)
      .get('/probe')
      .set('X-Test-User', '7')
      .set('X-Test-Claim', 'ent_1')
      .set('X-Enterprise-Id', 'ent_42');
    expect(res.status).toBe(403);
  });
});


