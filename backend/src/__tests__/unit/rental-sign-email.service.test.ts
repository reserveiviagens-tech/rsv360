import {
  buildRentalSignEmailHtml,
  buildRentalSignPublicUrl,
  sendRentalSignInviteEmail,
} from '../../../../server/modules/rental-contracts/services/rental-sign-email.service';

describe('rental-sign-email.service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.TURISMO_PUBLIC_BASE_URL;
    delete process.env.NEXT_PUBLIC_TURISMO_URL;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PASS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('buildRentalSignPublicUrl uses turismo base and encodes query', () => {
    process.env.TURISMO_PUBLIC_BASE_URL = 'https://turismo.example.com/';
    const url = buildRentalSignPublicUrl('rsign_1', 'tok abc');
    expect(url).toContain('https://turismo.example.com/rentals/sign');
    expect(url).toContain('requestId=rsign_1');
    expect(url).toContain('token=');
  });

  it('buildRentalSignEmailHtml does not embed signing token substring from env secrets', () => {
    process.env.SMTP_PASS = 'super-secret-smtp-pass';
    const signingUrl =
      'https://turismo.example.com/rentals/sign?requestId=r1&token=only-in-link';
    const html = buildRentalSignEmailHtml({
      signerName: 'Maria',
      unitName: 'Torre A',
      signingUrl,
      expiresAtIso: '2026-12-01T12:00:00.000Z',
    });
    expect(html).toContain('href="https://turismo.example.com/rentals/sign?requestId=r1&amp;token=only-in-link"');
    expect(html).toContain('Torre A');
    expect(html).not.toContain('super-secret-smtp-pass');
  });

  it('sendRentalSignInviteEmail skips when provider absent', async () => {
    const result = await sendRentalSignInviteEmail({
      destinatarioEmail: 'tenant@test.local',
      signerName: 'Maria',
      unitName: 'Torre A',
      requestId: 'rsign_1',
      signingToken: 'token-abc',
      expiresAtIso: new Date().toISOString(),
    });
    expect(result).toEqual({ ok: false, skipped: true, error: 'email_provider_ausente' });
  });
});