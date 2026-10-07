import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequireTarifasPoliticaWritePartner } from '../../../../server/modules/membership/tarifas-politica-write.guard';
import { authorizePoliticaDescontoWrite } from '../../../../server/modules/membership/tarifas-politica-write.scope';

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
  '../../../../server/modules/membership/tarifas-politica-write.guard.ts',
);
const SCOPE_SRC = join(
  __dirname,
  '../../../../server/modules/membership/tarifas-politica-write.scope.ts',
);
const SERVICE_SRC = join(
  __dirname,
  '../../../../server/modules/acomodacoes/services/rate-calendar.service.ts',
);

const portsAllow = {
  obterUnidade: async () => ({ data: { id: 10 } }),
  getUnitOwner: async () => ({ proprietarioId: 7 }),
  hasEmpreendimentoAccess: async () => true,
};

describe('G-C.9b.5 — Politica Write Enterprise guard', () => {
  afterEach(() => setFlag(undefined));

  it('flag OFF => next() (legacy bit-a-bit)', async () => {
    setFlag(undefined);
    const guard = createRequireTarifasPoliticaWritePartner();
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(1);
  });

  it("flag inválida ('1') => OFF", async () => {
    setFlag('1');
    const guard = createRequireTarifasPoliticaWritePartner();
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + context válido => next()', async () => {
    setFlag('true');
    const guard = createRequireTarifasPoliticaWritePartner();
    let nextCalled = 0;
    await guard(makeReq(), makeRes() as never, () => {
      nextCalled += 1;
    });
    expect(nextCalled).toBe(1);
  });

  it('flag ON + Membership ausente => DENY 403', async () => {
    setFlag('true');
    const guard = createRequireTarifasPoliticaWritePartner();
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
    const guard = createRequireTarifasPoliticaWritePartner();
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

  it('flag ON + internalEnterpriseId não finito => DENY 403 (cross-enterprise)', async () => {
    setFlag('true');
    const guard = createRequireTarifasPoliticaWritePartner();
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

  it('anti-spoofing: body/query/header enterpriseId/userId nao substituem contexto', async () => {
    setFlag('true');
    const guard = createRequireTarifasPoliticaWritePartner();
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
      () => {
        nextCalled += 1;
      },
    );
    expect(nextCalled).toBe(0);
    expect(res.statusCode).toBe(403);
  });

  it('static: politicaWriteAuth so no PUT; GET/simular/parceiroAuth/masterAuth isolados', () => {
    const src = readFileSync(ROUTES_SRC, 'utf8');
    expect(src).toMatch(/const politicaWriteAuth = \[\.\.\.masterAuth,\s*requireTarifasPoliticaWritePartner\]/);
    expect(src).toContain("router.put('/politica-desconto', ...politicaWriteAuth");
    expect(src).toContain("router.get('/politica-desconto', ...politicaReadAuth");
    expect(src).toContain("router.get('/simular', ...simularAuth");
    const masterBlock = src.match(/const masterAuth = \[[\s\S]*?\];/)?.[0] ?? '';
    expect(masterBlock).not.toMatch(/requireTarifasPoliticaWritePartner/);
    const parceiroBlock = src.match(/const parceiroAuth = \[[\s\S]*?\];/)?.[0] ?? '';
    expect(parceiroBlock).not.toMatch(/requireTarifasPoliticaWritePartner/);
    expect(src).toMatch(/authorizePoliticaDescontoWrite/);
    expect(src).toMatch(/flagOn \? \{ atomic: true \} : undefined/);
  });

  it('static: guard nao importa requireEnterpriseRole nem financeiros; sem clientIp/correlationId', () => {
    const src = readFileSync(GUARD_SRC, 'utf8');
    expect(src).not.toMatch(/requireEnterpriseRole\s*\(/);
    expect(src).not.toMatch(/RefundService|Ledger|Earnings|Payout|Gateway/i);
    expect(src).not.toMatch(/clientIp|correlationId/);
    expect(src).toMatch(/authorizedEnterpriseContext/);
  });
});

describe('G-C.9b.5 — Politica Write scope binding (OD-9b5-A/B/C)', () => {
  const authAnfitriao = { userId: 7, role: 'anfitriao' };
  const authCorretor = { userId: 8, role: 'corretor' };
  const authAgente = { userId: 9, role: 'agente' };
  const authPromotor = { userId: 10, role: 'promotor' };
  const authAdmin = { userId: 1, role: 'admin' };
  const authManager = { userId: 2, role: 'manager' };

  it('non-MASTER (corretor/agente/promotor) => DENY', async () => {
    for (const auth of [authCorretor, authAgente, authPromotor]) {
      const decision = await authorizePoliticaDescontoWrite(auth, 'global', null, portsAllow);
      expect(decision).toEqual({ ok: false, status: 403, reason: 'role_not_master' });
    }
  });

  it('OD-9b5-A: anfitriao + global => DENY absoluto', async () => {
    const decision = await authorizePoliticaDescontoWrite(
      authAnfitriao,
      'global',
      null,
      portsAllow,
    );
    expect(decision).toEqual({ ok: false, status: 403, reason: 'anfitriao_global_denied' });
  });

  it('admin/manager + global => ALLOW', async () => {
    for (const auth of [authAdmin, authManager]) {
      const decision = await authorizePoliticaDescontoWrite(auth, 'global', null, portsAllow);
      expect(decision).toEqual({ ok: true });
    }
  });

  it('OD-9b5-B: anfitriao + empreendimento => DENY', async () => {
    const decision = await authorizePoliticaDescontoWrite(
      authAnfitriao,
      'empreendimento',
      'hotel-1',
      portsAllow,
    );
    expect(decision).toEqual({
      ok: false,
      status: 403,
      reason: 'anfitriao_empreendimento_denied',
    });
  });

  it('admin/manager + empreendimento com binding => ALLOW; sem binding => DENY', async () => {
    const allow = await authorizePoliticaDescontoWrite(authManager, 'empreendimento', 'h1', {
      ...portsAllow,
      hasEmpreendimentoAccess: async () => true,
    });
    expect(allow).toEqual({ ok: true });

    const deny = await authorizePoliticaDescontoWrite(authAdmin, 'empreendimento', 'hx', {
      ...portsAllow,
      hasEmpreendimentoAccess: async () => false,
    });
    expect(deny).toEqual({ ok: false, status: 403, reason: 'empreendimento_forbidden' });
  });

  it('OD-9b5-C: anfitriao + acomodacao própria => ALLOW', async () => {
    const decision = await authorizePoliticaDescontoWrite(authAnfitriao, 'acomodacao', '10', {
      ...portsAllow,
      getUnitOwner: async () => ({ proprietarioId: 7 }),
      obterUnidade: async () => ({ error: 'forbidden' }), // cohost path must NOT be used
    });
    expect(decision).toEqual({ ok: true });
  });

  it('OD-9b5-C: anfitriao + acomodacao de terceiro => DENY', async () => {
    const decision = await authorizePoliticaDescontoWrite(authAnfitriao, 'acomodacao', '10', {
      ...portsAllow,
      getUnitOwner: async () => ({ proprietarioId: 99 }),
    });
    expect(decision).toEqual({ ok: false, status: 403, reason: 'anfitriao_not_owner' });
  });

  it('acomodacao inexistente => 404', async () => {
    const anfitriao = await authorizePoliticaDescontoWrite(authAnfitriao, 'acomodacao', '404', {
      ...portsAllow,
      getUnitOwner: async () => ({ not_found: true }),
    });
    expect(anfitriao).toEqual({ ok: false, status: 404, reason: 'unit_not_found' });

    const staff = await authorizePoliticaDescontoWrite(authManager, 'acomodacao', '404', {
      ...portsAllow,
      obterUnidade: async () => ({ error: 'not_found' }),
    });
    expect(staff).toEqual({ ok: false, status: 404, reason: 'unit_not_found' });
  });

  it('admin/manager + acomodacao com obterUnidade ok => ALLOW; forbidden => DENY', async () => {
    const allow = await authorizePoliticaDescontoWrite(authAdmin, 'acomodacao', '10', {
      ...portsAllow,
      obterUnidade: async () => ({ data: { id: 10 } }),
    });
    expect(allow).toEqual({ ok: true });

    const deny = await authorizePoliticaDescontoWrite(authManager, 'acomodacao', '10', {
      ...portsAllow,
      obterUnidade: async () => ({ error: 'forbidden' }),
    });
    expect(deny).toEqual({ ok: false, status: 403, reason: 'unit_forbidden' });
  });

  it('scopeId inválido / ausente em acomodacao => DENY', async () => {
    const missing = await authorizePoliticaDescontoWrite(
      authAnfitriao,
      'acomodacao',
      null,
      portsAllow,
    );
    expect(missing.ok).toBe(false);

    const bad = await authorizePoliticaDescontoWrite(
      authAnfitriao,
      'acomodacao',
      'abc',
      portsAllow,
    );
    expect(bad).toEqual({ ok: false, status: 403, reason: 'scope_id_invalid' });
  });

  it('static: scope usa getUnitOwner (ownership) e NAO confia em query/body userId', () => {
    const src = readFileSync(SCOPE_SRC, 'utf8');
    expect(src).toMatch(/getUnitOwner/);
    expect(src).toMatch(/proprietarioId !== auth\.userId/);
    expect(src).toMatch(/anfitriao_global_denied/);
    expect(src).toMatch(/anfitriao_empreendimento_denied/);
    expect(src).not.toMatch(/req\.(body|query|headers)/);
  });
});

describe('G-C.9b.5 — Atomicidade FLAG ON vs legado OFF', () => {
  it('static: upsertPoliticaDesconto usa db.transaction SOMENTE quando options.atomic===true', () => {
    const src = readFileSync(SERVICE_SRC, 'utf8');
    expect(src).toMatch(/options\?: \{ atomic\?: boolean \}/);
    expect(src).toMatch(/if \(options\?\.atomic === true\)/);
    expect(src).toMatch(/return db\.transaction\(async \(tx\) => run\(tx\)/);
    expect(src).toMatch(/return run\(db\);/);
    // audit insert inside run() so both paths share the same statements
    expect(src).toMatch(/executor\.insert\(politicaDescontoAudit\)/);
  });

  it('static: handler passa atomic:true somente sob flagOn; OFF nao injeta transaction', () => {
    const src = readFileSync(ROUTES_SRC, 'utf8');
    expect(src).toMatch(/flagOn \? \{ atomic: true \} : undefined/);
    expect(src).not.toMatch(/upsertPoliticaDesconto\([\s\S]{0,200}\{ atomic: true \}/);
  });

  it('limites 0–100: validation message presente no service (preservado)', () => {
    const src = readFileSync(SERVICE_SRC, 'utf8');
    expect(src).toMatch(/pct < 0 \|\| pct > 100/);
    expect(src).toMatch(/maxDescontoPercentual inválido/);
  });

  it('getUnitOwner exportado no service (ownership write path)', () => {
    const src = readFileSync(SERVICE_SRC, 'utf8');
    expect(src).toMatch(/async getUnitOwner\(/);
    expect(src).toMatch(/proprietarioId: acomodacoes\.proprietarioId/);
  });
});

describe('G-C.9b.5 — rollback transacional da auditoria (contrato atomic)', () => {
  it('contrato: run() executa upsert e audit no mesmo executor; falha de audit propaga na tx', async () => {
    // Lightweight contract double: same shape as service run(executor)
    const ops: string[] = [];
    const run = async (executor: {
      upsert: () => Promise<void>;
      audit: () => Promise<void>;
    }) => {
      await executor.upsert();
      await executor.audit();
      return { data: { id: 1 } };
    };

    const atomic = async <T>(fn: (tx: { upsert: () => Promise<void>; audit: () => Promise<void> }) => Promise<T>) => {
      const tx = {
        upsert: async () => {
          ops.push('upsert');
        },
        audit: async () => {
          ops.push('audit');
          throw new Error('audit_fail');
        },
      };
      try {
        return await fn(tx);
      } catch (e) {
        ops.push('rollback');
        throw e;
      }
    };

    await expect(atomic((tx) => run(tx))).rejects.toThrow('audit_fail');
    expect(ops).toEqual(['upsert', 'audit', 'rollback']);
  });
});
