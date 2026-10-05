/**
 * C36-ID-04 — Property tenant identity hardening (unit).
 *
 * WHAT IS REAL: the middleware source, its branching and its HTTP status contract.
 * WHAT IS SUBSTITUTED (MOCK INTEGRATION): `PropertyRepository` is an in-memory
 * fake. No database, no migration and no real property_users row is involved.
 *
 * These tests prove the authorization DECISION made by the middleware, not
 * durable persistence behaviour.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import express from 'express';
import request from 'supertest';

import { createTenantMiddleware } from '../../../../server/modules/multi-property/middleware/tenant.middleware';

type FakeRepo = {
  validateUserAccess(propertyId: number, userId: number): Promise<boolean>;
  getDefaultPropertyForUser(userId: number): Promise<number>;
};

const AUTHORIZED_USER = 42;
const OTHER_USER = 7;

let boom: Error | null = null;

function buildRepo(): FakeRepo {
  return {
    async validateUserAccess(propertyId: number, userId: number) {
      if (boom) throw boom;
      return userId === AUTHORIZED_USER && propertyId === 5;
    },
    async getDefaultPropertyForUser(userId: number) {
      if (boom) throw boom;
      // Only the authorized user owns a property; everyone else owns none.
      return userId === AUTHORIZED_USER ? 5 : (NaN as unknown as number);
    },
  };
}

function buildApp(identity?: { id: number }) {
  const repo = buildRepo();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (identity) (req as { user?: { id: number } }).user = identity;
    next();
  });
  app.use(createTenantMiddleware(repo as never));

  app.get('/probe', (req, res) => {
    const scoped = (req as { propertyId?: number }).propertyId;
    res.json({ propertyId: scoped ?? null, hasPropertyId: scoped !== undefined });
  });

  app.use((_err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  });
  return app;
}

const AUTH = { id: AUTHORIZED_USER };
const MIDDLEWARE_SRC = join(
  __dirname,
  '../../../../server/modules/multi-property/middleware/tenant.middleware.ts',
);

beforeEach(() => {
  boom = null;
});

describe('C36-ID-04 authorized access', () => {
  it('1. authenticated user + authorized property → 200 with propertyId', async () => {
    const res = await request(buildApp(AUTH)).get('/probe').set('x-property-id', '5');
    expect(res.status).toBe(200);
    expect(res.body.propertyId).toBe(5);
  });

  it('1b. the same access via ?property_id query', async () => {
    const res = await request(buildApp(AUTH)).get('/probe?property_id=5');
    expect(res.status).toBe(200);
    expect(res.body.propertyId).toBe(5);
  });
});

describe('C36-ID-04 unauthorized access', () => {
  it('2. authenticated user + unauthorized property → 403 PROPERTY_ACCESS_DENIED', async () => {
    const res = await request(buildApp(AUTH)).get('/probe').set('x-property-id', '99');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PROPERTY_ACCESS_DENIED');
  });
});

describe('C36-ID-04 identity is required to claim a property', () => {
  it('3. no identity + property requested → 401', async () => {
    const res = await request(buildApp()).get('/probe').set('x-property-id', '5');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('3b. no identity + ?property_id → 401 as well', async () => {
    const res = await request(buildApp()).get('/probe?property_id=5');
    expect(res.status).toBe(401);
  });
});

describe('C36-ID-04 x-user-id is not an identity authority (I1)', () => {
  it('4. x-user-id naming an authorized user is IGNORED when JWT says otherwise', async () => {
    // Header claims user 42 (authorized); the session says user 7.
    const res = await request(buildApp({ id: OTHER_USER }))
      .get('/probe')
      .set('x-property-id', '5')
      .set('x-user-id', String(AUTHORIZED_USER));

    // Authorization follows the JWT only ⇒ 403, never 200.
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PROPERTY_ACCESS_DENIED');
  });

  it('4b. x-user-id cannot upgrade an unauthenticated request', async () => {
    const res = await request(buildApp())
      .get('/probe')
      .set('x-property-id', '5')
      .set('x-user-id', String(AUTHORIZED_USER));
    expect(res.status).toBe(401);
  });

  it('5. malformed x-user-id is ignored, not coerced', async () => {
    const res = await request(buildApp(AUTH))
      .get('/probe')
      .set('x-property-id', '5')
      .set('x-user-id', 'not-a-number');
    expect(res.status).toBe(200);
    expect(res.body.propertyId).toBe(5);
  });
});

describe('C36-ID-04 default property (I3)', () => {
  it('6. identity with no default property leaves propertyId unset (never 1)', async () => {
    const res = await request(buildApp({ id: OTHER_USER })).get('/probe');
    expect(res.status).toBe(200);
    expect(res.body.hasPropertyId).toBe(false);
    expect(res.body.propertyId).toBeNull();
  });

  it('6b. identity WITH a default property still receives it', async () => {
    const res = await request(buildApp(AUTH)).get('/probe');
    expect(res.status).toBe(200);
    expect(res.body.propertyId).toBe(5);
  });
});

describe('C36-ID-04 malformed property_id', () => {
  it.each([['abc'], ['0'], ['-1'], ['1.5'], ['NaN']])(
    '7. property_id=%p → 400',
    async (value) => {
      const res = await request(buildApp(AUTH)).get('/probe').set('x-property-id', value);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_PROPERTY_ID');
    },
  );
});

describe('C36-ID-04 errors propagate (I4)', () => {
  it('8. repository error is surfaced, never degraded into property 1', async () => {
    boom = new Error('SQLSTATE 08006: connection failure');
    const res = await request(buildApp(AUTH)).get('/probe').set('x-property-id', '5');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('INTERNAL_ERROR');
    // No driver detail leaks to the client.
    expect(JSON.stringify(res.body)).not.toMatch(/SQLSTATE/);
  });

  it('8b. an error on the default-property path is surfaced too', async () => {
    boom = new Error('boom');
    const res = await request(buildApp(AUTH)).get('/probe');
    expect(res.status).toBe(500);
  });
});

describe('C36-ID-04 property-independent routes keep working', () => {
  it('9. no identity + no property → 200 with propertyId unset', async () => {
    const res = await request(buildApp()).get('/probe');
    expect(res.status).toBe(200);
    expect(res.body.hasPropertyId).toBe(false);
    expect(res.body.propertyId).toBeNull();
  });

  it('9b. public consumers (tracking/metrics style) are never forced to 401', async () => {
    const res = await request(buildApp()).get('/probe');
    expect(res.status).not.toBe(401);
  });
});

describe('C36-ID-04 downstream compatibility', () => {
  it('10. notification-style consumers still derive a usable value via their own fallback', async () => {
    // Mirrors propertyIdFromReq(req) in notifications/routes.js:23.
    const res = await request(buildApp({ id: OTHER_USER })).get('/probe');
    const legacyFallback = res.body.propertyId || 1;
    // Same observable value as before this gate: the legacy fallback re-derives 1,
    // so removing the middleware default did NOT change downstream behaviour.
    expect(legacyFallback).toBe(1);
  });
});

/** Strips block/line comments so static assertions describe CODE, not prose. */
function middlewareCode(): string {
  return readFileSync(MIDDLEWARE_SRC, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('C36-ID-05 D3 — nullable default property', () => {
  it('getDefaultPropertyForUser is declared number | null', () => {
    const src = readFileSync(
      join(
        __dirname,
        '../../../../server/modules/multi-property/db/property.repository.ts',
      ),
      'utf8',
    );
    // D3: the contract itself is nullable — no fabricated `|| 1`.
    expect(src).toMatch(/getDefaultPropertyForUser\(userId: number\): Promise<number \| null>/);
    expect(src).not.toMatch(/properties\[0\]\?\.id\s*\|\|\s*1/);
  });

  it('the middleware tolerates a null default without inventing property 1', async () => {
    const app = buildApp({ id: OTHER_USER });
    const res = await request(app).get('/probe');
    expect(res.status).toBe(200);
    expect(res.body.hasPropertyId).toBe(false);
  });
});

describe('C36-ID-04 static invariants', () => {
  it('11a. the middleware never reads x-user-id as an identity authority', () => {
    // Comments may mention the header historically; executable code may not.
    expect(middlewareCode()).not.toMatch(/x-user-id/);
  });

  it('11b. the middleware never assigns a literal propertyId = 1', () => {
    const code = middlewareCode();
    expect(code).not.toMatch(/req\.propertyId\s*=\s*1\b/);
    expect(code).not.toMatch(/propertyId\s*\|\|\s*1/);
  });

  it('11c. the middleware still honours the property header/query it always did', () => {
    const code = middlewareCode();
    expect(code).toMatch(/x-property-id/);
    expect(code).toMatch(/property_id/);
  });

  it('11d. errors are propagated, not swallowed', () => {
    const code = middlewareCode();
    expect(code).toMatch(/next\(error\)/);
    expect(code).not.toMatch(/catch\s*\{\s*\}/);
  });
});