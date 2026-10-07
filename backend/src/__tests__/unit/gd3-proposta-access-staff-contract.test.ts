/**
 * G-D.3 — proposta-access STAFF_ROLES vs staffAuth allowlist.
 * CODE GO — G-D.3 only. Sem presumir privilégio de `user`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  authorizePropostaIdRead,
  authorizePropostaIdSensitive,
  isPropostaAccessStaffRole,
  isPropostaStaff,
  PROPOSTA_ACCESS_STAFF_ROLES,
} from '../../../../server/modules/propostas/proposta-access';

const repoRoot = join(__dirname, '../../../..');

function readRepo(...parts: string[]): string {
  return readFileSync(join(repoRoot, ...parts), 'utf8');
}

const rowPrivate = {
  id: 99,
  isPublica: false,
  clienteEmail: 'owner@example.com',
  tokenPublico: 'rt-abcdefghijklmnopqrstu',
  titulo: 'Privada',
  status: 'draft',
};

describe('G-D.3 — PROPOSTA_ACCESS_STAFF_ROLES canônico', () => {
  it('Set congelado = admin + manager somente', () => {
    expect([...PROPOSTA_ACCESS_STAFF_ROLES]).toEqual(['admin', 'manager']);
    expect(isPropostaAccessStaffRole('admin')).toBe(true);
    expect(isPropostaAccessStaffRole('manager')).toBe(true);
    expect(isPropostaAccessStaffRole('user')).toBe(false);
    expect(isPropostaAccessStaffRole('supervisor')).toBe(false);
    expect(isPropostaAccessStaffRole('operador')).toBe(false);
    expect(isPropostaAccessStaffRole(undefined)).toBe(false);
  });

  it('user autenticado NÃO é staff de access (assimetría intencional vs staffAuth)', () => {
    const userJwt = { email: 'u@example.com', role: 'user' };
    expect(isPropostaStaff(userJwt)).toBe(false);
    expect(
      authorizePropostaIdRead({ user: userJwt, row: rowPrivate }),
    ).toEqual({ ok: false, status: 404 });
    expect(
      authorizePropostaIdSensitive({ user: userJwt, row: rowPrivate }),
    ).toEqual({ ok: false, status: 404 });
  });

  it('admin/manager permanecem staff de access', () => {
    expect(
      authorizePropostaIdRead({
        user: { email: 'a@example.com', role: 'admin' },
        row: rowPrivate,
      }),
    ).toEqual({ ok: true, mode: 'full' });
    expect(
      authorizePropostaIdRead({
        user: { email: 'm@example.com', role: 'manager' },
        row: rowPrivate,
      }),
    ).toEqual({ ok: true, mode: 'full' });
  });

  it('docs: assimetria staffAuth vs access documentada; staffAuth export intocado', () => {
    const access = readRepo('server/modules/propostas/proposta-access.ts');
    expect(access).toMatch(/G-D\.3/);
    expect(access).toMatch(/OD-GD-02/);
    expect(access).toMatch(/NÃO recebe privilégio/i);
    expect(access).toMatch(/PROPOSTA_ACCESS_STAFF_ROLES/);

    const authMw = readRepo('server/middleware/auth.middleware.ts');
    expect(authMw).toMatch(
      /export const staffAuth = \[authenticateJwt, requireRole\('admin', 'manager', 'user'\)\]/,
    );

    const routes = readRepo('server/modules/propostas/routes/index.ts');
    expect(routes).toMatch(/const agentAuth = staffAuth\s*;/);
    expect(routes).toMatch(/isPropostasAprovador/);
  });
});
