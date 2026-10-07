import { PgEnterpriseUsersRepository, type PgQueryRunner } from '../../../../server/modules/membership/role-assignment.repository';

function fakeRunner(rows: readonly unknown[]): PgQueryRunner {
  return {
    query: async () => ({ rows }),
  };
}

describe('M5 — PgEnterpriseUsersRepository (fail-closed, sem DB)', () => {
  it('unconfigured (sem runner) => null (DENY no caller)', async () => {
    const repo = new PgEnterpriseUsersRepository(null);
    expect(repo.isConfigured).toBe(false);
    await expect(repo.findMembership(7, 42)).resolves.toBeNull();
    await expect(repo.findRole(7, 42)).resolves.toBeNull();
  });

  it('active + role canonico => record + role', async () => {
    const repo = new PgEnterpriseUsersRepository(
      fakeRunner([{ status: 'active', role: 'admin' }]),
    );
    const rec = await repo.findMembership(7, 42);
    expect(rec).toMatchObject({ subjectUserId: 7, internalEnterpriseId: 42, status: 'active' });
    await expect(repo.findRole(7, 42)).resolves.toBe('admin');
  });

  it('inactive => record nao-autorizador + role null', async () => {
    const repo = new PgEnterpriseUsersRepository(
      fakeRunner([{ status: 'suspended', role: 'admin' }]),
    );
    const rec = await repo.findMembership(7, 42);
    expect(rec?.status).toBe('suspended');
    await expect(repo.findRole(7, 42)).resolves.toBeNull();
  });

  it('role nao-canonico => role null (record preservado)', async () => {
    const repo = new PgEnterpriseUsersRepository(
      fakeRunner([{ status: 'active', role: 'superadmin' }]),
    );
    await expect(repo.findRole(7, 42)).resolves.toBeNull();
  });

  it('ids invalidos => null sem tocar o runner', async () => {
    let called = 0;
    const runner: PgQueryRunner = {
      query: async () => {
        called += 1;
        return { rows: [] };
      },
    };
    const repo = new PgEnterpriseUsersRepository(runner);
    await expect(repo.findMembership(0, 42)).resolves.toBeNull();
    await expect(repo.findRole(7, -1)).resolves.toBeNull();
    expect(called).toBe(0);
  });

  it('erro do runner => null (I-S3-05)', async () => {
    const runner: PgQueryRunner = {
      query: async () => {
        throw new Error('db down');
      },
    };
    const repo = new PgEnterpriseUsersRepository(runner);
    await expect(repo.findMembership(7, 42)).resolves.toBeNull();
    await expect(repo.findRole(7, 42)).resolves.toBeNull();
  });
});
