/**
 * G-D.6 / OD-GD-11 / PA-DEC-006 — Economic Authority composition (Propostas).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  canMutatePropostaEconomicFields,
  normalizeValorTotalCap,
  payloadTouchesValorTotal,
} from '../../../../server/modules/propostas/economic-authority';
import { isPropostasAprovador } from '../../../../server/modules/propostas/rbac';

const repoRoot = join(__dirname, '../../../..');

function readRepo(...parts: string[]): string {
  return readFileSync(join(repoRoot, ...parts), 'utf8');
}

describe('G-D.6 — economic actor + caps', () => {
  it('somente admin muta campos econômicos (Role ∩ Economic)', () => {
    expect(canMutatePropostaEconomicFields('admin')).toBe(true);
    expect(canMutatePropostaEconomicFields('manager')).toBe(false);
    expect(canMutatePropostaEconomicFields('user')).toBe(false);
    expect(canMutatePropostaEconomicFields('supervisor')).toBe(false);
    expect(canMutatePropostaEconomicFields(undefined)).toBe(false);
    // alinhado ao aprovador OD-GD-04
    expect(canMutatePropostaEconomicFields('admin')).toBe(isPropostasAprovador('admin'));
  });

  it('caps: finito >= 0; body valor não é autoridade', () => {
    expect(normalizeValorTotalCap(100)).toEqual({ ok: true, valorTotal: '100' });
    expect(normalizeValorTotalCap('12.5')).toEqual({ ok: true, valorTotal: '12.5' });
    expect(normalizeValorTotalCap(0)).toEqual({ ok: true, valorTotal: '0' });
    expect(normalizeValorTotalCap(-1).ok).toBe(false);
    expect(normalizeValorTotalCap(Number.NaN).ok).toBe(false);
    expect(normalizeValorTotalCap(Number.POSITIVE_INFINITY).ok).toBe(false);
    expect(payloadTouchesValorTotal({ valorTotal: 1 })).toBe(true);
    expect(payloadTouchesValorTotal({})).toBe(false);
  });

  it('static: create/update/from-orcamento/aprovar usam economic gate; sem gateway', () => {
    const routes = readRepo('server/modules/propostas/routes/index.ts');
    expect(routes).toMatch(/canMutatePropostaEconomicFields/);
    expect(routes).toMatch(/normalizeValorTotalCap/);
    expect(routes).toMatch(/PA-DEC-006/);
    expect(routes).toMatch(/G-D\.6/);
    expect(routes).not.toMatch(/RefundService|PayoutService|payment\.gateway/i);

    const econ = readRepo('server/modules/propostas/economic-authority.ts');
    expect(econ).toMatch(/OD-GD-11/);
    expect(econ).toMatch(/Partner Authority = N\/A/);
    expect(econ).toMatch(/DEFER G-E\/E-13/);
    expect(econ).toMatch(/NÃO é autoridade/);
  });

  it('não-regressão contratos fechados (static)', () => {
    const routes = readRepo('server/modules/propostas/routes/index.ts');
    expect(routes).toMatch(/const agentAuth = staffAuth\s*;/);
    expect(routes).toMatch(/resolveIndicadorIdFromAuth/);
    expect(routes).toMatch(/isPropostasAprovador/);

    const access = readRepo('server/modules/propostas/proposta-access.ts');
    expect(access).toMatch(/PROPOSTA_ACCESS_STAFF_ROLES/);

    const authMw = readRepo('server/middleware/auth.middleware.ts');
    expect(authMw).toMatch(
      /export const staffAuth = \[authenticateJwt, requireRole\('admin', 'manager', 'user'\)\]/,
    );
  });
});
