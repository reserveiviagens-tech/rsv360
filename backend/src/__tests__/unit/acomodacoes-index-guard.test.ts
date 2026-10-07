import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequireAcomodacoesIndexAdmin } from '../../../../server/modules/membership/acomodacoes-index.guard';
import type { PgEnterpriseUsersRepository } from '../../../../server/modules/membership/role-assignment.repository';

function fakeRepo(role: unknown, status = 'active'): PgEnterpriseUsersRepository {
  return {
    findRole: async () =>
      status === 'active' && typeof role === 'string' ? (role as never) : null,
  } as unknown as PgEnterpriseUsersRepository;
}

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 7 },
    authorizedEnterpriseContext: {
      membershipVerified: true,
      internalEnterpriseId: 42,
    },
    ...overrides,
  } as never;
}

function makeRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function setFlag(value: string | undefined) {
  if (value === undefined) delete process.env.WS15_MEMBERSHIP_AUTHORITY;
  else process.env.WS15_MEMBERSHIP_AUTHORITY = value;
}

const INDEX_SRC = join(
  __dirname,
  '../../../../server/modules/acomodacoes/routes/index.ts',
);
const ANFITRIAO_SRC = join(
  __dirname,
  '../../../../server/modules/acomodacoes/routes/anfitriao.routes.ts',
);
const GUARD_SRC = join(
  __dirname,
  '../../../../server/modules/membership/acomodacoes-index.guard.ts',
);

describe('G-C.9c.1 — Acomodacoes Index canonical guard (Modelo A, mínimo real = admin)', () => {
  afterEach(() => setFlag(undefined));

  it('flag OFF => next() imediato (legado bit-a-bit)', async () => {
    setFlag(undefined);
    const guard = createRequireAcomodacoesIndexAdmin(fakeRepo('viewer'));
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(1);
    expect(res.statusCode).toBe(0);
  });

  it("flag inválida ('1') => OFF", async () => {
    setFlag('1');
    const guard = createRequireAcomodacoesIndexAdmin(fakeRepo('viewer'));
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + role admin => ALLOW', async () => {
    setFlag('true');
    const guard = createRequireAcomodacoesIndexAdmin(fakeRepo('admin'));
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + role owner => ALLOW (hierarquia)', async () => {
    setFlag('true');
    const guard = createRequireAcomodacoesIndexAdmin(fakeRepo('owner'));
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + role manager => DENY 403 (espelha requireRole admin)', async () => {
    setFlag('true');
    const guard = createRequireAcomodacoesIndexAdmin(fakeRepo('manager'));
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + role viewer => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireAcomodacoesIndexAdmin(fakeRepo('viewer'));
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + membershipVerified !== true => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireAcomodacoesIndexAdmin(fakeRepo('admin'));
    const res = makeRes();
    let nextCalled = 0;
    await guard(
      makeReq({
        authorizedEnterpriseContext: { membershipVerified: false, internalEnterpriseId: 42 },
      }),
      res as never,
      () => {
        nextCalled += 1;
      },
    );
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + Enterprise Context ausente => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireAcomodacoesIndexAdmin(fakeRepo('admin'));
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq({ authorizedEnterpriseContext: undefined }), res as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + repository nao configurado (default) => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireAcomodacoesIndexAdmin();
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + erro do repository => DENY 403', async () => {
    setFlag('true');
    const exploding = {
      findRole: async () => {
        throw new Error('db down');
      },
    } as unknown as PgEnterpriseUsersRepository;
    const guard = createRequireAcomodacoesIndexAdmin(exploding);
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('cross-enterprise: admin em A (42) NAO autoriza em B (99)', async () => {
    setFlag('true');
    const repoA: PgEnterpriseUsersRepository = {
      findRole: async (u: number, e: number) =>
        (u === 7 && e === 42 ? 'admin' : null) as never,
    } as unknown as PgEnterpriseUsersRepository;
    const guard = createRequireAcomodacoesIndexAdmin(repoA);

    let nextA = 0;
    await guard(makeReq(), makeRes() as never, () => {
      nextA += 1;
    });
    expect(nextA).toBe(1);

    const resB = makeRes();
    let nextB = 0;
    await guard(
      makeReq({
        authorizedEnterpriseContext: { membershipVerified: true, internalEnterpriseId: 99 },
      }),
      resB as never,
      () => {
        nextB += 1;
      },
    );
    expect(nextB).toBe(0);
    expect(resB.statusCode).toBe(403);
  });

  it('anti-spoofing: body/query/header enterpriseId/role NAO alteram a decisao', async () => {
    setFlag('true');
    const guard = createRequireAcomodacoesIndexAdmin(fakeRepo('viewer'));
    const res = makeRes();
    let nextCalled = 0;
    await guard(
      makeReq({
        body: { enterpriseId: 'ent_1', role: 'admin', userId: 1 },
        query: { enterpriseId: 'ent_42' },
        headers: { 'x-enterprise-id': 'ent_42', 'x-user-id': '1', 'x-role': 'admin' },
      }),
      res as never,
      () => {
        nextCalled += 1;
      },
    );
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('static: acomodacoesAdminAuth so em /admin/*; publicas sem guard 9c.1', () => {
    const src = readFileSync(INDEX_SRC, 'utf8');
    expect(src).toMatch(
      /const acomodacoesAdminAuth = \[\.\.\.adminAuth,\s*requireAcomodacoesIndexAdmin\]/,
    );
    expect(src).toContain("router.get('/admin/tipos', ...acomodacoesAdminAuth");
    expect(src).toContain("router.post('/admin/tipos', ...acomodacoesAdminAuth");
    expect(src).toContain("router.patch('/admin/tipos/:id', ...acomodacoesAdminAuth");
    expect(src).toContain("router.get('/admin/addons', ...acomodacoesAdminAuth");
    expect(src).toContain("router.post('/admin/addons', ...acomodacoesAdminAuth");
    expect(src).toContain("router.patch('/admin/addons/:id', ...acomodacoesAdminAuth");
    expect(src).toContain("router.delete('/admin/addons/:id', ...acomodacoesAdminAuth");

    expect(src).toMatch(/router\.get\('\/health'/);
    expect(src).toMatch(/router\.get\('\/publico\/preview\/:token',\s*publicLimiter/);
    expect(src).toMatch(/router\.get\('\/publico\/by-slug\/:slug',\s*publicLimiter/);
    expect(src).toMatch(/router\.get\('\/disponiveis',\s*publicLimiter/);
    expect(src).toMatch(/router\.get\('\/addons',\s*publicLimiter/);
    expect(src).not.toMatch(/router\.get\('\/disponiveis'[\s\S]{0,80}requireAcomodacoesIndexAdmin/);
    expect(src).not.toMatch(/router\.get\('\/addons'[\s\S]{0,80}requireAcomodacoesIndexAdmin/);
  });

  it('static: 9c.2/9c.3 anfitriao.routes NAO recebe guard 9c.1; guard é Modelo A admin', () => {
    const anfitriao = readFileSync(ANFITRIAO_SRC, 'utf8');
    expect(anfitriao).not.toMatch(/requireAcomodacoesIndexAdmin/);
    const guard = readFileSync(GUARD_SRC, 'utf8');
    expect(guard).toMatch(/requireEnterpriseRole\('admin'\)/);
    expect(guard).toMatch(/authorizedEnterpriseContext/);
    expect(guard).not.toMatch(/RefundService|Ledger|Earnings|Payout|Gateway/i);
    expect(guard).not.toMatch(/parceiroAuth|masterAuth|staffAprovacao/);
    expect(guard).not.toMatch(/from ['"].*anfitriao/);
  });
});
