/**
 * WS-04 / S3 — EnterpriseMembershipPort + DenyAll (unit).
 *
 * WHAT IS REAL: o contrato do port + a politica DenyAll.
 * WHAT IS SUBSTITUTED: nada de DB/membership real — DenyAll e a implementacao
 * transitória ate WS-15. Estes testes provam a DECISAO de negacao, nao infra.
 */
import {
  DenyAllMembershipPort,
  type EnterpriseMembershipPort,
} from '../../../../server/modules/multi-property/context/enterprise-membership.port';

describe('S3 port — DenyAll nunca autoriza', () => {
  it('membership ausente -> verified=false (DENY no caller)', async () => {
    const port: EnterpriseMembershipPort = new DenyAllMembershipPort();
    const verdict = await port.hasMembership({ userId: 42 }, 'ent_42', 42);
    expect(verdict.verified).toBe(false);
    expect(verdict.policy).toBe('deny-all');
  });

  it('DenyAll -> verified=false para qualquer combinacao valida', async () => {
    const port = new DenyAllMembershipPort();
    for (const [userId, key, id] of [[1, 'ent_1', 1], [7, 'ent_x', 9], [42, '123e4567-e89b-12d3-a456-426614174000', 7]] as const) {
      const v = await port.hasMembership({ userId }, key, id);
      expect(v.verified).toBe(false);
      expect(v.subjectUserId).toBe(userId);
      expect(v.externalEnterpriseKey).toBe(key);
      expect(v.internalEnterpriseId).toBe(id);
    }
  });

  it('enterprise desconhecida (internal null) -> verified=false com eco auditavel', async () => {
    const port = new DenyAllMembershipPort();
    const v = await port.hasMembership({ userId: 42 }, 'ent_999', null);
    expect(v.verified).toBe(false);
    expect(v.internalEnterpriseId).toBeNull();
    expect(v.externalEnterpriseKey).toBe('ent_999');
  });

  it('contexto invalido (subject/key/id malformados) -> verified=false, nunca throw', async () => {
    const port = new DenyAllMembershipPort();
    const badSubjects = [null, undefined, {}, { userId: 0 }, { userId: -1 }, { userId: 'x' }] as unknown as Array<{ userId: number }>;
    for (const s of badSubjects) {
      const v = await port.hasMembership(s, 'ent_1', 1);
      expect(v.verified).toBe(false);
      expect(v.subjectUserId).toBe(0);
    }
    const v2 = await port.hasMembership({ userId: 1 }, 123 as unknown as string, 0);
    expect(v2.verified).toBe(false);
    expect(v2.externalEnterpriseKey).toBe('');
    expect(v2.internalEnterpriseId).toBeNull();
  });

  it('carrier do request nao altera resultado: port so le parametros tipados', async () => {
    const port = new DenyAllMembershipPort();
    const v = await port.hasMembership({ userId: 42 }, 'ent_42', 42);
    expect(v.verified).toBe(false);
    // Nenhum campo de req (query/body/header) e lido pelo port: assinatura fechada em 3 params.
    expect(Object.keys(v).sort()).toEqual(
      ['externalEnterpriseKey', 'internalEnterpriseId', 'policy', 'subjectUserId', 'verified'].sort(),
    );
  });

  it('tentativa de autorizacao e impossivel pelo port: nao existe caminho para verified=true', async () => {
    const port = new DenyAllMembershipPort();
    const seen = new Set<unknown>();
    for (let i = 0; i < 25; i++) {
      const v = await port.hasMembership({ userId: i + 1 }, `ent_${i}`, i + 1);
      seen.add(v.verified);
    }
    expect([...seen]).toEqual([false]);
  });

  it('DenyAll = politica explicita, nao erro: policy=deny-all + eco completo', async () => {
    const port = new DenyAllMembershipPort();
    const v = await port.hasMembership({ userId: 42 }, 'ent_42', 42);
    expect(v.policy).toBe('deny-all');
    expect(v.subjectUserId).toBe(42);
    expect(v.externalEnterpriseKey).toBe('ent_42');
    expect(v.internalEnterpriseId).toBe(42);
    expect(v.verified).toBe(false);
  });

  it('nao existe default true: instancia nova tambem nega', async () => {
    const v = await new DenyAllMembershipPort().hasMembership({ userId: 1 }, 'ent_1', 1);
    expect(v.verified).toBe(false);
  });
});
