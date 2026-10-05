/**
 * WS-15 / S4 — Membership Authority Plug (integration, TEST-ONLY).
 * Prova o isolamento entre os DOIS caminhos: flag OFF => DenyAll; flag ON => S3 authority.
 */
import request from 'supertest';
import express from 'express';
import {
  selectMembershipPort,
  isMembershipAuthorityEnabled,
  InMemoryMembershipRepository,
  MembershipAuthorityPort,
  type MembershipRecord,
} from '../../../../server/modules/membership';
import { resolveEnterpriseContext } from '../../../../server/modules/multi-property/context/enterprise-context.resolver';
import { createStaticEnterpriseKeyLookup } from '../../../../server/modules/multi-property/context/enterprise-key-bridge';
import { DenyAllMembershipPort } from '../../../../server/modules/multi-property/context/enterprise-membership.port';

const ACTIVE: MembershipRecord = {
  subjectUserId: 7,
  internalEnterpriseId: 42,
  status: 'active',
  externalEnterpriseKey: 'ent_42',
};
const BOOM = { findMembership: async () => { throw new Error('db down'); } };

describe('S4.1 leitura da flag (fail-safe)', () => {
  it.each([
    [{ WS15_MEMBERSHIP_AUTHORITY: 'true' }, true],
    [{ WS15_MEMBERSHIP_AUTHORITY: 'TRUE' }, true],
    [{ WS15_MEMBERSHIP_AUTHORITY: ' true ' }, true],
    [{ WS15_MEMBERSHIP_AUTHORITY: '1' }, false],
    [{ WS15_MEMBERSHIP_AUTHORITY: 'yes' }, false],
    [{ WS15_MEMBERSHIP_AUTHORITY: true }, false],
    [{ WS15_MEMBERSHIP_AUTHORITY: false }, false],
    [{}, false],
  ])('env %p => enabled %p', (env, expected) => {
    expect(isMembershipAuthorityEnabled(env as any)).toBe(expected);
  });

  it('env nulo/ausente/invalido => false', () => {
    expect(isMembershipAuthorityEnabled(null)).toBe(false);
    expect(isMembershipAuthorityEnabled(undefined)).toBe(false);
    expect(isMembershipAuthorityEnabled('nope' as any)).toBe(false);
  });
});

describe('S4.2 selecao do port: default e DenyAll', () => {
  it('flag OFF => DenyAllMembershipPort (mesmo com membership existente)', () => {
    const p = selectMembershipPort({ adapter: new InMemoryMembershipRepository([ACTIVE]), env: {} });
    expect(p).toBeInstanceOf(DenyAllMembershipPort);
  });

  it('flag invalida => DenyAll', () => {
    const p = selectMembershipPort({ adapter: new InMemoryMembershipRepository([ACTIVE]), env: { WS15_MEMBERSHIP_AUTHORITY: 'sim' } });
    expect(p).toBeInstanceOf(DenyAllMembershipPort);
  });

  it('flag ON mas SEM adapter => degrada para DenyAll (nao lanca, nao autoriza)', () => {
    const p = selectMembershipPort({ enabled: true });
    expect(p).toBeInstanceOf(DenyAllMembershipPort);
  });

  it('flag ON + adapter => MembershipAuthorityPort', () => {
    const p = selectMembershipPort({ enabled: true, adapter: new InMemoryMembershipRepository([ACTIVE]) });
    expect(p).toBeInstanceOf(MembershipAuthorityPort);
  });
});

describe('S4.3 isolamento dos dois caminhos via resolver (matriz intacta)', () => {
  const lookup = createStaticEnterpriseKeyLookup({ ent_42: 42 });
  const run = (port: any, claim: unknown = 'ent_42', userId: unknown = 7) =>
    resolveEnterpriseContext({
      userId, enterpriseClaim: claim, requested: null, mode: 'legacy', lookup, membership: port,
    });

  it('flag OFF + membership ACTIVE => ainda DenyAll => membershipVerified=false', async () => {
    const port = selectMembershipPort({ adapter: new InMemoryMembershipRepository([ACTIVE]), enabled: false });
    const res = await run(port);
    expect(res.outcome).toBe('authorized');
    expect(res.resolution.membershipVerified).toBe(false);
  });

  it('flag ON + membership ACTIVE => membershipVerified=true', async () => {
    const port = selectMembershipPort({ adapter: new InMemoryMembershipRepository([ACTIVE]), enabled: true });
    const res = await run(port);
    expect(res.outcome).toBe('authorized');
    expect(res.membership.verified).toBe(true);
    expect(res.resolution.membershipVerified).toBe(true);
  });

  it('flag ON + membership INEXISTENTE => verified=false, contexto ainda autorizado', async () => {
    const port = selectMembershipPort({ adapter: new InMemoryMembershipRepository([]), enabled: true });
    const res = await run(port);
    expect(res.resolution.membershipVerified).toBe(false);
  });

  it('flag ON + adapter que LANCA => verified=false, sem excecao propagada', async () => {
    const port = selectMembershipPort({ adapter: BOOM as any, enabled: true });
    const res = await run(port);
    expect(res.resolution.membershipVerified).toBe(false);
    expect(res.membership.policy).toBe('lookup');
  });

  it('flag ON + claim de outra enterprise => continua 403 unknown-enterprise', async () => {
    const port = selectMembershipPort({ adapter: new InMemoryMembershipRepository([ACTIVE]), enabled: true });
    const res = await run(port, 'ent_999');
    expect(res.outcome).toBe('deny');
    expect(res.reason).toBe('unknown-enterprise');
  });

  it('flag ON + usuario diferente da membership => verified=false', async () => {
    const port = selectMembershipPort({ adapter: new InMemoryMembershipRepository([ACTIVE]), enabled: true });
    const res = await run(port, 'ent_42', 999);
    expect(res.resolution.membershipVerified).toBe(false);
  });

  it('flag ON + claim ausente => 403 missing-claim (matriz WS-04 preservada)', async () => {
    const port = selectMembershipPort({ adapter: new InMemoryMembershipRepository([ACTIVE]), enabled: true });
    const res = await run(port, null); // null explicito: default de parametro nao se aplica
    expect(res.outcome).toBe('deny');
    expect(res.reason).toBe('missing-claim');
  });

  it('flag ON: veredito nunca expoe role/permission (adapter nao concede autoridade)', async () => {
    const port = selectMembershipPort({ adapter: new InMemoryMembershipRepository([ACTIVE]), enabled: true });
    const res = await run(port);
    expect(res.membership).not.toHaveProperty('role');
    expect(res.membership).not.toHaveProperty('permissions');
    expect(res.resolution).not.toHaveProperty('role');
  });
});

describe('S4.4 HTTP: probe com o port selecionado', () => {
  const lookup = createStaticEnterpriseKeyLookup({ ent_42: 42 });
  const build = (enabled: boolean) => {
    const app = express();
    app.get('/probe', async (req, res) => {
      const port = selectMembershipPort({ adapter: new InMemoryMembershipRepository([ACTIVE]), enabled });
      const out = await resolveEnterpriseContext({
        userId: 7, enterpriseClaim: req.query.claim, requested: null, mode: 'legacy', lookup, membership: port,
      });
      res.status(out.status).json({ outcome: out.outcome, verified: out.outcome === 'authorized' ? out.resolution.membershipVerified : null });
    });
    return app;
  };

  it('flag OFF => verified=false (DenyAll, comportamento WS-04)', async () => {
    const res = await request(build(false)).get('/probe').query({ claim: 'ent_42' });
    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(false);
  });

  it('flag ON => verified=true somente com membership ativa', async () => {
    const res = await request(build(true)).get('/probe').query({ claim: 'ent_42' });
    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
  });

  it('flag ON + spoof de claim (enterprise inexistente) => 403', async () => {
    const res = await request(build(true)).get('/probe').query({ claim: 'ent_777' });
    expect(res.status).toBe(403);
    expect(res.body.verified).toBeNull();
  });
});

