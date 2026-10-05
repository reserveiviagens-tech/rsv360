/**
 * WS-15 / S5 — Canonical Role Context (unit).
 * Invariante central: `role` NUNCA altera `verified`; `verified` NUNCA depende de `role`.
 */
import {
  buildRoleContext,
  roleContextAllows,
  InMemoryMembershipRepository,
  MembershipAuthorityPort,
  selectMembershipPort,
  type MembershipRecord,
} from '../../../../server/modules/membership';
import { resolveEnterpriseContext } from '../../../../server/modules/multi-property/context/enterprise-context.resolver';
import { createStaticEnterpriseKeyLookup } from '../../../../server/modules/multi-property/context/enterprise-key-bridge';
import type { EnterpriseRole, MembershipStatus } from '../../../../server/modules/membership';

const OWNER = 'owner';
const LOOKUP = createStaticEnterpriseKeyLookup({ ent_42: 42 });

function record(status: MembershipStatus, role: unknown): MembershipRecord {
  return {
    subjectUserId: 7,
    internalEnterpriseId: 42,
    status,
    externalEnterpriseKey: 'ent_42',
    ...({ role } as object),
  } as MembershipRecord;
}

async function verifyThroughPlug(status: MembershipStatus, role: unknown) {
  const port = selectMembershipPort({
    enabled: true,
    adapter: new InMemoryMembershipRepository([record(status, role)]),
  });
  return resolveEnterpriseContext({
    userId: 7,
    enterpriseClaim: 'ent_42',
    requested: null,
    mode: 'legacy',
    lookup: LOOKUP,
    membership: port,
  });
}

describe('S5.1 taxonomia aplicada ao contexto', () => {
  it.each<EnterpriseRole>(['owner', 'admin', 'manager', 'viewer'])('papel %s => contexto canonico', (role) => {
    const ctx = buildRoleContext({ recordRole: role, membershipVerified: true });
    expect(ctx.role).toBe(role);
    expect(ctx.roleVerified).toBe(true);
    expect(ctx.source).toBe('membership-record');
  });

  it('papel ausente/desconhecido => contexto vazio (sem erro, sem autoridade)', () => {
    for (const bad of [undefined, null, 'root', 'admin ', '', 1, {}]) {
      const ctx = buildRoleContext({ recordRole: bad, membershipVerified: true });
      expect(ctx.role).toBeNull();
      expect(ctx.permissions).toEqual([]);
      expect(ctx.roleVerified).toBe(false);
    }
  });

  it('legado reconciliado; jwt-claim recusado (I-07)', () => {
    expect(buildRoleContext({ legacyRole: 'supervisor', legacySource: 'propostas-rbac', membershipVerified: true }).role).toBe('manager');
    expect(buildRoleContext({ legacyRole: 'admin', legacySource: 'jwt-claim', membershipVerified: true }).role).toBeNull();
  });

  it('sem membership verificada => nenhum papel exposto (fail-closed de apresentacao)', () => {
    expect(buildRoleContext({ recordRole: OWNER, membershipVerified: false }).role).toBeNull();
  });

  it('capacidade: papel desconhecido nunca concede', () => {
    const empty = buildRoleContext({ membershipVerified: true });
    expect(roleContextAllows(empty, 'enterprise.manage')).toBe(false);
    const viewer = buildRoleContext({ recordRole: 'viewer', membershipVerified: true });
    expect(roleContextAllows(viewer, 'enterprise.read')).toBe(true);
    expect(roleContextAllows(viewer, 'enterprise.manage')).toBe(false);
  });
});

describe('S5.2 MATRIZ BLOQUEADORA — role NUNCA altera verified', () => {
  it.each<EnterpriseRole>(['owner', 'admin', 'manager', 'viewer'])(
    'ACTIVE + role %s => verified=true',
    async (role) => {
      const out = await verifyThroughPlug('active', role);
      expect(out.outcome).toBe('authorized');
      expect(out.resolution.membershipVerified).toBe(true);
      expect(buildRoleContext({ recordRole: role, membershipVerified: out.resolution.membershipVerified }).role).toBe(role);
    },
  );

  it('ACTIVE + role undefined => verified=true (role nao invalida membership valida)', async () => {
    const out = await verifyThroughPlug('active', undefined);
    expect(out.resolution.membershipVerified).toBe(true);
    const ctx = buildRoleContext({ membershipVerified: out.resolution.membershipVerified });
    expect(ctx.role).toBeNull();
    expect(ctx.permissions).toEqual([]);
  });

  it('ACTIVE + role invalido => verified=true, contexto vazio', async () => {
    const out = await verifyThroughPlug('active', 'root');
    expect(out.resolution.membershipVerified).toBe(true);
    expect(buildRoleContext({ recordRole: 'root', membershipVerified: true }).role).toBeNull();
  });

  it.each(['inactive', 'revoked', 'suspended', 'not_found'] as MembershipStatus[])(
    '%s + role owner => verified=false (owner nao ressuscita)',
    async (status) => {
      const out = await verifyThroughPlug(status, OWNER);
      expect(out.resolution.membershipVerified).toBe(false);
      expect(buildRoleContext({ recordRole: OWNER, membershipVerified: out.resolution.membershipVerified }).role).toBeNull();
    },
  );

  it('lookup error + role owner => verified=false', async () => {
    const port = new MembershipAuthorityPort(
      { findMembership: async () => { throw new Error('db down'); } } as never,
    );
    const out = await resolveEnterpriseContext({
      userId: 7, enterpriseClaim: 'ent_42', requested: null, mode: 'legacy', lookup: LOOKUP, membership: port,
    });
    expect(out.resolution.membershipVerified).toBe(false);
  });

  it('usuario diferente + role owner => verified=false', async () => {
    const port = selectMembershipPort({
      enabled: true,
      adapter: new InMemoryMembershipRepository([
        { subjectUserId: 7, internalEnterpriseId: 42, status: 'active', externalEnterpriseKey: 'ent_42' } as MembershipRecord,
      ]),
    });
    const out = await resolveEnterpriseContext({
      userId: 999, enterpriseClaim: 'ent_42', requested: null, mode: 'legacy', lookup: LOOKUP, membership: port,
    });
    expect(out.resolution.membershipVerified).toBe(false);
  });

  it('contexto enterprise NAO ganha campo role (separacao formal)', async () => {
    const out = await verifyThroughPlug('active', OWNER);
    expect(out.resolution).not.toHaveProperty('role');
    expect(out.resolution).not.toHaveProperty('permissions');
    expect(Object.keys(out.resolution).sort()).toEqual(
      ['authorizedEnterpriseId', 'internalEnterpriseId', 'membershipVerified', 'source'].sort(),
    );
  });
});

