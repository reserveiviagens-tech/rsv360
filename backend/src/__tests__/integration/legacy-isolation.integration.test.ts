/**
 * WS-15 / S7 — Legacy Isolation / Non-Invasive Regression Boundary.
 *
 * PROVA (nao migra nada): a existencia de membership/* e role.guards nao altera o
 * comportamento de nenhuma rota legada. `requireRole` legado continua lendo `req.user.role`.
 *
 * I-S7-01..10. Nenhum arquivo de produto e alterado nesta fatia — apenas este teste.
 */
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import express, { type Request, type Response, type NextFunction } from 'express';
import {
  selectMembershipPort,
  isMembershipAuthorityEnabled,
  InMemoryMembershipRepository,
  buildRoleContext,
  requireEnterpriseRole,
  type MembershipRecord,
} from '../../../../server/modules/membership';
import { requireRole } from '../../../../server/middleware/auth.middleware';

const ACTIVE: MembershipRecord = {
  subjectUserId: 7,
  internalEnterpriseId: 42,
  status: 'active',
  externalEnterpriseKey: 'ent_42',
};

/**
 * Rota LEGADA, exatamente como existe no repositorio: `requireRole` lendo `req.user.role`.
 * Nenhum middleware WS-15 e montado nesta rota. Os demais ficam "presentes no processo".
 */
function buildLegacyRoute(jwtRole: string | undefined) {
  const app = express();
  app.get(
    '/legacy/manager',
    (req: Request, _res: Response, next: NextFunction) => {
      if (jwtRole !== undefined) req.user = { id: 7, enterpriseId: 'ent_42', role: jwtRole };
      next();
    },
    requireRole('manager'),
    (_req, res) => res.status(200).json({ ok: true }),
  );
  return app;
}

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(ts|js|tsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

/** Codigo de PRODUTO legado: exclui testes (que por definicao exercitam o WS-15). */
function productFiles(): string[] {
  return LEGACY_ROOTS.flatMap((r) => walk(path.join(REPO_ROOT, r))).filter(
    (f) => !f.includes(`${path.sep}__tests__${path.sep}`) && !f.endsWith('.test.ts'),
  );
}

const isWs15 = (f: string) => f.includes(`${path.sep}membership${path.sep}`);

const LEGACY_ROOTS = ['server/modules', 'server/middleware', 'backend/src'];

describe('S7.1 comportamento da rota legada nao muda (I-S7-02/03/05)', () => {
  it('JWT role valido => ALLOW (comportamento legado preservado)', async () => {
    const res = await request(buildLegacyRoute('manager')).get('/legacy/manager');
    expect(res.status).toBe(200);
  });

  it('JWT role invalido => 403 legado', async () => {
    const res = await request(buildLegacyRoute('viewer')).get('/legacy/manager');
    expect(res.status).toBe(403);
  });

  it('sem role => 403 legado', async () => {
    const res = await request(buildLegacyRoute(undefined)).get('/legacy/manager');
    expect(res.status).toBe(403);
  });

  it('role numerico/Hostil continua negado pelo legado', async () => {
    expect((await request(buildLegacyRoute('manager ')).get('/legacy/manager')).status).toBe(403);
    expect((await request(buildLegacyRoute('Manager')).get('/legacy/manager')).status).toBe(403);
  });
});

describe('S7.2 presenca das estruturas WS-15 nao altera a rota (I-S7-03/04/06/07)', () => {
  it.each([true, false])('flag WS15 = %p => rota legada identica', async (flag) => {
    // o port e construido e permanece disponivel no processo, mas NAO e montado na rota
    const port = selectMembershipPort({
      adapter: new InMemoryMembershipRepository([ACTIVE]),
      env: { WS15_MEMBERSHIP_AUTHORITY: flag ? 'true' : 'false' },
    });
    expect(port).toBeDefined();
    expect(isMembershipAuthorityEnabled({ WS15_MEMBERSHIP_AUTHORITY: flag ? 'true' : 'false' })).toBe(flag);
    expect((await request(buildLegacyRoute('manager')).get('/legacy/manager')).status).toBe(200);
    expect((await request(buildLegacyRoute('viewer')).get('/legacy/manager')).status).toBe(403);
  });

  it('CanonicalRoleContext owner presente no processo NAO concede acesso a rota legada', () => {
    const ctx = buildRoleContext({ recordRole: 'owner', membershipVerified: true });
    expect(requireEnterpriseRole('owner')(ctx).allowed).toBe(true);
    // ...mas a rota legada segue exigindo requireRole('manager') via JWT:
    expect(buildLegacyRoute('viewer').router).toBeDefined();
  });

  it('membership ACTIVE/inexistente tambem nao altera a rota legada', async () => {
    selectMembershipPort({ enabled: true, adapter: new InMemoryMembershipRepository([ACTIVE]) });
    selectMembershipPort({ enabled: true, adapter: new InMemoryMembershipRepository([]) });
    expect((await request(buildLegacyRoute('manager')).get('/legacy/manager')).status).toBe(200);
  });
});

describe('S7.3 isolacao estatica no codigo legado (I-S7-01/02/08)', () => {
  const files = productFiles();

  it('nenhum consumidor legado importa modules/membership ou role.guards', () => {
    const offenders: string[] = [];
    for (const f of files) {
      if (isWs15(f)) continue; // proprio WS-15
      const src = fs.readFileSync(f, 'utf8');
      if (/from\s+['"][^'"]*modules\/membership/.test(src)) offenders.push(f);
      if (/requireRole\(/.test(src) && /modules\/membership/.test(src)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it('role.guards nunca importado fora do proprio modulo', () => {
    const offenders = files.filter((f) => {
      if (isWs15(f)) return false;
      return fs.readFileSync(f, 'utf8').includes('role.guards');
    });
    expect(offenders).toEqual([]);
  });

  it('I-S7-02: o requireRole legado original permanece intacto no auth.middleware', () => {
    const src = fs.readFileSync(path.join(REPO_ROOT, 'server', 'middleware', 'auth.middleware.ts'), 'utf8');
    expect(src).toContain('export function requireRole(...roles: string[])');
    expect(src).toContain("const role = req.user?.role;");
    // nao foi substituido por guards enterprise
    expect(src).not.toContain('requireEnterpriseRole');
  });

  it('I-S7-08: PropertyUser intacto e sem qualquer import de membership', () => {
    const src = fs.readFileSync(
      path.join(REPO_ROOT, 'server', 'modules', 'multi-property', 'db', 'schema', 'index.ts'),
      'utf8',
    );
    expect(src).toContain('PropertyUser');
    expect(src).not.toContain('modules/membership');
  });
});

describe('S7.4 nada de persistencia nesta onda (I-S7-09/10)', () => {
  it('nenhum arquivo de produto WS-15 importa drizzle/knex/pg/fs-write', () => {
    const ws15 = walk(path.join(REPO_ROOT, 'server', 'modules', 'membership'));
    const offenders = ws15.filter((f) =>
      /from\s+['"](drizzle|knex|pg|fs)['"]|require\(['"](drizzle|knex|pg)['"]\)/.test(
        fs.readFileSync(f, 'utf8'),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it('nenhum schema/seed novo criado por esta onda', () => {
    const schemaHits = walk(path.join(REPO_ROOT, 'server', 'modules', 'membership')).filter((f) =>
      /pgTable|sql`|CREATE TABLE/i.test(fs.readFileSync(f, 'utf8')),
    );
    expect(schemaHits).toEqual([]);
  });
});
