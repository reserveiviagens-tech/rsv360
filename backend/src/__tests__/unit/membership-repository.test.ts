/**
 * WS-15 / S3 — Membership Repository/Adapter (unit).
 * InMemory = TEST DOUBLE. Sem DB, sem Drizzle, sem migration, sem PropertyUser.
 */
import {
  InMemoryMembershipRepository,
  MembershipAuthorityPort,
  type MembershipRecord,
} from '../../../../server/modules/membership';
import { DenyAllMembershipPort } from '../../../../server/modules/multi-property/context/enterprise-membership.port';

const ACTIVE_42: MembershipRecord = {
  subjectUserId: 7,
  internalEnterpriseId: 42,
  status: 'active',
  externalEnterpriseKey: 'ent_42',
};

function port(records: MembershipRecord[] = [ACTIVE_42], adapter?: any) {
  return new MembershipAuthorityPort(adapter ?? new InMemoryMembershipRepository(records));
}

describe('S3.1 prova positiva — unica via para verified=true (I-S3-13)', () => {
  it('ACTIVE do MESMO usuario + MESMA enterprise => verified=true', async () => {
    const v = await port().hasMembership({ userId: 7 }, 'ent_42', 42);
    expect(v.verified).toBe(true);
    expect(v.policy).toBe('lookup');
  });
});

describe('S3.2 estados nao autorizadores (I-S3-01..04)', () => {
  it.each(['inactive', 'suspended', 'revoked', 'not_found'] as const)(
    'status %s => DENY',
    async (status) => {
      const v = await port([{ ...ACTIVE_42, status }]).hasMembership({ userId: 7 }, 'ent_42', 42);
      expect(v.verified).toBe(false);
    },
  );

  it('ausencia de registro => DENY (I-S3-01)', async () => {
    const v = await port([]).hasMembership({ userId: 7 }, 'ent_42', 42);
    expect(v.verified).toBe(false);
  });
});

describe('S3.3 isolamento (I-S3-06, I-S3-07)', () => {
  it('membership de outro usuario => DENY', async () => {
    const v = await port().hasMembership({ userId: 999 }, 'ent_42', 42);
    expect(v.verified).toBe(false);
  });

  it('membership de outra enterprise => DENY', async () => {
    const v = await port().hasMembership({ userId: 7 }, 'ent_99', 99);
    expect(v.verified).toBe(false);
  });
});

describe('S3.4 fail-closed em falha de lookup (I-S3-05)', () => {
  it('adapter que lanca => DENY (nunca ALLOW, nunca propaga excecao)', async () => {
    const boom = { findMembership: async () => { throw new Error('db down'); } };
    const v = await port([], boom).hasMembership({ userId: 7 }, 'ent_42', 42);
    expect(v.verified).toBe(false);
  });

  it('adapter que resolve undefined => DENY', async () => {
    const weird = { findMembership: async () => undefined };
    const v = await port([], weird).hasMembership({ userId: 7 }, 'ent_42', 42);
    expect(v.verified).toBe(false);
  });
});

describe('S3.5 identidade interna e a unica chave (I-S3-08)', () => {
  it('externalKey \'ent_42\' NUNCA e convertida em id 42 pelo adapter', async () => {
    const calls: number[] = [];
    const spy = { findMembership: async (u: number, e: number) => { calls.push(e); return null; } };
    await port([], spy).hasMembership({ userId: 7 }, 'ent_42', 99);
    expect(calls).toEqual([99]); // usa o internalId, não o que a key sugere
  });

  it('internalId null/0 => negacao SEM consultar o adapter', async () => {
    let called = 0;
    const spy = { findMembership: async () => { called += 1; return ACTIVE_42; } };
    const v = await port([], spy).hasMembership({ userId: 7 }, 'ent_42', null);
    expect(v.verified).toBe(false);
    expect(called).toBe(0);
  });

  it('subject invalido => negacao sem consultar o adapter', async () => {
    let called = 0;
    const spy = { findMembership: async () => { called += 1; return ACTIVE_42; } };
    const v = await port([], spy).hasMembership({ userId: 0 }, 'ent_42', 42);
    expect(v.verified).toBe(false);
    expect(called).toBe(0);
  });

  it('eco preserva a external key do servidor', async () => {
    const v = await port().hasMembership({ userId: 7 }, 'ent_42', 42);
    expect(v.externalEnterpriseKey).toBe('ent_42');
  });
});

describe('S3.6 limites de authority (I-S3-09..12)', () => {
  it('adapter nao expoe PropertyUser/propertyId (I-S3-09)', async () => {
    const v = await port().hasMembership({ userId: 7 }, 'ent_42', 42);
    expect(v).not.toHaveProperty('propertyId');
    expect(v).not.toHaveProperty('properties');
  });

  it('adapter nao concede role nem permission (I-S3-11/12)', async () => {
    const v = await port().hasMembership({ userId: 7 }, 'ent_42', 42);
    expect(v).not.toHaveProperty('role');
    expect(v).not.toHaveProperty('permissions');
  });

  it('InMemory e test double: construtor ignora entradas invalidas e nao expoe mutacao', async () => {
    const repo = new InMemoryMembershipRepository([
      ACTIVE_42,
      null as any,
      { subjectUserId: 0, internalEnterpriseId: 42, status: 'active', externalEnterpriseKey: 'x' } as any,
    ]);
    const v = await new MembershipAuthorityPort(repo).hasMembership({ userId: 7 }, 'ent_42', 42);
    expect(v.verified).toBe(true);
    expect(await repo.findMembership(0, 42)).toBeNull();
  });

  it('DenyAll (WS-04) continua negando: authority real nao e plugada por padrao', async () => {
    const v = await new DenyAllMembershipPort().hasMembership({ userId: 7 }, 'ent_42', 42);
    expect(v.verified).toBe(false);
    expect(v.policy).toBe('deny-all');
  });
});
