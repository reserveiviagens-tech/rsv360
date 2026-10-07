import { createRequireAcomodacoesSyncViewer } from '../../../../server/modules/membership/acomodacoes-sync.guard';
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

describe('G-C.9a — Acomodacoes Sync canonical guard (complementar, mínimo real = viewer)', () => {
  afterEach(() => setFlag(undefined));

  it('flag OFF => next() imediato (legacy governa, S8 preservado)', async () => {
    setFlag(undefined);
    const guard = createRequireAcomodacoesSyncViewer(null as never);
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
    expect(res.statusCode).toBe(0);
  });

  it("flag ON + valor invalido ('1') => OFF", async () => {
    setFlag('1');
    const guard = createRequireAcomodacoesSyncViewer(null as never);
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + viewer/manager/admin/owner => ALLOW (>= mínimo real)', async () => {
    setFlag('true');
    for (const role of ['viewer', 'manager', 'admin', 'owner']) {
      const guard = createRequireAcomodacoesSyncViewer(fakeRepo(role));
      let nextCalled = 0;
      await guard(makeReq(), makeRes() as never, () => { nextCalled += 1; });
      expect(nextCalled).toBe(1);
    }
  });

  it('flag ON + role desconhecida persistida => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireAcomodacoesSyncViewer(fakeRepo('superadmin'));
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + membershipVerified=false => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireAcomodacoesSyncViewer(fakeRepo('viewer'));
    const res = makeRes();
    let nextCalled = 0;
    await guard(
      makeReq({ authorizedEnterpriseContext: { membershipVerified: false, internalEnterpriseId: 42 } }),
      res as never,
      () => { nextCalled += 1; },
    );
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + contexto ausente/desconhecido => DENY 403 (fail-closed)', async () => {
    setFlag('true');
    const guard = createRequireAcomodacoesSyncViewer(fakeRepo('viewer'));
    for (const ctx of [undefined, null, { membershipVerified: true }]) {
      const res = makeRes();
      let nextCalled = 0;
      await guard(makeReq({ authorizedEnterpriseContext: ctx }), res as never, () => { nextCalled += 1; });
      expect(nextCalled).toBe(0);
      expect(res.statusCode).toBe(403);
    }
  });

  it('flag ON + repository nao configurado (default) => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireAcomodacoesSyncViewer();
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + erro do repository => DENY 403', async () => {
    setFlag('true');
    const exploding = {
      findRole: async () => { throw new Error('db down'); },
    } as unknown as PgEnterpriseUsersRepository;
    const guard = createRequireAcomodacoesSyncViewer(exploding);
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + assignment revogada (repo null) => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireAcomodacoesSyncViewer(fakeRepo(null));
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('cross-enterprise: viewer em A (42) NAO autoriza em B (99)', async () => {
    setFlag('true');
    const repoA: PgEnterpriseUsersRepository = {
      findRole: async (u: number, e: number) => ((u === 7 && e === 42 ? 'viewer' : null) as never),
    } as unknown as PgEnterpriseUsersRepository;
    const guard = createRequireAcomodacoesSyncViewer(repoA);

    let nextA = 0;
    await guard(makeReq(), makeRes() as never, () => { nextA += 1; });
    expect(nextA).toBe(1);

    const resB = makeRes();
    let nextB = 0;
    await guard(
      makeReq({ authorizedEnterpriseContext: { membershipVerified: true, internalEnterpriseId: 99 } }),
      resB as never,
      () => { nextB += 1; },
    );
    expect(nextB).toBe(0);
    expect(resB.statusCode).toBe(403);
  });

  it('spoofing: enterprise/role em body, query e headers NAO alteram a decisao', async () => {
    setFlag('true');
    const guard = createRequireAcomodacoesSyncViewer(null as never); // sem autoridade persistida
    const res = makeRes();
    let nextCalled = 0;
    await guard(
      makeReq({
        body: { enterpriseId: 'ent_1', role: 'admin' },
        query: { enterpriseId: 'ent_42' },
        headers: { 'x-enterprise-id': 'ent_42', 'x-role': 'viewer' },
      }),
      res as never,
      () => { nextCalled += 1; },
    );
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });
});


