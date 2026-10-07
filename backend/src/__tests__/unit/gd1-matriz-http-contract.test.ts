/**
 * G-D.1 — Matriz HTTP Propostas (OD-GD-02/03/04).
 * CODE GO — G-D.1 only.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  hasMinRole,
  isPropostasAprovador,
  rankRole,
} from '../../../../server/modules/propostas/rbac';

const repoRoot = join(__dirname, '../../../..');

function readRepo(...parts: string[]): string {
  return readFileSync(join(repoRoot, ...parts), 'utf8');
}

describe('G-D.1 — isPropostasAprovador (OD-GD-04)', () => {
  it('somente admin é aprovador', () => {
    expect(isPropostasAprovador('admin')).toBe(true);
    expect(isPropostasAprovador('supervisor')).toBe(false);
    expect(isPropostasAprovador('manager')).toBe(false);
    expect(isPropostasAprovador('user')).toBe(false);
    expect(isPropostasAprovador('operador')).toBe(false);
    expect(isPropostasAprovador(undefined)).toBe(false);
    expect(isPropostasAprovador(null)).toBe(false);
  });

  it('equivalência histórica: staffAuth roles ∩ hasMinRole(supervisor) ≡ admin', () => {
    const staffAuthRoles = ['admin', 'manager', 'user'] as const;
    for (const role of staffAuthRoles) {
      const legacy = hasMinRole(role, 'supervisor');
      expect(legacy).toBe(isPropostasAprovador(role));
    }
    // supervisor teria rank suficiente no adapter, mas NÃO é aprovador canônico
    expect(hasMinRole('supervisor', 'supervisor')).toBe(true);
    expect(isPropostasAprovador('supervisor')).toBe(false);
  });
});

describe('G-D.1 — static wiring matriz HTTP', () => {
  const routes = readRepo('server/modules/propostas/routes/index.ts');

  it('agentAuth = staffAuth alias (OD-GD-03); staffAuth export global intocado', () => {
    expect(routes).toMatch(/const agentAuth = staffAuth\s*;/);
    expect(routes).toMatch(/OD-GD-03/);
    const authMw = readRepo('server/middleware/auth.middleware.ts');
    expect(authMw).toMatch(
      /export const staffAuth = \[authenticateJwt, requireRole\('admin', 'manager', 'user'\)\]/,
    );
  });

  it('approve/deny usam isPropostasAprovador; não hasMinRole(supervisor)', () => {
    expect(routes).toMatch(/isPropostasAprovador/);
    expect(routes).toMatch(/OD-GD-04/);
    expect(routes).toContain("router.post('/:id/aprovacao/aprovar', ...staffAuth");
    expect(routes).toContain("router.post('/:id/aprovacao/negar', ...staffAuth");
    expect(routes).not.toMatch(/hasMinRole\([^)]*'supervisor'/);
  });

  it('DELETE e HITL usam agentAuth; CRUD staff usa staffAuth', () => {
    expect(routes).toContain("router.delete('/:id', ...agentAuth");
    expect(routes).toContain("router.post('/:id/hitl/takeover', ...agentAuth");
    expect(routes).toContain("router.post('/:id/hitl/release', ...agentAuth");
    expect(routes).toContain("router.post('/', ...staffAuth");
    expect(routes).toContain("router.put('/:id', ...staffAuth");
    expect(routes).toContain("router.post('/:id/aprovacao/solicitar', ...staffAuth");
  });

  it('sem Partner / enterprise authority composition', () => {
    expect(routes).not.toMatch(/parceiroAuth/);
    expect(routes).not.toMatch(/requireEnterpriseRole/);
    expect(routes).not.toMatch(/authorizedEnterpriseContext/);
    expect(routes).not.toMatch(/BROKER_ROLES/);
  });
});

describe('G-D.1 — RANK adapter residual (OD-GD-01) bit-a-bit', () => {
  it('rankRole/hasMinRole inalterados para regressão G-D.0', () => {
    expect(rankRole('admin')).toBe(4);
    expect(rankRole('supervisor')).toBe(3);
    expect(hasMinRole('admin', 'supervisor')).toBe(true);
    expect(hasMinRole('manager', 'supervisor')).toBe(false);
  });
});
