/**
 * WS-04 / S4 — resolver fail-closed (unit). WHAT IS REAL: decisao do resolver.
 * SUBSTITUTED: lookup estatico + DenyAll + port que lanca (fakes). Sem DB/HTTP.
 */
import { resolveEnterpriseContext } from '../../../../server/modules/multi-property/context/enterprise-context.resolver';
import { createStaticEnterpriseKeyLookup } from '../../../../server/modules/multi-property/context/enterprise-key-bridge';
import { DenyAllMembershipPort } from '../../../../server/modules/multi-property/context/enterprise-membership.port';
import type { RequestedEnterpriseContext } from '../../../../server/modules/multi-property/context/enterprise-context.types';

const lookup = () => createStaticEnterpriseKeyLookup({ ent_1: 1, ent_42: 42 });
const denyAll = () => new DenyAllMembershipPort();
const req = (id: string | null, origin: RequestedEnterpriseContext['origin'] = 'query'): RequestedEnterpriseContext | null =>
  id === null && origin === null ? null : { requestedEnterpriseId: id, origin };

describe('S4 matriz — identidade x claim x requested x modo', () => {
  it('identidade valida + claim valido + sem requested (legacy) => authorized, membership false', async () => {
    const r = await resolveEnterpriseContext({ userId: 42, enterpriseClaim: 'ent_42', requested: null, mode: 'legacy', lookup: lookup(), membership: denyAll() });
    expect(r.outcome).toBe('authorized');
    if (r.outcome !== 'authorized') throw new Error('esperado authorized');
    expect(r.status).toBe(200);
    expect(r.resolution.authorizedEnterpriseId).toBe('ent_42');
    expect(r.resolution.internalEnterpriseId).toBe(42);
    expect(r.resolution.membershipVerified).toBe(false);
    expect(r.resolution.source).toBe('jwt_claim');
  });
  it.each([null, undefined, 0, -1, NaN, 'x', {}, []])('subject invalido (%p) => 401 no-identity', async (bad) => {
    const r = await resolveEnterpriseContext({ userId: bad, enterpriseClaim: 'ent_42', requested: null, mode: 'legacy', lookup: lookup(), membership: denyAll() });
    expect(r).toMatchObject({ outcome: 'deny', status: 401, reason: 'no-identity' });
  });
  it.each([null, undefined, ''])('claim ausente (%p) => 403 missing-claim', async (bad) => {
    const r = await resolveEnterpriseContext({ userId: 1, enterpriseClaim: bad, requested: null, mode: 'legacy', lookup: lookup(), membership: denyAll() });
    expect(r).toMatchObject({ outcome: 'deny', status: 403, reason: 'missing-claim' });
  });
  it.each(['foo', ' ent_1', 'ent_1 ', 0, -3, 1.5, {}, []])('claim invalido (%p) => 403 malformed-claim', async (bad) => {
    const r = await resolveEnterpriseContext({ userId: 1, enterpriseClaim: bad, requested: null, mode: 'legacy', lookup: lookup(), membership: denyAll() });
    expect(r).toMatchObject({ outcome: 'deny', status: 403, reason: 'malformed-claim' });
  });
  it('claim numerico legado (42) => authorized source=legacy, id=ent_42', async () => {
    const r = await resolveEnterpriseContext({ userId: 1, enterpriseClaim: 42, requested: null, mode: 'legacy', lookup: lookup(), membership: denyAll() });
    expect(r.outcome).toBe('authorized');
    if (r.outcome !== 'authorized') throw new Error('esperado authorized');
    expect(r.resolution.authorizedEnterpriseId).toBe('ent_42');
    expect(r.resolution.source).toBe('legacy');
  });
  it('enterprise desconhecida (ent_999) => 403 unknown-enterprise, sem fallback', async () => {
    for (const mode of ['legacy', 'enforce'] as const) {
      const r = await resolveEnterpriseContext({ userId: 1, enterpriseClaim: 'ent_999', requested: null, mode, lookup: lookup(), membership: denyAll() });
      expect(r).toMatchObject({ outcome: 'deny', status: 403, reason: 'unknown-enterprise' });
    }
  });
  it('claim != requested em enforce => 403 requested-mismatch', async () => {
    const r = await resolveEnterpriseContext({ userId: 1, enterpriseClaim: 'ent_42', requested: req('ent_1'), mode: 'enforce', lookup: lookup(), membership: denyAll() });
    expect(r).toMatchObject({ outcome: 'deny', status: 403, reason: 'requested-mismatch' });
  });
  it('claim != requested em legacy => authorized pelo CLAIM + mismatch=true', async () => {
    const r = await resolveEnterpriseContext({ userId: 1, enterpriseClaim: 'ent_42', requested: req('ent_1'), mode: 'legacy', lookup: lookup(), membership: denyAll() });
    expect(r.outcome).toBe('authorized');
    if (r.outcome !== 'authorized') throw new Error('esperado authorized');
    expect(r.resolution.authorizedEnterpriseId).toBe('ent_42');
    expect(r.requestedMismatch).toBe(true);
  });

describe('S4 negativos — combinacoes conflitantes e erros', () => {
  it('membership que lanca => 403 membership-error (fail-closed)', async () => {
    const broken = { hasMembership: async () => { throw new Error('port down'); } };
    const r = await resolveEnterpriseContext({ userId: 1, enterpriseClaim: 'ent_1', requested: null, mode: 'legacy', lookup: lookup(), membership: broken as never });
    expect(r).toMatchObject({ outcome: 'deny', status: 403, reason: 'membership-error' });
  });
  it('requested malformado => sanitizado p/ null, sem throw', async () => {
    const r = await resolveEnterpriseContext({ userId: 1, enterpriseClaim: 'ent_1', requested: { requestedEnterpriseId: 1, origin: 'x' } as never, mode: 'legacy', lookup: lookup(), membership: denyAll() });
    expect(r.outcome).toBe('authorized');
  });
  it('modo desconhecido => tratado como legacy (fail-explicit, sem permissividade extra)', async () => {
    const r = await resolveEnterpriseContext({ userId: 1, enterpriseClaim: 'ent_1', requested: req('ent_42'), mode: 'weird' as never, lookup: lookup(), membership: denyAll() });
    expect(r.outcome).toBe('authorized');
    if (r.outcome !== 'authorized') throw new Error('esperado authorized');
    expect(r.requestedMismatch).toBe(true);
  });
  it('veredito verified=true (WS-15 futuro) => membershipVerified=true preservado', async () => {
    const allow = { hasMembership: async () => ({ verified: true, subjectUserId: 1, externalEnterpriseKey: 'ent_1', internalEnterpriseId: 1, policy: 'lookup' as const }) };
    const r = await resolveEnterpriseContext({ userId: 1, enterpriseClaim: 'ent_1', requested: null, mode: 'enforce', lookup: lookup(), membership: allow as never });
    expect(r.outcome).toBe('authorized');
    if (r.outcome !== 'authorized') throw new Error('esperado authorized');
    expect(r.resolution.membershipVerified).toBe(true);
  });
  it('cross-enterprise: claim ent_1 + requested ent_42 em enforce => DENY (nao autoriza requested)', async () => {
    const r = await resolveEnterpriseContext({ userId: 1, enterpriseClaim: 'ent_1', requested: req('ent_42', 'header'), mode: 'enforce', lookup: lookup(), membership: denyAll() });
    expect(r).toMatchObject({ outcome: 'deny', status: 403, reason: 'requested-mismatch' });
  });
});
  it('membership=false NAO nega: authorized com membershipVerified=false', async () => {
    const r = await resolveEnterpriseContext({ userId: 1, enterpriseClaim: 'ent_1', requested: req('ent_1'), mode: 'enforce', lookup: lookup(), membership: denyAll() });
    expect(r.outcome).toBe('authorized');
    if (r.outcome !== 'authorized') throw new Error('esperado authorized');
    expect(r.resolution.membershipVerified).toBe(false);
  });
});
