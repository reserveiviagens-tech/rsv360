import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequirePaymentsManager } from '../../../../server/modules/membership/payments.guard';
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

describe('G-B.5 — Payments canonical guard (camada complementar atras da flag)', () => {
  afterEach(() => setFlag(undefined));

  it('flag OFF => next() imediato (legacy governa, comportamento S8 preservado)', async () => {
    setFlag(undefined);
    const guard = createRequirePaymentsManager(fakeRepo('viewer')); // viewer nao passaria com flag ON
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
    expect(res.statusCode).toBe(0);
  });

  it("flag ON + valor invalido ('1') => OFF (apenas 'true' exata liga)", async () => {
    setFlag('1');
    const guard = createRequirePaymentsManager(fakeRepo('viewer'));
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + membership verificada + role manager => ALLOW', async () => {
    setFlag('true');
    const guard = createRequirePaymentsManager(fakeRepo('manager'));
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + role admin => ALLOW (hierarquia admin >= manager)', async () => {
    setFlag('true');
    const guard = createRequirePaymentsManager(fakeRepo('admin'));
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + role viewer => DENY 403', async () => {
    setFlag('true');
    const guard = createRequirePaymentsManager(fakeRepo('viewer'));
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('role desconhecida persistida => DENY 403', async () => {
    setFlag('true');
    const guard = createRequirePaymentsManager(fakeRepo('superadmin'));
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + membershipVerified=false => DENY 403', async () => {
    setFlag('true');
    const guard = createRequirePaymentsManager(fakeRepo('admin'));
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
    const guard = createRequirePaymentsManager(fakeRepo('admin'));
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq({ authorizedEnterpriseContext: undefined }), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + repository nao configurado (default) => DENY 403 (fail-closed)', async () => {
    setFlag('true');
    const guard = createRequirePaymentsManager(); // default unconfigured
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
    const guard = createRequirePaymentsManager(exploding);
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + assignment revogada (repo null) => DENY 403', async () => {
    setFlag('true');
    const guard = createRequirePaymentsManager(fakeRepo(null));
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('cross-enterprise: manager em A (42) NAO autoriza em B (99) — tenant isolation', async () => {
    setFlag('true');
    const repoA: PgEnterpriseUsersRepository = {
      findRole: async (u: number, e: number) => ((u === 7 && e === 42 ? 'manager' : null) as never),
    } as unknown as PgEnterpriseUsersRepository;
    const guard = createRequirePaymentsManager(repoA);

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

  it('spoofing: enterprise/role em body, query, headers e path NAO alteram a decisao', async () => {
    setFlag('true');
    const guard = createRequirePaymentsManager(fakeRepo('viewer')); // autoridade persistida = viewer
    const res = makeRes();
    let nextCalled = 0;
    await guard(
      makeReq({
        body: { enterpriseId: 'ent_1', role: 'admin' },
        query: { enterpriseId: 'ent_42', role: 'owner' },
        headers: { enterpriseid: 'ent_1', 'x-enterprise-id': 'ent_42', 'x-role': 'admin' },
        params: { enterpriseId: '99' },
      }),
      res as never,
      () => { nextCalled += 1; },
    );
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('financial boundary: guard nao importa/chama dominio economico (assercao de fonte)', () => {
    // #18-21: AUTHORIZATION-ONLY — nenhum serviço de pagamento/gateway/earnings/ledger/
    // payout/refund/split/settlement pode aparecer no código do guard (imports/chamadas).
    const src = readFileSync(
      join(__dirname, '../../../../server/modules/membership/payments.guard.ts'),
      'utf8',
    );
    // Analisa apenas o código: comentarios (que citam os dominios para explicita-los) sao removidos.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/payment\.service|pix\.service|refund.*\.service|webhook\.service/);
    expect(code).not.toMatch(/gateway|earnings|ledger|payout|settlement|split/i);
    expect(code).not.toMatch(/from ['"].*payments\//); // zero import do módulo payments
    // único side effect possível é req/res — nada de escrita de estado financeiro
    expect(code).not.toMatch(/INSERT|UPDATE|DELETE|\.query\(/);
  });
});


