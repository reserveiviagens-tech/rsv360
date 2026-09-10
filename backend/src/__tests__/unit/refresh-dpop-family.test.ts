/**
 * PR-10c-b — refresh family DPoP bind (device_info.dpop_jkt, no migration).
 */
import nodeCrypto from 'crypto';

const dpop = require('../../api/v1/auth/dpop.service');
const refreshSvc = require('../../api/v1/auth/refresh-token.service');
const { signJwt, verifyAccessToken } = require('../../api/v1/auth/jwt-verify');
const { getJwtSecret, getJwtRefreshSecret } = require('@rsv360/shared');

function b64urlJson(obj: Record<string, unknown>): string {
  return dpop.base64UrlEncode(Buffer.from(JSON.stringify(obj)));
}

function mintProof(args: {
  method: string;
  htu: string;
  privateKey: nodeCrypto.KeyObject;
  publicJwk: { kty: string; crv: string; x?: string; y?: string };
}): string {
  const header = b64urlJson({ typ: 'dpop+jwt', alg: 'ES256', jwk: args.publicJwk });
  const payload = b64urlJson({
    jti: nodeCrypto.randomUUID(),
    htm: args.method.toUpperCase(),
    htu: args.htu,
    iat: Math.floor(Date.now() / 1000),
  });
  const signingInput = `${header}.${payload}`;
  const signature = nodeCrypto.sign('SHA256', Buffer.from(signingInput, 'utf8'), {
    key: args.privateKey,
    dsaEncoding: 'ieee-p1363',
  });
  return `${signingInput}.${dpop.base64UrlEncode(signature)}`;
}

function generateEcKeyPair() {
  const { privateKey, publicKey } = nodeCrypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' }) as { x?: string; y?: string };
  return {
    privateKey,
    publicJwk: { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y },
  };
}

describe('refresh family DPoP bind (PR-10c-b)', () => {
  const originalQuery = refreshSvc.queryDatabase;
  const originalEnv = process.env.DATABASE_URL;

  beforeEach(() => {
    dpop.clearDpopJtiCacheForTests();
    // PR-10c-infra (#221): token-endpoint DPoP proofs require a JTI store.
    // Mirror dpop.service.test.ts so family bind tests do not depend on Redis.
    const consumed = new Set<string>();
    dpop.setDpopJtiStoreForTests({
      async consume(jti: string) {
        if (consumed.has(jti)) return false;
        consumed.add(jti);
        return true;
      },
    });
    delete process.env.AUTH_DPOP_ENABLED;
    process.env.DATABASE_URL = 'postgres://test';
  });

  afterEach(() => {
    refreshSvc.queryDatabase = originalQuery;
    dpop.clearDpopJtiCacheForTests();
    if (originalEnv === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalEnv;
  });

  it('legacy family without jkt rotates without DPoP', async () => {
    const refreshSecret = getJwtRefreshSecret();
    const family = 'fam-legacy';
    const refreshJwt = signJwt(
      { userId: 7, tokenFamily: family, type: 'refresh' },
      refreshSecret,
      3600,
    );

    const calls: string[] = [];
    refreshSvc.queryDatabase = async (sql: string) => {
      calls.push(sql);
      if (sql.includes('SELECT * FROM refresh_tokens')) {
        return [
          {
            id: 1,
            user_id: 7,
            token_family: family,
            device_info: { browser: 'legacy' },
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          },
        ];
      }
      if (sql.includes('SELECT * FROM users')) {
        return [{ id: 7, email: 'u@x.com', role: 'user', status: 'active' }];
      }
      if (sql.includes('UPDATE refresh_tokens') && sql.includes('Rotação')) {
        return [];
      }
      if (sql.includes('INSERT INTO refresh_tokens')) {
        return [];
      }
      return [];
    };

    const result = await refreshSvc.verifyAndRotateRefreshToken(
      refreshJwt,
      '127.0.0.1',
      'jest',
      {
        method: 'POST',
        get: () => undefined,
        headers: {},
        protocol: 'http',
        originalUrl: '/api/v1/auth/refresh',
      },
    );

    expect(result).not.toBeNull();
    expect(result.newAccessToken).toBeTruthy();
    const accessPayload = verifyAccessToken(result.newAccessToken, getJwtSecret());
    expect(accessPayload?.cnf).toBeUndefined();
    expect(calls.some((s) => s.includes('INSERT INTO refresh_tokens'))).toBe(true);
  });

  it('bound family with matching DPoP rotates and keeps cnf.jkt', async () => {
    const { privateKey, publicJwk } = generateEcKeyPair();
    const jkt = dpop.computeJwkThumbprintSync(publicJwk);
    const refreshSecret = getJwtRefreshSecret();
    const family = 'fam-bound';
    const refreshJwt = signJwt(
      { userId: 8, tokenFamily: family, type: 'refresh' },
      refreshSecret,
      3600,
    );
    const proof = mintProof({
      method: 'POST',
      htu: 'http://localhost:3002/api/v1/auth/refresh',
      privateKey,
      publicJwk,
    });

    let insertedDevice: string | null = null;
    refreshSvc.queryDatabase = async (sql: string, params: unknown[] = []) => {
      if (sql.includes('SELECT * FROM refresh_tokens')) {
        return [
          {
            id: 2,
            user_id: 8,
            token_family: family,
            device_info: { [dpop.DPOP_JKT_DEVICE_KEY]: jkt },
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          },
        ];
      }
      if (sql.includes('SELECT * FROM users')) {
        return [{ id: 8, email: 'b@x.com', role: 'user', status: 'active' }];
      }
      if (sql.includes('INSERT INTO refresh_tokens')) {
        insertedDevice = params[3] as string;
        return [];
      }
      return [];
    };

    const req = {
      method: 'POST',
      protocol: 'http',
      originalUrl: '/api/v1/auth/refresh',
      get(name: string) {
        if (name === 'host') return 'localhost:3002';
        if (name === 'dpop') return proof;
        return undefined;
      },
      headers: {},
    };

    const result = await refreshSvc.verifyAndRotateRefreshToken(
      refreshJwt,
      '127.0.0.1',
      'jest',
      req,
    );
    expect(result).not.toBeNull();
    expect(verifyAccessToken(result.newAccessToken, getJwtSecret())?.cnf?.jkt).toBe(jkt);
    expect(JSON.parse(String(insertedDevice)).dpop_jkt).toBe(jkt);
  });

  it('bound family with wrong DPoP jkt revokes family and denies', async () => {
    const victim = generateEcKeyPair();
    const attacker = generateEcKeyPair();
    const boundJkt = dpop.computeJwkThumbprintSync(victim.publicJwk);
    const refreshSecret = getJwtRefreshSecret();
    const family = 'fam-attack';
    const refreshJwt = signJwt(
      { userId: 9, tokenFamily: family, type: 'refresh' },
      refreshSecret,
      3600,
    );
    const badProof = mintProof({
      method: 'POST',
      htu: 'http://localhost:3002/api/v1/auth/refresh',
      privateKey: attacker.privateKey,
      publicJwk: attacker.publicJwk,
    });

    let revoked = false;
    refreshSvc.queryDatabase = async (sql: string) => {
      if (sql.includes('SELECT * FROM refresh_tokens')) {
        return [
          {
            id: 3,
            user_id: 9,
            token_family: family,
            device_info: { dpop_jkt: boundJkt },
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          },
        ];
      }
      if (sql.includes('SELECT * FROM users')) {
        return [{ id: 9, email: 'a@x.com', role: 'user', status: 'active' }];
      }
      if (sql.includes('UPDATE refresh_tokens') && sql.includes('token_family = $2')) {
        revoked = true;
        return [];
      }
      return [];
    };

    const result = await refreshSvc.verifyAndRotateRefreshToken(
      refreshJwt,
      '127.0.0.1',
      'jest',
      {
        method: 'POST',
        protocol: 'http',
        originalUrl: '/api/v1/auth/refresh',
        get(name: string) {
          if (name === 'host') return 'localhost:3002';
          if (name === 'dpop') return badProof;
          return undefined;
        },
        headers: {},
      },
    );

    expect(result).toBeNull();
    expect(revoked).toBe(true);
  });
});
