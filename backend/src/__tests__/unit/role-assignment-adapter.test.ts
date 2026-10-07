import { resolveCanonicalRoleContext } from '../../../../server/modules/membership/role-assignment.adapter';
import { requireEnterpriseRole } from '../../../../server/modules/membership/role.guards';
import type { PgEnterpriseUsersRepository } from '../../../../server/modules/membership/role-assignment.repository';

function fakeRepo(role: unknown, status: string): Pick<PgEnterpriseUsersRepository, 'findRole'> {
  return {
    // findRole real so retorna papel com membership active; o fake emula isso.
    findRole: async () => (status === 'active' && typeof role === 'string' ? (role as never) : null),
  } as unknown as Pick<PgEnterpriseUsersRepository, 'findRole'>;
}

describe('M6 — Canonical Adapter (enterprise_users.role -> CanonicalRoleContext)', () => {
  it('assignment valida => membership-record + ALLOW admin>=manager', async () => {
    const ctx = await resolveCanonicalRoleContext(fakeRepo('admin', 'active'), {
      subjectUserId: 7,
      internalEnterpriseId: 42,
      membershipVerified: true,
    });
    expect(ctx.role).toBe('admin');
    expect(ctx.source).toBe('membership-record');
    expect(ctx.roleVerified).toBe(true);
    expect(requireEnterpriseRole('manager')(ctx).allowed).toBe(true);
  });

  it('membership nao verificada => contexto vazio => DENY (role sozinho nunca autoriza)', async () => {
    const ctx = await resolveCanonicalRoleContext(fakeRepo('owner', 'active'), {
      subjectUserId: 7,
      internalEnterpriseId: 42,
      membershipVerified: false,
    });
    expect(ctx.role).toBeNull();
    expect(requireEnterpriseRole('viewer')(ctx).allowed).toBe(false);
  });

  it('sem assignment (null) => vazio => DENY', async () => {
    const repo: Pick<PgEnterpriseUsersRepository, 'findRole'> = {
      findRole: async () => null,
    } as unknown as Pick<PgEnterpriseUsersRepository, 'findRole'>;
    const ctx = await resolveCanonicalRoleContext(repo, {
      subjectUserId: 7,
      internalEnterpriseId: 42,
      membershipVerified: true,
    });
    expect(ctx.role).toBeNull();
    expect(requireEnterpriseRole('viewer')(ctx).allowed).toBe(false);
  });

  it('role nao-canonico persistido => vazio => DENY', async () => {
    const ctx = await resolveCanonicalRoleContext(fakeRepo('superadmin', 'active'), {
      subjectUserId: 7,
      internalEnterpriseId: 42,
      membershipVerified: true,
    });
    expect(ctx.role).toBeNull();
    expect(requireEnterpriseRole('viewer')(ctx).allowed).toBe(false);
  });

  it('ids invalidos / repo ausente / erro => vazio => DENY', async () => {
    await expect(
      resolveCanonicalRoleContext(fakeRepo('admin', 'active'), {
        subjectUserId: 0,
        internalEnterpriseId: 42,
        membershipVerified: true,
      }).then((c) => requireEnterpriseRole('viewer')(c).allowed),
    ).resolves.toBe(false);
    await expect(
      resolveCanonicalRoleContext(null, {
        subjectUserId: 7,
        internalEnterpriseId: 42,
        membershipVerified: true,
      }).then((c) => requireEnterpriseRole('viewer')(c).allowed),
    ).resolves.toBe(false);
    const exploding = {
      findRole: async () => {
        throw new Error('db down');
      },
    } as unknown as Pick<PgEnterpriseUsersRepository, 'findRole'>;
    await expect(
      resolveCanonicalRoleContext(exploding, {
        subjectUserId: 7,
        internalEnterpriseId: 42,
        membershipVerified: true,
      }).then((c) => requireEnterpriseRole('viewer')(c).allowed),
    ).resolves.toBe(false);
  });

  it('hierarquia: viewer nao passa em manager; manager nao passa em admin', async () => {
    const viewer = await resolveCanonicalRoleContext(fakeRepo('viewer', 'active'), {
      subjectUserId: 7,
      internalEnterpriseId: 42,
      membershipVerified: true,
    });
    expect(requireEnterpriseRole('manager')(viewer).allowed).toBe(false);
    const manager = await resolveCanonicalRoleContext(fakeRepo('manager', 'active'), {
      subjectUserId: 7,
      internalEnterpriseId: 42,
      membershipVerified: true,
    });
    expect(requireEnterpriseRole('admin')(manager).allowed).toBe(false);
    expect(requireEnterpriseRole('manager')(manager).allowed).toBe(true);
  });

  it('spoofing: claim/body/query/header NUNCA entram no adapter (sem parametro para isso)', async () => {
    // O adapter nao recebe Request: qualquer carrier cliente-controlavel e
    // arquitetonicamente incapaz de chegar ao contexto. Prova por contrato:
    // inputs aceitos sao SOMENTE (subjectUserId, internalEnterpriseId, verified).
    const ctx = await resolveCanonicalRoleContext(fakeRepo('admin', 'active'), {
      subjectUserId: 7,
      internalEnterpriseId: 42,
      membershipVerified: true,
    });
    // Mesmo com fonte persistida valida, papel nao-canonico forjado nao autoriza:
    const forged = await resolveCanonicalRoleContext(fakeRepo('root', 'active'), {
      subjectUserId: 7,
      internalEnterpriseId: 42,
      membershipVerified: true,
    });
    expect(forged.role).toBeNull();
    expect(ctx.source).not.toBe('jwt-claim');
  });

  it('cross-enterprise: assignment de A nao autoriza em B (repos distintos)', async () => {
    // Repo de A conhece (7,42); consulta em B (7,99) retorna null => DENY.
    const repoA: Pick<PgEnterpriseUsersRepository, 'findRole'> = {
      findRole: async (u: number, e: number) => ((u === 7 && e === 42 ? 'admin' : null) as never),
    } as unknown as Pick<PgEnterpriseUsersRepository, 'findRole'>;
    const ctxB = await resolveCanonicalRoleContext(repoA, {
      subjectUserId: 7,
      internalEnterpriseId: 99,
      membershipVerified: true,
    });
    expect(ctxB.role).toBeNull();
    expect(requireEnterpriseRole('viewer')(ctxB).allowed).toBe(false);
  });
});
