import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequireAnfitriaoStaffManager } from '../../../../server/modules/membership/anfitriao-staff.guard';
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

const ROUTES_SRC = join(
  __dirname,
  '../../../../server/modules/acomodacoes/routes/anfitriao.routes.ts',
);
const GUARD_SRC = join(
  __dirname,
  '../../../../server/modules/membership/anfitriao-staff.guard.ts',
);

describe('G-C.9c.3 — Anfitrião Staff Modelo A (OD-9c-A, mínimo real = manager)', () => {
  afterEach(() => setFlag(undefined));

  it('flag OFF => next() (legado)', async () => {
    setFlag(undefined);
    const guard = createRequireAnfitriaoStaffManager(fakeRepo('viewer'));
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + manager/admin/owner => ALLOW', async () => {
    setFlag('true');
    for (const role of ['manager', 'admin', 'owner']) {
      const guard = createRequireAnfitriaoStaffManager(fakeRepo(role));
      let nextCalled = 0;
      await guard(makeReq(), makeRes() as never, () => {
        nextCalled += 1;
      });
      expect(nextCalled).toBe(1);
    }
  });

  it('flag ON + viewer => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireAnfitriaoStaffManager(fakeRepo('viewer'));
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
    const guard = createRequireAnfitriaoStaffManager(fakeRepo('manager'));
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

  it('flag ON + repository default unconfigured => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireAnfitriaoStaffManager();
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('anti-spoofing: payload nao substitui Enterprise Context', async () => {
    setFlag('true');
    const guard = createRequireAnfitriaoStaffManager(fakeRepo('viewer'));
    const res = makeRes();
    let nextCalled = 0;
    await guard(
      makeReq({
        body: { enterpriseId: 42, role: 'admin' },
        headers: { 'x-enterprise-id': '42', 'x-role': 'manager' },
      }),
      res as never,
      () => {
        nextCalled += 1;
      },
    );
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('static: 6 rotas staffAprovacaoAuth; sem Partner composition no guard', () => {
    const src = readFileSync(ROUTES_SRC, 'utf8');
    expect(src).toMatch(
      /const staffAprovacaoAuth = \[\.\.\.staffAprovacao,\s*requireAnfitriaoStaffManager\]/,
    );
    expect(src).toContain("router.post('/admin/unidades/:id/aprovar', ...staffAprovacaoAuth");
    expect(src).toContain("router.post('/admin/unidades/:id/rejeitar', ...staffAprovacaoAuth");
    expect(src).toContain("router.get('/admin/verificacoes-local', ...staffAprovacaoAuth");
    expect(src).toContain(
      "router.post('/admin/unidades/:id/verificacao-local/aprovar', ...staffAprovacaoAuth",
    );
    expect(src).toContain(
      "router.post('/admin/unidades/:id/verificacao-local/rejeitar', ...staffAprovacaoAuth",
    );
    expect(src).toContain("router.post('/admin/carteira', ...staffAprovacaoAuth");

    // Partner write arrays do not use staff guard
    expect(src).not.toMatch(/anfitriaoWriteAuth[\s\S]{0,40}requireAnfitriaoStaffManager/);

    const guard = readFileSync(GUARD_SRC, 'utf8');
    expect(guard).toMatch(/requireEnterpriseRole\('manager'\)/);
    expect(guard).toMatch(/OD-9c-A|Modelo A|Staff Authority/);
    expect(guard).not.toMatch(/parceiroAuth|obterUnidade|podeVerUnidade/);
  });
});
