import {
  __resetSignStoreForTests,
  completeSignRequest,
  createSignRequest,
  getPublicSignView,
  listSignRequestEvents,
  recordSignRequestEvent,
} from '../../../../server/modules/rental-contracts/services/rental-contract.service';
import { sanitizeAuditMetadata } from '../../../../server/modules/rental-contracts/services/rental-sign-audit.util';

describe('rental sign audit', () => {
  beforeEach(() => {
    __resetSignStoreForTests();
  });

  it('lists events in chronological order without leaking tokens', async () => {
    const created = await createSignRequest({
      unitId: 'u-audit',
      unitName: 'Audit Tower',
      address: '1 Legal St',
      monthlyRent: 3000,
      startDate: '2026-11-20',
      signerEmail: 't@example.com',
      signerName: 'Paula',
      signerCpf: '12345678901',
      termMonths: 12,
      depositType: 'caucao',
    });

    await recordSignRequestEvent(created.id, 'u-audit', 'email_skipped', {
      actor: 'corretor',
      signingToken: 'must-not-leak',
    });
    await getPublicSignView(created.id, created.signingToken!);
    await completeSignRequest(created.id, created.signingToken!, { clientIp: '203.0.113.10' });

    const events = await listSignRequestEvents(created.id, 'u-audit');
    expect(events).not.toBeNull();
    expect(events!.length).toBeGreaterThanOrEqual(3);
    const types = events!.map((e) => e.eventType);
    expect(types).toContain('created');
    expect(types).toContain('viewed');
    expect(types).toContain('signed');

    const times = events!.map((e) => new Date(e.occurredAt).getTime());
    const sorted = [...times].sort((a, b) => a - b);
    expect(times).toEqual(sorted);

    const payload = JSON.stringify(events);
    expect(payload).not.toContain('must-not-leak');
    expect(payload).not.toContain(created.signingToken);

    const signed = events!.find((e) => e.eventType === 'signed');
    expect(signed?.metadata?.clientIp).toBe('203.0.*.*');
  });

  it('returns null when unitId does not match (IDOR guard)', async () => {
    const created = await createSignRequest({
      unitId: 'u-real',
      unitName: 'Tower',
      address: 'St',
      monthlyRent: 1000,
      startDate: '2026-11-20',
      signerEmail: 'a@example.com',
      signerName: 'A',
      signerCpf: '12345678901',
      termMonths: 6,
      depositType: 'caucao',
    });
    const events = await listSignRequestEvents(created.id, 'other-unit');
    expect(events).toBeNull();
  });

  it('sanitizeAuditMetadata strips sensitive keys', () => {
    const clean = sanitizeAuditMetadata({
      actor: 'admin',
      signingToken: 'secret-token',
      clientIp: '10.0.*.*',
    });
    expect(clean).toEqual({ actor: 'admin', clientIp: '10.0.*.*' });
  });
});