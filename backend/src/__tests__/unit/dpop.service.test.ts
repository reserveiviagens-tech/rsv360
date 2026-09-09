/**
 * PR-10c-a1 — DPoP emission + validation (flag OFF default).
 */
import nodeCrypto from 'crypto';
const {
  signAccessTokenBound,
  enforceDpopIfEnabled,
  verifyDpopProofForTokenEndpoint,
  clearDpopJtiCacheForTests,
  setDpopJtiStoreForTests,
  createRedisJtiStore,
  accessTokenHash,
  computeJwkThumbprintSync,
  base64UrlEncode,
  buildRequestHtu,
  DPOP_SKEW_SECONDS,
} = require('../../api/v1/auth/dpop.service');
const { verifyAccessToken, signJwt } = require('../../api/v1/auth/jwt-verify');
const { trustedProxyAllowlist } = require('../../../app');

function b64urlJson(obj: Record<string, unknown>): string {
  return base64UrlEncode(Buffer.from(JSON.stringify(obj)));
}

type MintProofArgs = {
  method: string;
  htu: string;
  privateKey: nodeCrypto.KeyObject;
  publicJwk: { kty: string; crv: string; x?: string; y?: string };
  jti?: string;
  iat?: number;
  ath?: string;
};

/** Build a signed ES256 DPoP proof (ieee-p1363) for tests. */
function mintTestDpopProof(args: MintProofArgs): string {
  const header = b64urlJson({ typ: 'dpop+jwt', alg: 'ES256', jwk: args.publicJwk });
  const payload = b64urlJson({
    jti: args.jti || nodeCrypto.randomUUID(),
    htm: args.method.toUpperCase(),
    htu: args.htu,
    iat: args.iat ?? Math.floor(Date.now() / 1000),
    ...(args.ath ? { ath: args.ath } : {}),
  });
  const signingInput = `${header}.${payload}`;
  const signature = nodeCrypto.sign('SHA256', Buffer.from(signingInput, 'utf8'), {
    key: args.privateKey,
    dsaEncoding: 'ieee-p1363',
  });
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

function generateEcKeyPair() {
  const { privateKey, publicKey } = nodeCrypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' }) as { x?: string; y?: string };
  return {
    privateKey,
    publicJwk: { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y },
  };
}

describe('dpop.service (PR-10c-a1)', () => {
  const secret = 'ci_jwt_secret_minimum_32_chars_xx';

  beforeEach(() => {
    clearDpopJtiCacheForTests();
    const consumed = new Set<string>();
    setDpopJtiStoreForTests({
      async consume(jti: string) {
        if (consumed.has(jti)) return false;
        consumed.add(jti);
        return true;
      },
    });
    delete process.env.AUTH_DPOP_ENABLED;
  });

  afterEach(() => {
    delete process.env.AUTH_DPOP_ENABLED;
    clearDpopJtiCacheForTests();
  });

  it('emits access without cnf when no DPoP proof', async () => {
    const token = await signAccessTokenBound(
      { userId: 1, email: 'a@b.c', role: 'user' },
      secret,
      900,
      {
        method: 'POST',
        get: () => undefined,
        headers: {},
        protocol: 'http',
        originalUrl: '/api/v1/auth/login',
      },
    );
    const payload = verifyAccessToken(token, secret);
    expect(payload?.cnf).toBeUndefined();
  });

  it('emits cnf.jkt when valid DPoP proof is present', async () => {
    const { privateKey, publicJwk } = generateEcKeyPair();
    const jkt = computeJwkThumbprintSync(publicJwk);
    const req = {
      method: 'POST',
      protocol: 'http',
      originalUrl: '/api/v1/auth/login',
      get(name: string) {
        if (name === 'host') return 'localhost:3002';
        if (name === 'dpop') {
          return mintTestDpopProof({
            method: 'POST',
            htu: 'http://localhost:3002/api/v1/auth/login',
            privateKey,
            publicJwk,
          });
        }
        return undefined;
      },
      headers: {},
    };
    const token = await signAccessTokenBound(
      { userId: 1, email: 'a@b.c', role: 'user' },
      secret,
      900,
      req,
    );
    const payload = verifyAccessToken(token, secret);
    expect(payload?.cnf?.jkt).toBe(jkt);
  });

  it('flag OFF allows access with cnf without DPoP header', async () => {
    const withCnf = signJwt(
      { userId: 1, email: 'a@b.c', role: 'user', cnf: { jkt: 'deadbeef' } },
      secret,
      900,
    );
    const payload = verifyAccessToken(withCnf, secret);
    const req = {
      method: 'GET',
      get: () => undefined,
      headers: {},
      protocol: 'http',
      originalUrl: '/api/v1/x',
    };
    expect((await enforceDpopIfEnabled(req, withCnf, payload)).ok).toBe(true);
  });

  it('flag ON rejects cnf-bound token without DPoP', async () => {
    process.env.AUTH_DPOP_ENABLED = 'true';
    const withCnf = signJwt(
      { userId: 1, email: 'a@b.c', role: 'user', cnf: { jkt: 'deadbeef' } },
      secret,
      900,
    );
    const payload = verifyAccessToken(withCnf, secret);
    const req = {
      method: 'GET',
      get: () => undefined,
      headers: {},
      protocol: 'http',
      originalUrl: '/api/v1/x',
    };
    expect((await enforceDpopIfEnabled(req, withCnf, payload)).ok).toBe(false);
  });

  it('flag ON accepts matching DPoP proof with ath', async () => {
    process.env.AUTH_DPOP_ENABLED = 'true';
    const { privateKey, publicJwk } = generateEcKeyPair();
    const jkt = computeJwkThumbprintSync(publicJwk);
    const access = signJwt(
      { userId: 1, email: 'a@b.c', role: 'user', cnf: { jkt } },
      secret,
      900,
    );
    const htu = 'http://localhost:3002/api/v1/x';
    const proof = mintTestDpopProof({
      method: 'GET',
      htu,
      privateKey,
      publicJwk,
      ath: accessTokenHash(access),
    });
    const req = {
      method: 'GET',
      protocol: 'http',
      originalUrl: '/api/v1/x',
      get(name: string) {
        if (name === 'host') return 'localhost:3002';
        if (name === 'dpop') return proof;
        return undefined;
      },
      headers: {},
    };
    const payload = verifyAccessToken(access, secret);
    expect((await enforceDpopIfEnabled(req, access, payload)).ok).toBe(true);
  });

  it('rejects replayed jti', async () => {
    const { privateKey, publicJwk } = generateEcKeyPair();
    const jti = nodeCrypto.randomUUID();
    const proof = mintTestDpopProof({
      method: 'POST',
      htu: 'http://localhost:3002/api/v1/auth/refresh',
      privateKey,
      publicJwk,
      jti,
    });
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
    expect((await verifyDpopProofForTokenEndpoint(req)).ok).toBe(true);
    expect((await verifyDpopProofForTokenEndpoint(req)).ok).toBe(false);
  });

  it('rejects replay across two instances sharing the Redis store', async () => {
    const keys = new Set<string>();
    const redis = {
      async set(key: string, value: string, px: string, ttl: number, nx: string) {
        expect([value, px, ttl, nx]).toEqual(['1', 'PX', 90_000, 'NX']);
        if (keys.has(key)) return null;
        keys.add(key);
        return 'OK';
      },
    };
    const instanceA = createRedisJtiStore(redis);
    const instanceB = createRedisJtiStore(redis);

    await expect(instanceA.consume('shared-jti')).resolves.toBe(true);
    await expect(instanceB.consume('shared-jti')).resolves.toBe(false);
  });

  it('rejects iat outside skew window', async () => {
    const { privateKey, publicJwk } = generateEcKeyPair();
    const proof = mintTestDpopProof({
      method: 'POST',
      htu: 'http://localhost:3002/api/v1/auth/login',
      privateKey,
      publicJwk,
      iat: Math.floor(Date.now() / 1000) - (DPOP_SKEW_SECONDS + 30),
    });
    const req = {
      method: 'POST',
      protocol: 'http',
      originalUrl: '/api/v1/auth/login',
      get(name: string) {
        if (name === 'host') return 'localhost:3002';
        if (name === 'dpop') return proof;
        return undefined;
      },
      headers: {},
    };
    expect((await verifyDpopProofForTokenEndpoint(req)).error).toBe('dpop_iat_skew');
  });

  it('rejects thumbprint mismatch on resource', async () => {
    process.env.AUTH_DPOP_ENABLED = 'true';
    const { privateKey, publicJwk } = generateEcKeyPair();
    const access = signJwt(
      { userId: 1, role: 'user', cnf: { jkt: 'not-the-real-jkt' } },
      secret,
      900,
    );
    const proof = mintTestDpopProof({
      method: 'GET',
      htu: 'http://localhost:3002/api/v1/x',
      privateKey,
      publicJwk,
      ath: accessTokenHash(access),
    });
    const req = {
      method: 'GET',
      protocol: 'http',
      originalUrl: '/api/v1/x',
      get(name: string) {
        if (name === 'host') return 'localhost:3002';
        if (name === 'dpop') return proof;
        return undefined;
      },
      headers: {},
    };
    const payload = verifyAccessToken(access, secret);
    expect((await enforceDpopIfEnabled(req, access, payload)).error).toBe('dpop_jkt_mismatch');
  });

  it('buildRequestHtu strips query', () => {
    const req = {
      protocol: 'https',
      originalUrl: '/api/v1/x?a=1',
      get: (n: string) => (n === 'host' ? 'api.example' : undefined),
    };
    expect(buildRequestHtu(req)).toBe('https://api.example/api/v1/x');
  });

  it('buildRequestHtu ignores forged forwarded proto and host headers', () => {
    const req = {
      protocol: 'https',
      originalUrl: '/api/v1/x',
      get(name: string) {
        if (name === 'host') return 'api.reserveiviagens.com.br';
        if (name === 'x-forwarded-proto') return 'http';
        if (name === 'x-forwarded-host') return 'attacker.example';
        return undefined;
      },
    };
    expect(buildRequestHtu(req)).toBe('https://api.reserveiviagens.com.br/api/v1/x');
  });

  it('parses an explicit trust proxy allowlist and defaults to loopback', () => {
    expect(trustedProxyAllowlist({})).toEqual(['loopback']);
    expect(
      trustedProxyAllowlist({
        TRUST_PROXY: 'loopback,::1,192.168.0.0/24',
      }),
    ).toEqual(['loopback', '::1', '192.168.0.0/24']);
  });

  it('fails closed when DPoP is enabled and the shared store is unavailable', async () => {
    process.env.AUTH_DPOP_ENABLED = 'true';
    setDpopJtiStoreForTests(undefined);
    delete process.env.REDIS_URL;
    const { privateKey, publicJwk } = generateEcKeyPair();
    const jkt = computeJwkThumbprintSync(publicJwk);
    const access = signJwt({ userId: 1, role: 'user', cnf: { jkt } }, secret, 900);
    const req = {
      method: 'GET',
      protocol: 'https',
      originalUrl: '/api/v1/x',
      get(name: string) {
        if (name === 'host') return 'api.example';
        if (name === 'dpop') {
          return mintTestDpopProof({
            method: 'GET',
            htu: 'https://api.example/api/v1/x',
            privateKey,
            publicJwk,
            ath: accessTokenHash(access),
          });
        }
        return undefined;
      },
      headers: {},
    };

    expect(
      (await enforceDpopIfEnabled(req, access, verifyAccessToken(access, secret))).error,
    ).toBe('dpop_jti_store_unavailable');
  });

  it('flag ON rejects cnf-bound token without ath claim', async () => {
    process.env.AUTH_DPOP_ENABLED = 'true';
    const { privateKey, publicJwk } = generateEcKeyPair();
    const jkt = computeJwkThumbprintSync(publicJwk);
    const access = signJwt(
      { userId: 1, email: 'a@b.c', role: 'user', cnf: { jkt } },
      secret,
      900,
    );
    const proof = mintTestDpopProof({
      method: 'GET',
      htu: 'http://localhost:3002/api/v1/x',
      privateKey,
      publicJwk,
      // no ath
    });
    const req = {
      method: 'GET',
      protocol: 'http',
      originalUrl: '/api/v1/x',
      get(name: string) {
        if (name === 'host') return 'localhost:3002';
        if (name === 'dpop') return proof;
        return undefined;
      },
      headers: {},
    };
    const payload = verifyAccessToken(access, secret);
    expect((await enforceDpopIfEnabled(req, access, payload)).error).toBe('dpop_ath_missing');
  });

  it('device_info helpers merge and extract dpop_jkt without migration', () => {
    const {
      mergeDpopJktIntoDeviceInfo,
      extractDpopJktFromDeviceInfo,
      DPOP_JKT_DEVICE_KEY,
    } = require('../../api/v1/auth/dpop.service');
    const merged = mergeDpopJktIntoDeviceInfo({ browser: 'x' }, 'abc123');
    expect(merged).toEqual({ browser: 'x', [DPOP_JKT_DEVICE_KEY]: 'abc123' });
    expect(extractDpopJktFromDeviceInfo(merged)).toBe('abc123');
    expect(extractDpopJktFromDeviceInfo({ browser: 'x' })).toBeNull();
  });

  it('signAccessTokenBound accepts pre-verified dpopJkt without re-consuming jti', async () => {
    const { privateKey, publicJwk } = generateEcKeyPair();
    const jkt = computeJwkThumbprintSync(publicJwk);
    const proof = mintTestDpopProof({
      method: 'POST',
      htu: 'http://localhost:3002/api/v1/auth/refresh',
      privateKey,
      publicJwk,
    });
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
    expect((await verifyDpopProofForTokenEndpoint(req)).ok).toBe(true);
    const token = await signAccessTokenBound(
      { userId: 1, email: 'a@b.c', role: 'user' },
      secret,
      900,
      req,
      { dpopJkt: jkt },
    );
    expect(verifyAccessToken(token, secret)?.cnf?.jkt).toBe(jkt);
  });
});
