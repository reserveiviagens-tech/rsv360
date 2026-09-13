import {
  getTwilioSmsConfigStatus,
  isTwilioConfigured,
} from '../../../../server/modules/acomodacoes/services/coanfitriao-invite-sms.service';

describe('coanfitriao-invite-sms config status', () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it('reports configured=false when env missing', () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
    delete process.env.TWILIO_FROM_NUMBER;
    delete process.env.TWILIO_FROM;
    expect(isTwilioConfigured()).toBe(false);
    expect(getTwilioSmsConfigStatus()).toEqual({
      configured: false,
      hasAccountSid: false,
      hasAuthToken: false,
      hasFromNumber: false,
    });
  });

  it('reports configured=true when all present (no secret values returned)', () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACtest';
    process.env.TWILIO_AUTH_TOKEN = 'secret-token-value';
    process.env.TWILIO_PHONE_NUMBER = '+15550001111';
    const status = getTwilioSmsConfigStatus();
    expect(status.configured).toBe(true);
    expect(JSON.stringify(status)).not.toContain('secret-token-value');
    expect(JSON.stringify(status)).not.toContain('+15550001111');
  });
});
