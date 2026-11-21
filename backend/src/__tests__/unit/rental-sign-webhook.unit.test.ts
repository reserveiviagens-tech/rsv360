import {
  __resetSignStoreForTests,
  completeSignRequest,
  createSignRequest,
  listSignRequestEvents,
} from '../../../../server/modules/rental-contracts/services/rental-contract.service';
import {
  buildRentalSignCompletedPayload,
  deliverRentalSignCompletedWebhook,
  signRentalSignWebhookBody,
} from '../../../../server/modules/rental-contracts/services/rental-sign-webhook.service';

describe('rental sign webhook (outbound)', () => {
  const prevUrl = process.env.RENTAL_SIGN_WEBHOOK_URL;
  const prevSecret = process.env.RENTAL_SIGN_WEBHOOK_SECRET;

  beforeEach(() => {
    __resetSignStoreForTests();
    process.env.RENTAL_SIGN_WEBHOOK_URL = 'https://hooks.example.test/rental-sign';
    process.env.RENTAL_SIGN_WEBHOOK_SECRET = 'test-secret-32-chars-minimum!!';
  });

  afterEach(() => {
    process.env.RENTAL_SIGN_WEBHOOK_URL = prevUrl;
    process.env.RENTAL_SIGN_WEBHOOK_SECRET = prevSecret;
    jest.restoreAllMocks();
  });

  it('signs payload with HMAC v1', () => {
    const body = JSON.stringify({ type: 'rental.sign.completed' });
    const sig = signRentalSignWebhookBody(body, 'secret', 1_700_000_000);
    expect(sig).toHaveLength(64);
    expect(sig).toMatch(/^[a-f0-9]+$/);
  });

  it('builds payload without PII', () => {
    const payload = buildRentalSignCompletedPayload({
      id: 'sr_test',
      unitId: 'unit_1',
      status: 'signed',
      expiresAt: '2026-12-01T00:00:00.000Z',
      signedAt: '2026-11-20T12:00:00.000Z',
    });
    expect(payload.data.requestId).toBe('sr_test');
    expect(JSON.stringify(payload)).not.toMatch(/cpf|token|email/i);
  });

  it('delivers webhook once and records webhook_delivered', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    const created = await createSignRequest({
      unitId: 'r-webhook',
      unitName: 'Webhook Tower',
      address: '1 St',
      monthlyRent: 3000,
      startDate: '2026-11-17',
      signerEmail: 'signer@example.com',
      signerName: 'Signer',
      signerCpf: '12345678901',
      termMonths: 12,
      depositType: 'caucao',
    });

    const signed = await completeSignRequest(created.id, created.signingToken!);
    expect(signed?.status).toBe('signed');

    const first = await deliverRentalSignCompletedWebhook(signed!);
    expect(first.delivered).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const headers = (fetchMock.mock.calls[0][1]?.headers ?? {}) as Record<string, string>;
    expect(headers['X-RSV-Signature']).toMatch(/^v1=/);

    const second = await deliverRentalSignCompletedWebhook(signed!);
    expect(second.skipped).toBe('idempotent');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const events = await listSignRequestEvents(created.id, 'r-webhook');
    expect(events?.some((e) => e.eventType === 'webhook_delivered')).toBe(true);
  });

  it('retries until success', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 502 } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response);

    const record = {
      id: 'sr_retry',
      unitId: 'u1',
      status: 'signed' as const,
      expiresAt: '2026-12-01T00:00:00.000Z',
      signedAt: '2026-11-20T12:00:00.000Z',
    };

    const result = await deliverRentalSignCompletedWebhook(record, { force: true });
    expect(result.delivered).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});