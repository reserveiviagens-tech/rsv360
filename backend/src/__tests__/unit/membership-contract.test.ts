/**
 * WS-15 / S2 — Membership Contract (unit).
 * Contract-only: no DB, no migration, no network, no PropertyUser, no requireRole.
 */
import {
  buildMembershipVerdict,
  isAuthorizingStatus,
  permissionsForRole,
  mapLegacyRoleToCanonical,
  asCanonicalEnterpriseRole,
  listCanonicalRoles,
  DENYING_STATUSES,
  ENTERPRISE_ROLE_RANK,
  type MembershipStatus,
} from '../../../../server/modules/membership';
import {
  DenyAllMembershipPort,
  type MembershipVerdict,
} from '../../../../server/modules/multi-property/context/enterprise-membership.port';

describe('S2.1 taxonomia unica de papeis enterprise', () => {
  it('4 papeis canonicos, hierarquia estrita', () => {
    expect(listCanonicalRoles()).toEqual(['owner', 'admin', 'manager', 'viewer']);
    expect(ENTERPRISE_ROLE_RANK.owner).toBeGreaterThan(ENTERPRISE_ROLE_RANK.admin);
    expect(ENTERPRISE_ROLE_RANK.admin).toBeGreaterThan(ENTERPRISE_ROLE_RANK.manager);
    expect(ENTERPRISE_ROLE_RANK.manager).toBeGreaterThan(ENTERPRISE_ROLE_RANK.viewer);
  });

  it('papeis property-level NAO existem na taxonomia enterprise (I-09/C5)', () => {
    for (const p of ['housekeeper', 'receptionist', 'staff']) {
      expect(asCanonicalEnterpriseRole(p)).toBeNull();
    }
  });

  it('capacidade de papel desconhecido => vazio (I-08, nunca ALLOW)', () => {
    expect(permissionsForRole('admin')).toContain('enterprise.manage');
    expect(permissionsForRole('viewer')).toEqual(['enterprise.read']);
    expect(permissionsForRole('root')).toEqual([]);
    expect(permissionsForRole(null)).toEqual([]);
    expect(permissionsForRole(1)).toEqual([]);
  });
});

describe('S2.2 mapeamento legado -> canonico', () => {
  it('property-user staff=>viewer; housekeeper/receptionist=>null (C5)', () => {
    expect(mapLegacyRoleToCanonical('staff', 'property-user')).toBe('viewer');
    expect(mapLegacyRoleToCanonical('housekeeper', 'property-user')).toBeNull();
    expect(mapLegacyRoleToCanonical('receptionist', 'property-user')).toBeNull();
  });

  it('propostas-rbac mapeia convencao C36 sem promover a contrato', () => {
    expect(mapLegacyRoleToCanonical('user', 'propostas-rbac')).toBe('viewer');
    expect(mapLegacyRoleToCanonical('operador', 'propostas-rbac')).toBe('viewer');
    expect(mapLegacyRoleToCanonical('supervisor', 'propostas-rbac')).toBe('manager');
    expect(mapLegacyRoleToCanonical('admin', 'propostas-rbac')).toBe('admin');
  });

  it('fonte jwt-claim SEMPRE recusada: claim nao promove role (I-07)', () => {
    for (const v of ['admin', 'owner', 'user', 'manager']) {
      expect(mapLegacyRoleToCanonical(v, 'jwt-claim')).toBeNull();
    }
  });

  it('valor desconhecido/nao-string => null', () => {
    expect(mapLegacyRoleToCanonical('root', 'propostas-rbac')).toBeNull();
    expect(mapLegacyRoleToCanonical(42, 'property-user')).toBeNull();
    expect(mapLegacyRoleToCanonical(undefined, 'property-user')).toBeNull();
  });
});

describe('S2.3 status de membership', () => {
  it('somente active autoriza', () => {
    expect(isAuthorizingStatus('active')).toBe(true);
    expect(DENYING_STATUSES).toEqual(['inactive', 'suspended', 'revoked', 'not_found']);
    for (const s of DENYING_STATUSES) expect(isAuthorizingStatus(s)).toBe(false);
    expect(isAuthorizingStatus('unknown')).toBe(false);
    expect(isAuthorizingStatus(null)).toBe(false);
  });
});

describe('S2.4 MembershipVerdict — fail-closed', () => {
  const ok = { subjectUserId: 7, externalKey: 'ent_42', internalId: 42, policy: 'lookup' as const };

  it('ACTIVE + identidade valida + enterprise resolvida => verified=true', () => {
    const v = buildMembershipVerdict({ ...ok, status: 'active' });
    expect(v).toMatchObject({ verified: true, status: 'active', reason: null, subjectUserId: 7, internalEnterpriseId: 42 });
  });

  it.each<MembershipStatus>(['inactive', 'suspended', 'revoked', 'not_found'])(
    'status %s => DENY com motivo proprio',
    (status) => {
      const v = buildMembershipVerdict({ ...ok, status });
      expect(v.verified).toBe(false);
      expect(v.reason).not.toBeNull();
    },
  );

  it('lookup error => DENY (I-06), nunca ALLOW', () => {
    const v = buildMembershipVerdict({ ...ok, status: 'active', lookupFailed: true });
    expect(v.verified).toBe(false);
    expect(v.reason).toBe('lookup-error');
  });

  it('status invalido/desconhecido => DENY (I-05)', () => {
    for (const bad of ['error', 'ACTIVE', '', 'pending', 1, null, undefined, {}]) {
      const v = buildMembershipVerdict({ ...ok, status: bad as MembershipStatus });
      expect(v.verified).toBe(false);
    }
  });

  it('subject invalido => DENY invalid-subject mesmo com active', () => {
    const v = buildMembershipVerdict({ ...ok, subjectUserId: 0, status: 'active' });
    expect(v.verified).toBe(false);
    expect(v.reason).toBe('invalid-subject');
  });

  it('enterprise nao resolvida (internalId null) => DENY', () => {
    const v = buildMembershipVerdict({ ...ok, internalId: null, status: 'active' });
    expect(v.verified).toBe(false);
    expect(v.reason).toBe('unresolved-enterprise');
  });

  it('veredito nunca expoe PropertyUser nem concede papel', () => {
    const v = buildMembershipVerdict({ ...ok, status: 'active' });
    expect(Object.keys(v).sort()).toEqual(
      ['externalEnterpriseKey', 'internalEnterpriseId', 'policy', 'reason', 'status', 'subjectUserId', 'verified'].sort(),
    );
    expect(v).not.toHaveProperty('role');
    expect(v).not.toHaveProperty('permissions');
    expect(v).not.toHaveProperty('propertyId');
  });

  it('sanitiza entradas sem lancar', () => {
    const v = buildMembershipVerdict({ subjectUserId: 'x', externalKey: 5, internalId: 'y', status: 'active', policy: 'lookup' });
    expect(v.subjectUserId).toBe(0);
    expect(v.externalEnterpriseKey).toBe('');
    expect(v.internalEnterpriseId).toBeNull();
    expect(v.verified).toBe(false);
  });
});

describe('S2.5 compatibilidade com o contrato WS-04 (F-2)', () => {
  it('DenyAllMembershipPort continua produzindo veredito fail-closed', async () => {
    const v: MembershipVerdict = await new DenyAllMembershipPort().hasMembership({ userId: 7 }, 'ent_42', 42);
    expect(v.verified).toBe(false);
    expect(v.policy).toBe('deny-all');
    expect(v.subjectUserId).toBe(7);
  });

  it('veredito canonico reduzido ao shape legado continua compativel', () => {
    const canonical = buildMembershipVerdict({
      subjectUserId: 7, externalKey: 'ent_42', internalId: 42, status: 'active', policy: 'lookup',
    });
    const projected: MembershipVerdict = {
      verified: canonical.verified,
      subjectUserId: canonical.subjectUserId,
      externalEnterpriseKey: canonical.externalEnterpriseKey,
      internalEnterpriseId: canonical.internalEnterpriseId,
      policy: canonical.policy,
    };
    expect(projected.verified).toBe(true);
  });
});

