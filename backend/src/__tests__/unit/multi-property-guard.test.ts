import { createRequirePropertyManager } from '../../../../server/modules/membership/multi-property.guard';
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

describe('G-B.3 — Multi-Property canonical guard (camada complementar atras da flag)', () => {
  afterEach(() => setFlag(undefined));

  it('flag OFF => next() imediato (legacy governa, comportamento S8 preservado)', async () => {
    setFlag(undefined);
    const guard = createRequirePropertyManager(fakeRepo('viewer')); // viewer nao passaria com flag ON
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
    expect(res.statusCode).toBe(0);
  });

  it("flag ON + valor invalido ('1') => OFF (apenas 'true' exata liga)", async () => {
    setFlag('1');
    const guard = createRequirePropertyManager(fakeRepo('viewer'));
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + membership verificada + role manager => ALLOW', async () => {
    setFlag('true');
    const guard = createRequirePropertyManager(fakeRepo('manager'));
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + role admin => ALLOW (hierarquia admin >= manager)', async () => {
    setFlag('true');
    const guard = createRequirePropertyManager(fakeRepo('admin'));
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + role viewer => DENY 403', async () => {
    setFlag('true');
    const guard = createRequirePropertyManager(fakeRepo('viewer'));
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + authorizedEnterpriseContext ausente => DENY 403 (fail-closed)', async () => {
    setFlag('true');
    const guard = createRequirePropertyManager(fakeRepo('admin'));
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq({ authorizedEnterpriseContext: undefined }), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + repository nao configurado (default) => DENY 403 (fail-closed)', async () => {
    setFlag('true');
    const guard = createRequirePropertyManager(); // default unconfigured
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + erro do repository => DENY 403 (sem catch silencioso que autorize)', async () => {
    setFlag('true');
    const exploding = {
      findRole: async () => { throw new Error('db down'); },
    } as unknown as PgEnterpriseUsersRepository;
    const guard = createRequirePropertyManager(exploding);
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + assignment revogada (repo null) => DENY 403', async () => {
    setFlag('true');
    const guard = createRequirePropertyManager(fakeRepo(null));
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('cross-enterprise: admin em A (42) NAO autoriza em B (99) — repo indexado por (user, enterprise)', async () => {
    setFlag('true');
    const repoA: PgEnterpriseUsersRepository = {
      findRole: async (u: number, e: number) => ((u === 7 && e === 42 ? 'admin' : null) as never),
    } as unknown as PgEnterpriseUsersRepository;
    const guard = createRequirePropertyManager(repoA);

    // Mesmo usuario, enterprise A (com assignment admin) => ALLOW
    let nextA = 0;
    await guard(makeReq(), makeRes() as never, () => { nextA += 1; });
    expect(nextA).toBe(1);

    // Mesmo usuario, enterprise B (sem assignment la) => DENY
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

  it('spoofing: role em req.body/query/headers NAO altera a decisao', async () => {
    setFlag('true');
    const guard = createRequirePropertyManager(fakeRepo('viewer')); // autoridade persistida = viewer
    const res = makeRes();
    let nextCalled = 0;
    await guard(
      makeReq({ body: { role: 'admin' }, query: { role: 'owner' }, headers: { 'x-role': 'admin' } }),
      res as never,
      () => { nextCalled += 1; },
    );
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + membershipVerified=false => DENY 403', async () => {
    setFlag('true');
    const guard = createRequirePropertyManager(fakeRepo('admin'));
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
});

