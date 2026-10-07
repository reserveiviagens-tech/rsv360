import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequireTarifasPoliticaReadPartner } from '../../../../server/modules/membership/tarifas-politica-read.guard';
import { authorizePoliticaDescontoRead } from '../../../../server/modules/membership/tarifas-politica-read.scope';

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
  '../../../../server/modules/membership/tarifas-politica-read.guard.ts',
);

describe('G-C.9b.4 — Politica Read Enterprise guard', () => {
  afterEach(() => setFlag(undefined));

  it('flag OFF => next() (legacy)', async () => {
    setFlag(undefined);
    const guard = createRequireTarifasPoliticaReadPartner();
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
  });

  it("flag inválida ('1') => OFF", async () => {
    setFlag('1');
    const guard = createRequireTarifasPoliticaReadPartner();
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + context válido => next()', async () => {
    setFlag('true');
    const guard = createRequireTarifasPoliticaReadPartner();
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => { nextCalled += 1; });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + Membership ausente => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireTarifasPoliticaReadPartner();
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
    const guard = createRequireTarifasPoliticaReadPartner();
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

  it('spoofing enterpriseId/userId/partnerId nao substitui o contexto', async () => {
    setFlag('true');
    const guard = createRequireTarifasPoliticaReadPartner();
    const res = makeRes();
    let nextCalled = 0;
    await guard(
      makeReq({
        authorizedEnterpriseContext: { membershipVerified: false, internalEnterpriseId: 42 },
        body: { enterpriseId: 42, userId: 1, partnerId: 'p1', proprietarioId: 9 },
        query: { enterpriseId: '42' },
        headers: { 'x-enterprise-id': '42', 'x-user-id': '1', 'x-partner-id': 'p1' },
      }),
      res as never,
      () => { nextCalled += 1; },
    );
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('static: politicaReadAuth so no GET; PUT politicaWriteAuth; simular isolado; parceiroAuth sem guard 9b.4', () => {
    const src = readFileSync(ROUTES_SRC, 'utf8');
    expect(src).toMatch(/const politicaReadAuth = \[[\s\S]*requireTarifasPoliticaReadPartner/);
    expect(src).toContain("router.get('/politica-desconto', ...politicaReadAuth");
    expect(src).toContain("router.put('/politica-desconto', ...politicaWriteAuth");
    expect(src).toContain("router.get('/simular', ...simularAuth");
    const parceiroBlock = src.match(/const parceiroAuth = \[[\s\S]*?\];/)?.[0] ?? '';
    expect(parceiroBlock).not.toMatch(/requireTarifasPoliticaReadPartner/);
    expect(src).toMatch(/authorizePoliticaDescontoRead/);
    // READ authorize must not drive the write upsert path
    expect(src).not.toMatch(/authorizePoliticaDescontoRead[\s\S]{0,200}upsertPoliticaDesconto/);
  });

  it('static: guard nao importa requireEnterpriseRole nem financeiros', () => {
    const src = readFileSync(GUARD_SRC, 'utf8');
    expect(src).not.toMatch(/requireEnterpriseRole\s*\(/);
    expect(src).not.toMatch(/RefundService|Ledger|Earnings|Payout|Gateway/i);
    expect(src).toMatch(/authorizedEnterpriseContext/);
  });
});

describe('G-C.9b.4 — Politica Read scope binding (OD-9b4-A/B/C)', () => {
  const authAnfitriao = { userId: 7, role: 'anfitriao' };
  const authCorretor = { userId: 8, role: 'corretor' };
  const authStaff = { userId: 1, role: 'manager' };

  it('sem scope => DENY (OD-9b4-A)', async () => {
    const decision = await authorizePoliticaDescontoRead(authAnfitriao, undefined, undefined, {
      obterUnidade: async () => ({ data: {} }),
      hasEmpreendimentoAccess: async () => true,
    });
    expect(decision).toEqual({ ok: false, status: 403, reason: 'scope_required' });
  });

  it('scope=global + partner => DENY; staff => ALLOW (OD-9b4-B)', async () => {
    const deny = await authorizePoliticaDescontoRead(authAnfitriao, 'global', undefined, {
      obterUnidade: async () => ({ data: {} }),
      hasEmpreendimentoAccess: async () => true,
    });
    expect(deny.ok).toBe(false);

    const allow = await authorizePoliticaDescontoRead(authStaff, 'global', undefined, {
      obterUnidade: async () => ({ data: {} }),
      hasEmpreendimentoAccess: async () => true,
    });
    expect(allow).toEqual({ ok: true });
  });

  it('scope=acomodacao + obterUnidade ok => ALLOW (owner-scope path)', async () => {
    const decision = await authorizePoliticaDescontoRead(authAnfitriao, 'acomodacao', '10', {
      obterUnidade: async () => ({ data: { id: 10 } }),
      hasEmpreendimentoAccess: async () => false,
    });
    expect(decision).toEqual({ ok: true });
  });

  it('scope=acomodacao + forbidden => DENY; not_found => 404', async () => {
    const forbidden = await authorizePoliticaDescontoRead(authCorretor, 'acomodacao', '99', {
      obterUnidade: async () => ({ error: 'forbidden' }),
      hasEmpreendimentoAccess: async () => true,
    });
    expect(forbidden).toEqual({ ok: false, status: 403, reason: 'unit_forbidden' });

    const missing = await authorizePoliticaDescontoRead(authCorretor, 'acomodacao', '99', {
      obterUnidade: async () => ({ error: 'not_found' }),
      hasEmpreendimentoAccess: async () => true,
    });
    expect(missing).toEqual({ ok: false, status: 404, reason: 'unit_not_found' });
  });

  it('scopeId adulterado (nao numerico) em acomodacao => DENY', async () => {
    const decision = await authorizePoliticaDescontoRead(authAnfitriao, 'acomodacao', 'abc', {
      obterUnidade: async () => ({ data: {} }),
      hasEmpreendimentoAccess: async () => true,
    });
    expect(decision.ok).toBe(false);
  });

  it('scope=empreendimento + binding ok => ALLOW; sem binding => DENY (OD-9b4-C)', async () => {
    const allow = await authorizePoliticaDescontoRead(authCorretor, 'empreendimento', 'hotel-1', {
      obterUnidade: async () => ({ error: 'forbidden' }),
      hasEmpreendimentoAccess: async () => true,
    });
    expect(allow).toEqual({ ok: true });

    const deny = await authorizePoliticaDescontoRead(authCorretor, 'empreendimento', 'hotel-x', {
      obterUnidade: async () => ({ data: {} }),
      hasEmpreendimentoAccess: async () => false,
    });
    expect(deny).toEqual({ ok: false, status: 403, reason: 'empreendimento_forbidden' });
  });

  it('repository/context failure em empreendimento => DENY', async () => {
    const decision = await authorizePoliticaDescontoRead(authAnfitriao, 'empreendimento', 'h1', {
      obterUnidade: async () => ({ data: {} }),
      hasEmpreendimentoAccess: async () => {
        throw new Error('db down');
      },
    });
    expect(decision).toEqual({ ok: false, status: 403, reason: 'empreendimento_error' });
  });

  it('leitura autorizada nao implica WRITE (static PUT isolado + scope nao toca upsert)', () => {
    const routes = readFileSync(ROUTES_SRC, 'utf8');
    expect(routes).toMatch(/router\.put\('\/politica-desconto', \.\.\.politicaWriteAuth/);
    expect(routes).not.toMatch(/authorizePoliticaDescontoRead[\s\S]{0,200}upsertPoliticaDesconto/);
    // authorize is only inside GET handler block before getPoliticaDesconto
    expect(routes).toMatch(/getPoliticaDesconto\(scope, scopeId\)/);
  });
});
