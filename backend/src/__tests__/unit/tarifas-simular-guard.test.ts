import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequireTarifasSimularPartner } from '../../../../server/modules/membership/tarifas-simular.guard';

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 7, role: 'anfitriao' },
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
  '../../../../server/modules/acomodacoes/routes/tarifas.routes.ts',
);
const GUARD_SRC = join(
  __dirname,
  '../../../../server/modules/membership/tarifas-simular.guard.ts',
);

describe('G-C.9b.3 — Tarifas Simular Model D guard (Enterprise Context + Partner legado)', () => {
  afterEach(() => setFlag(undefined));

  it('flag OFF => next() imediato (legacy governa)', async () => {
    setFlag(undefined);
    const guard = createRequireTarifasSimularPartner();
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq(), res as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
    expect(res.statusCode).toBe(0);
  });

  it("flag inválida ('1') => OFF (contrato isMembershipAuthorityEnabled)", async () => {
    setFlag('1');
    const guard = createRequireTarifasSimularPartner();
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + membershipVerified + enterpriseId => ALLOW (next)', async () => {
    setFlag('true');
    const guard = createRequireTarifasSimularPartner();
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + contexto ausente => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireTarifasSimularPartner();
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq({ authorizedEnterpriseContext: undefined }), res as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + membershipVerified=false => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireTarifasSimularPartner();
    const res = makeRes();
    let nextCalled = 0;
    await guard(
      makeReq({
        authorizedEnterpriseContext: { membershipVerified: false, internalEnterpriseId: 42 },
      }),
      res as never,
      () => { nextCalled += 1; },
    );
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + sem internalEnterpriseId finito => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireTarifasSimularPartner();
    for (const enterpriseId of [undefined, null, Number.NaN, '42']) {
      const res = makeRes();
      let nextCalled = 0;
      await guard(
        makeReq({
          authorizedEnterpriseContext: {
            membershipVerified: true,
            internalEnterpriseId: enterpriseId,
          },
        }),
        res as never,
        () => { nextCalled += 1; },
      );
      expect(nextCalled).toBe(0);
      expect(res.statusCode).toBe(403);
    }
  });

  it('cross-enterprise: context B (99) distinto de A (42) nao e inventado pelo spoof', async () => {
    setFlag('true');
    const guard = createRequireTarifasSimularPartner();
    // Context A OK
    let nextA = 0;
    await guard(makeReq(), makeRes() as never, () => { nextA += 1; });
    expect(nextA).toBe(1);

    // Context B sem membership (ausente) => DENY — spoof nao cria contexto
    const resB = makeRes();
    let nextB = 0;
    await guard(
      makeReq({
        authorizedEnterpriseContext: undefined,
        body: { enterpriseId: 99 },
        query: { enterpriseId: '99' },
        headers: { 'x-enterprise-id': '99' },
      }),
      resB as never,
      () => { nextB += 1; },
    );
    expect(nextB).toBe(0);
    expect(resB.statusCode).toBe(403);
  });

  it('spoofing: body/query/headers NAO substituem authorizedEnterpriseContext', async () => {
    setFlag('true');
    const guard = createRequireTarifasSimularPartner();
    const res = makeRes();
    let nextCalled = 0;
    await guard(
      makeReq({
        authorizedEnterpriseContext: { membershipVerified: false, internalEnterpriseId: 42 },
        body: { enterpriseId: 42, role: 'admin', partnerId: 'p1' },
        query: { enterpriseId: '42', userId: '1' },
        headers: { 'x-enterprise-id': '42', 'x-user-id': '1', 'x-partner-id': 'p1' },
      }),
      res as never,
      () => { nextCalled += 1; },
    );
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('static: /simular usa simularAuth + guard; politica NAO usa guard 9b.3; PUT isolado', () => {
    const src = readFileSync(ROUTES_SRC, 'utf8');
    expect(src).toMatch(/const simularAuth = \[[\s\S]*requireTarifasSimularPartner/);
    expect(src).toContain("router.get('/simular', ...simularAuth");
    expect(src).toContain("router.put('/politica-desconto', ...politicaWriteAuth");
    // GET politica pode usar politicaReadAuth (9b.4); nao pode reutilizar simularAuth/9b.3
    expect(src).not.toMatch(/router\.get\('\/politica-desconto', \.\.\.simularAuth/);
    expect(src).not.toMatch(
      /router\.get\('\/politica-desconto'[\s\S]{0,120}requireTarifasSimularPartner/,
    );
    // parceiroAuth compartilhado NAO inclui o guard 9b.3
    const parceiroBlock = src.match(/const parceiroAuth = \[[\s\S]*?\];/)?.[0] ?? '';
    expect(parceiroBlock).not.toMatch(/requireTarifasSimularPartner/);
    expect(parceiroBlock).toMatch(/requireRole\('anfitriao'/);
  });

  it('static: handler preserva obterUnidade + preview staff-only', () => {
    const src = readFileSync(ROUTES_SRC, 'utf8');
    expect(src).toMatch(/anfitriaoService\.obterUnidade\(authFromReq\(req\),\s*acomodacaoId\)/);
    expect(src).toMatch(/preview=1 restrito a admin\/manager/);
    expect(src).toMatch(/preview:\s*previewRequested\s*&&\s*isStaff/);
  });

  it('static: guard nao importa role.guards nem chama escopo de unidade/financeiro', () => {
    const src = readFileSync(GUARD_SRC, 'utf8');
    expect(src).not.toMatch(/from ['"].*role\.guards['"]/);
    expect(src).not.toMatch(/requireEnterpriseRole\s*\(/);
    expect(src).not.toMatch(/resolveCanonicalRoleContext\s*\(/);
    expect(src).not.toMatch(/obterUnidade\s*\(/);
    expect(src).not.toMatch(/RefundService|Ledger|Earnings|Payout|Gateway/i);
    expect(src).toMatch(/isMembershipAuthorityEnabled/);
    expect(src).toMatch(/authorizedEnterpriseContext/);
  });

  it('flag ON + membership OK ignora spoof e ainda ALLOW (contexto server-side)', async () => {
    setFlag('true');
    const guard = createRequireTarifasSimularPartner();
    let nextCalled = 0;
    await guard(
      makeReq({
        body: { enterpriseId: 999, role: 'admin' },
        query: { enterpriseId: '999' },
        headers: { 'x-enterprise-id': '999' },
      }),
      makeRes() as never,
      () => { nextCalled += 1; },
    );
    expect(nextCalled).toBe(1);
  });
});
