import {
  buildInviteAcceptUrl,
  buildInviteEmailHtml,
  enviarConviteCoanfitriaoEmail,
} from '../../../../server/modules/acomodacoes/services/coanfitriao-invite-email.service';

describe('coanfitriao-invite-email.service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.COANFITRIAO_INVITE_BASE_URL;
    delete process.env.TURISMO_PUBLIC_BASE_URL;
    delete process.env.NEXT_PUBLIC_TURISMO_URL;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PASS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('buildInviteAcceptUrl uses env base and encodes token', () => {
    process.env.COANFITRIAO_INVITE_BASE_URL = 'https://turismo.example.com/';
    const token = 'abc+def/token';
    const url = buildInviteAcceptUrl(token);
    expect(url).toBe(
      'https://turismo.example.com/anfitriao/convites/aceitar?token=abc%2Bdef%2Ftoken',
    );
  });

  it('buildInviteAcceptUrl falls back to localhost when env absent', () => {
    const url = buildInviteAcceptUrl('tok-123');
    expect(url).toBe('http://localhost:3001/anfitriao/convites/aceitar?token=tok-123');
  });

  it('buildInviteEmailHtml contains acceptUrl and does not embed secrets', () => {
    process.env.SMTP_PASS = 'super-secret-smtp-pass';
    process.env.SENDGRID_API_KEY = 'SG.super-secret-key';

    const acceptUrl = 'https://turismo.example.com/anfitriao/convites/aceitar?token=fake-token-uuid';
    const html = buildInviteEmailHtml({
      nomeConvidado: 'Maria',
      nomeUnidade: 'Chalé Vista',
      acceptUrl,
      papelLabel: 'Calendário e disponibilidade',
    });

    expect(html).toContain(acceptUrl);
    expect(html).toContain('Chalé Vista');
    expect(html).toContain('Calendário e disponibilidade');
    expect(html).not.toContain('super-secret-smtp-pass');
    expect(html).not.toContain('SG.super-secret-key');
    expect(html).toContain('token=fake-token-uuid');
  });

  it('enviarConviteCoanfitriaoEmail skips when provider absent', async () => {
    const result = await enviarConviteCoanfitriaoEmail({
      destinatarioEmail: 'cohost@test.local',
      nomeConvidado: 'Maria',
      nomeUnidade: 'Chalé',
      token: 'token-abc',
      papelLabel: 'Tudo',
    });
    expect(result).toEqual({ ok: false, skipped: true, error: 'email_provider_ausente' });
  });
});
