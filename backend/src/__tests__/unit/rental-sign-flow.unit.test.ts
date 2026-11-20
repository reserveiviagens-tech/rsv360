import {
  __resetSignStoreForTests,
  completeSignRequest,
  createSignRequest,
  getPublicSignView,
  listSignRequestsByUnit,
  revokeSignRequest,
} from '../../../../server/modules/rental-contracts/services/rental-contract.service';

describe('rental sign flow (memory)', () => {
  beforeEach(() => {
    __resetSignStoreForTests();
  });

  it('creates, lists, views and completes sign request', async () => {
    const created = await createSignRequest({
      unitId: 'r1',
      unitName: 'Arbor Tower',
      address: '1240 5th Ave',
      monthlyRent: 3700,
      startDate: '2026-11-17',
      signerEmail: 'loc***@example.com',
      signerName: 'Maria Silva',
      signerCpf: '12345678901',
      termMonths: 12,
      depositType: 'caucao',
    });

    expect(created.signingToken).toBeTruthy();
    const list = await listSignRequestsByUnit('r1');
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe('pending');

    const view = await getPublicSignView(created.id, created.signingToken!);
    expect(view?.signerName).toBe('Maria Silva');

    expect(list[0].signerCpfMasked).toBe('***.***.***-01');

    const signed = await completeSignRequest(created.id, created.signingToken!);
    expect(signed?.status).toBe('signed');
  });

  it('rejects public view after expiry and revokes pending', async () => {
    jest.useFakeTimers();
    const created = await createSignRequest({
      unitId: 'r2',
      unitName: 'Tower B',
      address: '2 Ave',
      monthlyRent: 2000,
      startDate: '2026-11-17',
      signerEmail: 't@example.com',
      signerName: 'João',
      signerCpf: '98765432100',
      termMonths: 12,
      depositType: 'caucao',
    });

    jest.advanceTimersByTime(49 * 60 * 60 * 1000);
    const view = await getPublicSignView(created.id, created.signingToken!);
    expect(view).toBeNull();
    const list = await listSignRequestsByUnit('r2');
    expect(list[0].status).toBe('expired');
    jest.useRealTimers();

    const pending = await createSignRequest({
      unitId: 'r2',
      unitName: 'Tower B',
      address: '2 Ave',
      monthlyRent: 2000,
      startDate: '2026-11-20',
      signerEmail: 't2@example.com',
      signerName: 'Ana',
      signerCpf: '11122233344',
      termMonths: 6,
      depositType: 'fiador',
    });
    const revoked = await revokeSignRequest(pending.id, 'r2');
    expect(revoked?.status).toBe('revoked');
    const viewAfter = await getPublicSignView(pending.id, pending.signingToken!);
    expect(viewAfter).toBeNull();
  });
});