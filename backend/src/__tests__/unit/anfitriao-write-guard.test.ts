import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequireAnfitriaoWritePartner } from '../../../../server/modules/membership/anfitriao-write.guard';

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
const GUARD_SRC = join(
  __dirname,
  '../../../../server/modules/membership/anfitriao-write.guard.ts',
);
const INDEX_SRC = join(
  __dirname,
  '../../../../server/modules/acomodacoes/routes/index.ts',
);

describe('G-C.9c.3 — Anfitrião Write Model D guard (Enterprise Context + Partner PRESERVE)', () => {
  afterEach(() => setFlag(undefined));

  it('flag OFF => next() (legado bit-a-bit)', async () => {
    setFlag(undefined);
    const guard = createRequireAnfitriaoWritePartner();
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(1);
  });

  it("flag inválida ('1') => OFF", async () => {
    setFlag('1');
    const guard = createRequireAnfitriaoWritePartner();
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + context válido => next()', async () => {
    setFlag('true');
    const guard = createRequireAnfitriaoWritePartner();
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + Membership ausente => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireAnfitriaoWritePartner();
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
    const guard = createRequireAnfitriaoWritePartner();
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

  it('anti-spoofing: body/query/header nao substituem contexto', async () => {
    setFlag('true');
    const guard = createRequireAnfitriaoWritePartner();
    const res = makeRes();
    let nextCalled = 0;
    await guard(
      makeReq({
        authorizedEnterpriseContext: { membershipVerified: false, internalEnterpriseId: 42 },
        body: { enterpriseId: 42, userId: 1, proprietarioId: 9 },
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

  it('static: WRITE usa writeAuth; READ permanece readAuth; iCal público; sem HARDEN service', () => {
    const src = readFileSync(ROUTES_SRC, 'utf8');
    expect(src).toMatch(
      /const anfitriaoWriteAuth = \[\.\.\.parceiroAuth,\s*requireAnfitriaoWritePartner\]/,
    );
    expect(src).toMatch(
      /const anfitriaoMasterWriteAuth = \[\.\.\.masterAuth,\s*requireAnfitriaoWritePartner\]/,
    );
    expect(src).toContain("router.patch('/unidades/:id', ...anfitriaoWriteAuth");
    expect(src).toContain("router.put('/unidades/:id/disponibilidade', ...anfitriaoWriteAuth");
    expect(src).toContain("router.post('/unidades/:id/aplicar-desconto', ...anfitriaoWriteAuth");
    expect(src).toContain("router.put('/unidades/:id/rate-calendar/day', ...anfitriaoMasterWriteAuth");
    expect(src).toContain("router.post('/unidades/:id/nfse/preparar', ...anfitriaoMasterWriteAuth");

    // 9c.2 READ preserved
    expect(src).toContain("router.get('/dashboard', ...anfitriaoReadAuth");
    expect(src).toContain("router.get('/unidades/:id', ...anfitriaoReadAuth");
    expect(src).toContain("router.get('/unidades/:id/nfse/rascunhos', ...anfitriaoMasterReadAuth");
    expect(src).toMatch(/router\.get\('\/unidades\/:id\/ical\.ics',\s*async/);

    // shared arrays do not embed write guard
    const parceiroBlock = src.match(/const parceiroAuth = \[[\s\S]*?\];/)?.[0] ?? '';
    expect(parceiroBlock).not.toMatch(/requireAnfitriaoWritePartner/);

    const guard = readFileSync(GUARD_SRC, 'utf8');
    expect(guard).not.toMatch(/requireEnterpriseRole\s*\(/);
    expect(guard).toMatch(/PRESERVE|sem HARDEN/);
    expect(guard).not.toMatch(/RefundService|Ledger|Earnings|Payout|Gateway/i);

    const index = readFileSync(INDEX_SRC, 'utf8');
    expect(index).not.toMatch(/requireAnfitriaoWritePartner/);
  });
});
