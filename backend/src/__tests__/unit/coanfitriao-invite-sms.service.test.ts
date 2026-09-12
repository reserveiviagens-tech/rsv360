import {
  buildInviteSmsBody,
  enviarConviteCoanfitriaoSms,
} from '../../../../server/modules/acomodacoes/services/coanfitriao-invite-sms.service';

describe('coanfitriao-invite-sms.service', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
    delete process.env.TWILIO_FROM_NUMBER;
    delete process.env.TWILIO_FROM;
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it('buildInviteSmsBody includes accept URL and unit name', () => {
    const body = buildInviteSmsBody({
      nomeConvidado: 'Maria',
      nomeUnidade: 'Chalé Vista',
      acceptUrl: 'https://turismo.example.com/anfitriao/convites/aceitar?token=abc',
      papelLabel: 'Tudo',
    });
    expect(body).toContain('Maria');
    expect(body).toContain('Chalé Vista');
    expect(body).toContain('token=abc');
    expect(body).not.toContain('TWILIO');
  });

  it('enviarConviteCoanfitriaoSms skips when Twilio env absent', async () => {
    const result = await enviarConviteCoanfitriaoSms({
      telefone: '+5511999998888',
      nomeConvidado: 'Maria',
      nomeUnidade: 'Chalé',
      token: 'token-abc',
      papelLabel: 'Tudo',
    });
    expect(result).toEqual({ ok: false, skipped: true, reason: 'twilio_ausente' });
  });
});
