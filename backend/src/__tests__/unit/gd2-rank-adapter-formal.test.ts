/**
 * G-D.2 — Formalizar RANK local adapter (OD-GD-01 residual).
 * Sem mudança semântica de ranks / hasMinRole.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  hasMinRole,
  isPropostasAprovador,
  PROPOSTAS_LOCAL_ROLE_RANK,
  PROPOSTAS_RANK_IS_LOCAL_ADAPTER,
  rankRole,
} from '../../../../server/modules/propostas/rbac';
import { ENTERPRISE_ROLE_RANK } from '../../../../server/modules/membership/membership.types';

const repoRoot = join(__dirname, '../../../..');

function readRepo(...parts: string[]): string {
  return readFileSync(join(repoRoot, ...parts), 'utf8');
}

describe('G-D.2 — PROPOSTAS_LOCAL_ROLE_RANK formalizado', () => {
  it('mapa congelado bit-a-bit + marker local adapter', () => {
    expect(PROPOSTAS_RANK_IS_LOCAL_ADAPTER).toBe(true);
    expect(PROPOSTAS_LOCAL_ROLE_RANK).toEqual({
      user: 1,
      operador: 2,
      manager: 2,
      supervisor: 3,
      admin: 4,
    });
    expect(Object.isFrozen(PROPOSTAS_LOCAL_ROLE_RANK)).toBe(true);
    expect(rankRole('admin')).toBe(PROPOSTAS_LOCAL_ROLE_RANK.admin);
    expect(hasMinRole('manager', 'supervisor')).toBe(false);
    expect(hasMinRole('admin', 'supervisor')).toBe(true);
  });

  it('RANK adapter ≠ aprovador canônico ≠ enterprise rank', () => {
    expect(isPropostasAprovador('supervisor')).toBe(false);
    expect(hasMinRole('supervisor', 'supervisor')).toBe(true);
    expect(rankRole('admin')).not.toBe(ENTERPRISE_ROLE_RANK.admin);
    expect(
      Object.prototype.hasOwnProperty.call(ENTERPRISE_ROLE_RANK, 'supervisor'),
    ).toBe(false);
  });

  it('static: G-D.2 docs; approve routes não usam hasMinRole', () => {
    const rbac = readRepo('server/modules/propostas/rbac.ts');
    expect(rbac).toMatch(/G-D\.2/);
    expect(rbac).toMatch(/PROPOSTAS_LOCAL_ROLE_RANK/);
    expect(rbac).toMatch(/PROPOSTAS_RANK_IS_LOCAL_ADAPTER/);
    expect(rbac).toMatch(/Aprovação\/negação HTTP NÃO usa mais/);

    const routes = readRepo('server/modules/propostas/routes/index.ts');
    expect(routes).toMatch(/isPropostasAprovador/);
    expect(routes).not.toMatch(/hasMinRole\(/);
  });
});
