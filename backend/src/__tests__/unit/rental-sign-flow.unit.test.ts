import {
  __resetSignStoreForTests,
  completeSignRequest,
  createSignRequest,
  getPublicSignView,
  listSignRequestsByUnit,
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

    const signed = await completeSignRequest(created.id, created.signingToken!);
    expect(signed?.status).toBe('signed');
  });
});