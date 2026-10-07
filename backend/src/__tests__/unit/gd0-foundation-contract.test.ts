/**
 * G-D.0 — Foundation / RANK adapter / boundary contracts.
 * CODE GO — G-D.0 only. No runtime authz semantic change.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hasMinRole, rankRole } from '../../../../server/modules/propostas/rbac';
import { ENTERPRISE_ROLE_RANK } from '../../../../server/modules/membership/membership.types';

const repoRoot = join(__dirname, '../../../..');

function readRepo(...parts: string[]): string {
  return readFileSync(join(repoRoot, ...parts), 'utf8');
}

describe('G-D.0 — RANK local adapter (OD-GD-01) bit-a-bit', () => {
  it('preserva ranks legados de propostas', () => {
    expect(rankRole('user')).toBe(1);
    expect(rankRole('operador')).toBe(2);
    expect(rankRole('manager')).toBe(2);
    expect(rankRole('supervisor')).toBe(3);
    expect(rankRole('admin')).toBe(4);
    expect(rankRole(undefined)).toBe(0);
    expect(rankRole('desconhecido')).toBe(0);
  });

  it('preserva predicates hasMinRole legados', () => {
    expect(hasMinRole('supervisor', 'operador')).toBe(true);
    expect(hasMinRole('operador', 'supervisor')).toBe(false);
    expect(hasMinRole('admin', 'supervisor')).toBe(true);
    expect(hasMinRole('manager', 'supervisor')).toBe(false);
    expect(hasMinRole('admin', 'admin')).toBe(true);
  });

  it('documenta adapter local OD-GD-01 (não contrato global)', () => {
    const src = readRepo('server/modules/propostas/rbac.ts');
    expect(src).toMatch(/OD-GD-01/);
    expect(src).toMatch(/adapter local/i);
    expect(src).toMatch(/NÃO é[\s\S]*contrato global/i);
    expect(src).toMatch(/ENTERPRISE_ROLE_RANK/);
    expect(src).toMatch(/bit-a-bit legado/);
  });
});

describe('G-D.0 — RANK local ≠ Enterprise Role Rank', () => {
  it('mapas são namespaces distintos (propostas vs membership)', () => {
    // Enterprise canônico: viewer/manager/admin/owner — sem user/operador/supervisor
    expect(ENTERPRISE_ROLE_RANK).toEqual({
      viewer: 1,
      manager: 2,
      admin: 3,
      owner: 4,
    });
    // Mesmo rótulo "admin" NÃO compartilha o mesmo rank numérico entre adapters
    expect(rankRole('admin')).toBe(4);
    expect(ENTERPRISE_ROLE_RANK.admin).toBe(3);
    expect(rankRole('admin')).not.toBe(ENTERPRISE_ROLE_RANK.admin);
    // Roles só do adapter local
    expect(rankRole('supervisor')).toBe(3);
    expect(rankRole('operador')).toBe(2);
    expect(rankRole('user')).toBe(1);
    expect(
      Object.prototype.hasOwnProperty.call(ENTERPRISE_ROLE_RANK, 'supervisor'),
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(ENTERPRISE_ROLE_RANK, 'operador'),
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(ENTERPRISE_ROLE_RANK, 'user'),
    ).toBe(false);
  });
});

describe('G-D.0 — boundary Partner agente ≠ AI ≠ agentAuth (OD-GD-06)', () => {
  it('agentAuth em propostas é alias estrutural de staffAuth (OD-GD-03)', () => {
    const routes = readRepo('server/modules/propostas/routes/index.ts');
    const authMw = readRepo('server/middleware/auth.middleware.ts');
    expect(authMw).toMatch(
      /export const staffAuth = \[authenticateJwt, requireRole\('admin', 'manager', 'user'\)\]/,
    );
    // G-D.1 materializa alias: agentAuth = staffAuth (não set distinto)
    expect(routes).toMatch(/const agentAuth = staffAuth\s*;/);
    expect(routes).toMatch(/OD-GD-03/);
    // Sem composição Partner no router de propostas
    expect(routes).not.toMatch(/parceiroAuth/);
    expect(routes).not.toMatch(/BROKER_ROLES/);
    expect(routes).not.toMatch(/requireEnterpriseRole/);
  });

  it('módulo AI agentes não usa agentAuth nem Partner broker roles', () => {
    const agentesRoutes = readRepo('server/modules/agentes/routes/index.ts');
    expect(agentesRoutes).not.toMatch(/agentAuth/);
    expect(agentesRoutes).not.toMatch(/parceiroAuth/);
    expect(agentesRoutes).not.toMatch(/BROKER_ROLES/);
    expect(agentesRoutes).toMatch(/authenticateJwt/);
    expect(agentesRoutes).toMatch(/resolvePapel/);
  });

  it('rbac propostas documenta exclusão de Partner Authority', () => {
    const src = readRepo('server/modules/propostas/rbac.ts');
    expect(src).toMatch(/Partner Authority/);
    expect(src).toMatch(/agentAuth/);
  });
});
