/**
 * WS-15 / S6 — Enterprise Role Guards (unit).
 * Guards consomem SOMENTE CanonicalRoleContext. Nunca req.user.role / PropertyUser.role.
 */
import {
  buildRoleContext,
  requireEnterpriseRole,
  requireEnterprisePermission,
  isAllowed,
  type CanonicalRoleContext,
} from '../../../../server/modules/membership';
import type { EnterpriseRole } from '../../../../server/modules/membership';

function ctx(role: EnterpriseRole, verified = true): CanonicalRoleContext {
  return buildRoleContext({ recordRole: role, membershipVerified: verified });
}

describe('S6.1 guard consome somente CanonicalRoleContext (I-S6-01/02/03)', () => {
  it('a assinatura do guard aceita apenas o contexto — nenhum carrier HTTP', () => {
    expect(requireEnterpriseRole('manager').length).toBe(1);
    expect(requireEnterprisePermission('enterprise.read').length).toBe(1);
  });

  it('um objeto req-like (com user.role) NAO autoriza: guard ignora campos alheios', () => {
    const forged = { role: 'owner', roleVerified: false, permissions: ['enterprise.manage'] } as unknown as CanonicalRoleContext;
    expect(requireEnterpriseRole('owner')(forged).allowed).toBe(false);
    expect(requireEnterpriseRole('owner')(forged).reason).toBe('unverified-role');
  });

  it('string crua ou objeto invalido => DENY', () => {
    const g = requireEnterpriseRole('viewer');
    expect(g('admin' as never).allowed).toBe(false);
    expect(g({} as never).allowed).toBe(false);
    expect(g([] as never).allowed).toBe(false);
  });
});

describe('S6.2 negacoes por contexto (I-S6-04/05/06/11)', () => {
  it('contexto ausente => DENY missing-context', () => {
    const g = requireEnterpriseRole('viewer');
    expect(g(null).reason).toBe('missing-context');
    expect(g(undefined).reason).toBe('missing-context');
  });

  it('role desconhecido => DENY unknown-role', () => {
    const forged = { role: 'root', roleVerified: true, permissions: [] } as unknown as CanonicalRoleContext;
    const out = requireEnterpriseRole('viewer')(forged);
    expect(out.allowed).toBe(false);
    expect(out.reason).toBe('unknown-role');
  });

  it('roleVerified=false => DENY unverified-role (mesmo com owner)', () => {
    expect(ctx('owner', false).roleVerified).toBe(false);
    expect(requireEnterpriseRole('owner')(ctx('owner', false)).reason).toBe('unverified-role');
  });

  it('membershipVerified=false => contexto sem papel => DENY (I-S6-11)', () => {
    const empty = buildRoleContext({ recordRole: 'owner', membershipVerified: false });
    expect(empty.role).toBeNull();
    expect(requireEnterpriseRole('owner')(empty).allowed).toBe(false);
  });
});

describe('S6.3 hierarquia (I-S6-07..10)', () => {
  const cases: Array<[EnterpriseRole, EnterpriseRole, boolean]> = [
    ['viewer', 'manager', false],
    ['viewer', 'admin', false],
    ['viewer', 'owner', false],
    ['manager', 'manager', true],
    ['manager', 'admin', false],
    ['manager', 'owner', false],
    ['admin', 'manager', true],
    ['admin', 'admin', true],
    ['admin', 'owner', false],
    ['owner', 'viewer', true],
    ['owner', 'manager', true],
    ['owner', 'admin', true],
    ['owner', 'owner', true],
  ];
  it.each(cases)('%s vs minimum %s => %p', (role, minimum, expected) => {
    const out = requireEnterpriseRole(minimum)(ctx(role));
    expect(out.allowed).toBe(expected);
  });
});

describe('S6.4 guard de capacidade (I-S6-12)', () => {
  it('permission e arguendo de codigo: viewer nao gerencia', () => {
    expect(requireEnterprisePermission('enterprise.read')(ctx('viewer')).allowed).toBe(true);
    expect(requireEnterprisePermission('enterprise.manage')(ctx('viewer')).reason).toBe('missing-permission');
  });

  it('admin gerencia; viewer nao; owner gerencia', () => {
    expect(requireEnterprisePermission('enterprise.manage')(ctx('admin')).allowed).toBe(true);
    expect(requireEnterprisePermission('user.manage')(ctx('owner')).allowed).toBe(true);
    expect(requireEnterprisePermission('user.manage')(ctx('manager')).allowed).toBe(false);
  });

  it('capacidade NAO vem do cliente: contexto forjado sem permissions => DENY', () => {
    const forged = { role: 'owner', roleVerified: true, permissions: undefined } as unknown as CanonicalRoleContext;
    expect(requireEnterprisePermission('enterprise.manage')(forged).reason).toBe('missing-permission');
  });

  it('roleContextAllows nao e segunda autoridade: permissoes derivam do papel (S2/S5)', () => {
    // um contexto com permissions infladas mas papel vazio nao autoriza
    const forged = { role: null, roleVerified: true, permissions: ['enterprise.manage'] } as unknown as CanonicalRoleContext;
    expect(requireEnterprisePermission('enterprise.manage')(forged).allowed).toBe(false);
  });
});

describe('S6.5 helper booleano', () => {
  it('isAllowed reflete a mesma matriz', () => {
    expect(isAllowed(requireEnterpriseRole('admin'), ctx('admin'))).toBe(true);
    expect(isAllowed(requireEnterpriseRole('admin'), ctx('viewer'))).toBe(false);
    expect(isAllowed(requireEnterpriseRole('viewer'), null)).toBe(false);
  });
});
