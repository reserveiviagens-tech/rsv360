/**
 * WS-04 / S6 — declared claim + cadeia claim -> req.user -> S5 (integracao). PARTE 1/2.
 * WHAT IS REAL: normalizeEnterpriseClaim + authenticateJwt/optionalJwt reais (jwt-verify
 * mockado por jest.mock) + probe S5 com DenyAll. SUBSTITUTED: assinatura JWT, DPoP,
 * lookup estatico, membership DenyAll. Sem DB, sem rede.
 */
import request from 'supertest';
import express from 'express';

const JWT_VERIFY_PATH = '../../api/v1/auth/jwt-verify';

jest.mock(
  '../../api/v1/auth/jwt-verify',
  () => {
    const actual = jest.requireActual('../../api/v1/auth/jwt-verify');
    return { ...actual, verifyAccessToken: jest.fn(actual.verifyAccessToken) };
  },
  { virtual: false },
);

import { normalizeEnterpriseClaim } from '../../../../server/modules/multi-property/context/enterprise-claim';
import { authenticateJwt, optionalJwt } from '../../../../server/middleware/auth.middleware';
import { createAuthorizedContextMiddleware } from '../../../../server/modules/multi-property/context/authorized-context.middleware';
import { createStaticEnterpriseKeyLookup } from '../../../../server/modules/multi-property/context/enterprise-key-bridge';
import { DenyAllMembershipPort } from '../../../../server/modules/multi-property/context/enterprise-membership.port';

const { verifyAccessToken } = require('../../api/v1/auth/jwt-verify') as { verifyAccessToken: jest.Mock };

function buildAuthChainApp() {
  const app = express();
  app.use(express.json());
  app.get(
    '/chain',
    authenticateJwt,
    createAuthorizedContextMiddleware({
      lookup: createStaticEnterpriseKeyLookup({ ent_1: 1, ent_42: 42 }),
      membership: new DenyAllMembershipPort(),
      mode: 'legacy',
    }),
    (req, res) => {
      res.status(200).json({
        userClaim: (req.user as { enterpriseId?: unknown } | undefined)?.enterpriseId ?? null,
        authorized: (req.authorizedEnterpriseContext as { authorizedEnterpriseId?: string } | undefined)
          ?.authorizedEnterpriseId ?? null,
        verified: (req.authorizedEnterpriseContext as { membershipVerified?: boolean } | undefined)
          ?.membershipVerified ?? null,
      });
    },
  );
  app.get('/optional', optionalJwt, (req, res) => {
    res.status(200).json({ hasUser: req.user !== undefined, claim: (req.user as { enterpriseId?: unknown } | undefined)?.enterpriseId ?? null });
  });
  return app;
}

describe('S6 — normalizeEnterpriseClaim (puro)', () => {
  it.each([['ent_1'], ['ent_42'], ['123e4567-e89b-12d3-a456-426614174000']])(
    'claim valido %p => declarado jwt_claim',
    (claim) => {
      expect(normalizeEnterpriseClaim(claim)).toEqual({ key: claim, source: 'jwt_claim' });
    },
  );
  it('claim legado number 42 => ent_42 legacy (sem fallback, sem coercao solta)', () => {
    expect(normalizeEnterpriseClaim(42)).toEqual({ key: 'ent_42', source: 'legacy' });
  });
  it.each([[null], [undefined], [''], ['foo'], [' ent_42'], ['ent_42 '], [0], [-3], [1.5], [NaN], [{}], [[]], [true]])(
    'claim ausente/invalido/adulterado (%p) => null (nunca default)',
    (bad) => {
      expect(normalizeEnterpriseClaim(bad)).toBeNull();
    },
  );
});

describe('S6 — cadeia claim -> req.user.enterpriseId -> S5 -> S4', () => {
  const app = buildAuthChainApp();
  beforeEach(() => verifyAccessToken.mockReset());

  it('claim valido => req.user carrega declarado + S5 autoriza (verified=false, nao membership)', async () => {
    verifyAccessToken.mockReturnValue({ userId: 42, email: 'a@x.y', enterpriseId: 'ent_42' });
    const res = await request(app).get('/chain').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ userClaim: 'ent_42', authorized: 'ent_42', verified: false });
  });

  it('claim ausente => req.user sem enterpriseId + S5 nega missing-claim', async () => {
    verifyAccessToken.mockReturnValue({ userId: 42, email: 'a@x.y' });
    const res = await request(app).get('/chain').set('Authorization', 'Bearer t');
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('missing-claim');
  });

  it('claim invalido/adulterado => sanitizado para undefined + S5 nega', async () => {
    verifyAccessToken.mockReturnValue({ userId: 42, email: 'a@x.y', enterpriseId: 'foo' });
    const res = await request(app).get('/chain').set('Authorization', 'Bearer t');
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('missing-claim');
  });

  it('claim legado number => normalizado ent_42 e autorizado', async () => {
    verifyAccessToken.mockReturnValue({ userId: 42, email: 'a@x.y', enterpriseId: 42 });
    const res = await request(app).get('/chain').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ userClaim: 'ent_42', authorized: 'ent_42' });
  });

  it('identidade invalida mesmo com claim valido => 401 (identidade governa)', async () => {
    verifyAccessToken.mockReturnValue({ userId: 'abc', email: 'a@x.y', enterpriseId: 'ent_42' });
    const res = await request(app).get('/chain').set('Authorization', 'Bearer t');
    expect(res.status).toBe(401);
  });

  it('claim valido para enterprise desconhecida => S5 nega unknown-enterprise', async () => {
    verifyAccessToken.mockReturnValue({ userId: 42, email: 'a@x.y', enterpriseId: 'ent_999' });
    const res = await request(app).get('/chain').set('Authorization', 'Bearer t');
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('unknown-enterprise');
  });

  it('optionalJwt sem token => sem req.user e sem autoridade (R10)', async () => {
    const res = await request(app).get('/optional');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ hasUser: false, claim: null });
  });

  it('optionalJwt com token valido => claim declarado, sem prova de membership', async () => {
    verifyAccessToken.mockReturnValue({ userId: 7, email: 'b@x.y', enterpriseId: 'ent_1' });
    const res = await request(app).get('/optional').set('Authorization', 'Bearer t2');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ hasUser: true, claim: 'ent_1' });
  });
});

