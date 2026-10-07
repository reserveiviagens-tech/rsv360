import { createRequireFornecedoresAdmin } from '../../../../server/modules/membership/fornecedores-hub.guard';
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

describe('G-C.1 — Fornecedores Hub canonical guard (complementar no array adminAuth)', () => {
  afterEach(() => setFlag(undefined));

  it('flag OFF => next() imediato (legacy governa, S8 preservado)', async () => {
    setFlag(undefined);
    const guard = createRequireFornecedoresAdmin(fakeRepo('viewer'));
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
    expect(res.statusCode).toBe(0);
  });

  it("flag ON + valor invalido ('1') => OFF", async () => {
    setFlag('1');
    const guard = createRequireFornecedoresAdmin(fakeRepo('viewer'));
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + role admin => ALLOW (mínimo do módulo = admin)', async () => {
    setFlag('true');
    const guard = createRequireFornecedoresAdmin(fakeRepo('admin'));
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + role owner => ALLOW (hierarquia owner > admin)', async () => {
    setFlag('true');
    const guard = createRequireFornecedoresAdmin(fakeRepo('owner'));
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + role manager => DENY 403 (módulo exige admin, manager insuficiente)', async () => {
    setFlag('true');
    const guard = createRequireFornecedoresAdmin(fakeRepo('manager'));
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + role viewer => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireFornecedoresAdmin(fakeRepo('viewer'));
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + membershipVerified=false => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireFornecedoresAdmin(fakeRepo('admin'));
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

  it('flag ON + authorizedEnterpriseContext ausente => DENY 403 (fail-closed)', async () => {
    setFlag('true');
    const guard = createRequireFornecedoresAdmin(fakeRepo('admin'));
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq({ authorizedEnterpriseContext: undefined }), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + repository nao configurado (default) => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireFornecedoresAdmin();
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
    const guard = createRequireFornecedoresAdmin(exploding);
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + assignment revogada (repo null) => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireFornecedoresAdmin(fakeRepo(null));
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('cross-enterprise: admin em A (42) NAO autoriza em B (99)', async () => {
    setFlag('true');
    const repoA: PgEnterpriseUsersRepository = {
      findRole: async (u: number, e: number) => ((u === 7 && e === 42 ? 'admin' : null) as never),
    } as unknown as PgEnterpriseUsersRepository;
    const guard = createRequireFornecedoresAdmin(repoA);

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
    const guard = createRequireFornecedoresAdmin(fakeRepo('viewer'));
    const res = makeRes();
    let nextCalled = 0;
    await guard(
      makeReq({
        body: { enterpriseId: 'ent_1', role: 'admin' },
        query: { enterpriseId: 'ent_42' },
        headers: { 'x-enterprise-id': 'ent_42', 'x-role': 'admin' },
      }),
      res as never,
      () => { nextCalled += 1; },
    );
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });
});

