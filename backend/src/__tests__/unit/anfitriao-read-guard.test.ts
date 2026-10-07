import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequireAnfitriaoReadPartner } from '../../../../server/modules/membership/anfitriao-read.guard';

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
  '../../../../server/modules/acomodacoes/routes/anfitriao.routes.ts',
);
const INDEX_SRC = join(
  __dirname,
  '../../../../server/modules/acomodacoes/routes/index.ts',
);
const GUARD_SRC = join(
  __dirname,
  '../../../../server/modules/membership/anfitriao-read.guard.ts',
);

describe('G-C.9c.2 — Anfitrião Read Model D guard (Enterprise Context + Partner legado)', () => {
  afterEach(() => setFlag(undefined));

  it('flag OFF => next() (legado bit-a-bit)', async () => {
    setFlag(undefined);
    const guard = createRequireAnfitriaoReadPartner();
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(1);
  });

  it("flag inválida ('1') => OFF", async () => {
    setFlag('1');
    const guard = createRequireAnfitriaoReadPartner();
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + context válido => next()', async () => {
    setFlag('true');
    const guard = createRequireAnfitriaoReadPartner();
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + Membership ausente => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireAnfitriaoReadPartner();
    const res = makeRes();
    let nextCalled = 0;
    await guard(makeReq({ authorizedEnterpriseContext: undefined }), res as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('flag ON + membershipVerified !== true => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireAnfitriaoReadPartner();
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

  it('flag ON + internalEnterpriseId inválido => DENY 403 (cross-enterprise)', async () => {
    setFlag('true');
    const guard = createRequireAnfitriaoReadPartner();
    const res = makeRes();
    let nextCalled = 0;
    await guard(
      makeReq({
        authorizedEnterpriseContext: { membershipVerified: true, internalEnterpriseId: NaN },
      }),
      res as never,
      () => {
        nextCalled += 1;
      },
    );
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('anti-spoofing: body/query/header nao substituem contexto', async () => {
    setFlag('true');
    const guard = createRequireAnfitriaoReadPartner();
    const res = makeRes();
    let nextCalled = 0;
    await guard(
      makeReq({
        authorizedEnterpriseContext: { membershipVerified: false, internalEnterpriseId: 42 },
        body: { enterpriseId: 42, userId: 1, role: 'admin' },
        query: { enterpriseId: '42' },
        headers: { 'x-enterprise-id': '42', 'x-user-id': '1' },
      }),
      res as never,
      () => {
        nextCalled += 1;
      },
    );
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('static: READ GETs usam anfitriaoReadAuth; WRITE isolado em writeAuth (9c.3)', () => {
    const src = readFileSync(ROUTES_SRC, 'utf8');
    expect(src).toMatch(
      /const anfitriaoReadAuth = \[\.\.\.parceiroAuth,\s*requireAnfitriaoReadPartner\]/,
    );
    expect(src).toMatch(
      /const anfitriaoMasterReadAuth = \[\.\.\.masterAuth,\s*requireAnfitriaoReadPartner\]/,
    );

    expect(src).toContain("router.get('/dashboard', ...anfitriaoReadAuth");
    expect(src).toContain("router.get('/minhas', ...anfitriaoReadAuth");
    expect(src).toContain("router.get('/unidades/:id', ...anfitriaoReadAuth");
    expect(src).toContain("router.get('/unidades/:id/rate-calendar', ...anfitriaoReadAuth");
    expect(src).toContain("router.get('/unidades/:id/nfse/rascunhos', ...anfitriaoMasterReadAuth");

    // WRITE isolated on 9c.3 arrays (not Read guard)
    expect(src).toContain("router.patch('/unidades/:id', ...anfitriaoWriteAuth");
    expect(src).toContain("router.put('/unidades/:id/disponibilidade', ...anfitriaoWriteAuth");
    expect(src).toContain("router.post('/unidades/:id/aplicar-desconto', ...anfitriaoWriteAuth");
    expect(src).toContain("router.put('/unidades/:id/rate-calendar/day', ...anfitriaoMasterWriteAuth");
    expect(src).toContain("router.post('/unidades/:id/nfse/preparar', ...anfitriaoMasterWriteAuth");
    expect(src).not.toMatch(
      /router\.patch\('\/unidades\/:id'[\s\S]{0,80}requireAnfitriaoReadPartner/,
    );

    // iCal public; staff on Modelo A array (OD-9c-A) — not Read Partner guard
    expect(src).toMatch(/router\.get\('\/unidades\/:id\/ical\.ics',\s*async/);
    expect(src).toContain("router.get('/admin/verificacoes-local', ...staffAprovacaoAuth");
    expect(src).not.toMatch(
      /router\.get\('\/admin\/verificacoes-local'[\s\S]{0,80}requireAnfitriaoReadPartner/,
    );

    // shared arrays themselves do not embed the guard
    const parceiroBlock = src.match(/const parceiroAuth = \[[\s\S]*?\];/)?.[0] ?? '';
    const masterBlock = src.match(/const masterAuth = \[[\s\S]*?\];/)?.[0] ?? '';
    expect(parceiroBlock).not.toMatch(/requireAnfitriaoReadPartner/);
    expect(masterBlock).not.toMatch(/requireAnfitriaoReadPartner/);
  });

  it('static: guard Model D sem requireEnterpriseRole; 9c.1 Index isolado; Partner PRESERVE', () => {
    const guard = readFileSync(GUARD_SRC, 'utf8');
    expect(guard).toMatch(/authorizedEnterpriseContext/);
    expect(guard).not.toMatch(/requireEnterpriseRole\s*\(/);
    expect(guard).not.toMatch(/RefundService|Ledger|Earnings|Payout|Gateway/i);
    expect(guard).toMatch(/PRESERVE|sem HARDEN|Resource Binding permanece/i);

    const index = readFileSync(INDEX_SRC, 'utf8');
    expect(index).not.toMatch(/requireAnfitriaoReadPartner/);
    expect(index).toMatch(/requireAcomodacoesIndexAdmin/);
  });

  it('static: OD-9c-B — nenhum endurecimento de podeVer/podeGerenciar neste gate', () => {
    const src = readFileSync(ROUTES_SRC, 'utf8');
    // handlers still call existing services — no new authorize* write hardeners
    expect(src).not.toMatch(/authorizePoliticaDesconto|podeGerenciarUnidade\s*=/);
    expect(src).toMatch(/anfitriaoService\.obterUnidade|listarMinhas|dashboardKpis/);
  });
});
