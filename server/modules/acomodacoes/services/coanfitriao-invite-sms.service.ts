import { buildInviteAcceptUrl, papelToLabel } from './coanfitriao-invite-email.service';
import { maskPhone } from './listing-coanfitrioes.util';
import type { CoanfitriaoPapel } from './listing-coanfitrioes.util';

/**
 * Co-host invite SMS — standalone Twilio REST send (no CommunicationProviderFactory).
 * Keeps acomodações module boot free of communication provider graph.
 */

export type EnviarConviteCoanfitriaoSmsOpts = {
  telefone: string;
  nomeConvidado: string;
  nomeUnidade: string;
  token: string;
  papelLabel: string;
};

function getTwilioFromNumber(): string | undefined {
  return process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_FROM;
}

function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      getTwilioFromNumber(),
  );
}

export function buildInviteSmsBody(opts: {
  nomeConvidado: string;
  nomeUnidade: string;
  acceptUrl: string;
  papelLabel: string;
}): string {
  const nome = opts.nomeConvidado.trim() || 'coanfitrião';
  const unidade = opts.nomeUnidade.trim() || 'unidade';
  return (
    `RSV 360: Olá, ${nome}! Você foi convidado(a) para coanfitrião em "${unidade}" ` +
    `(${opts.papelLabel}). Aceite: ${opts.acceptUrl}`
  );
}

async function sendViaTwilioRest(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = getTwilioFromNumber();
  if (!accountSid || !authToken || !from) {
    throw new Error('twilio_missing');
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const params = new URLSearchParams({ To: to, From: from, Body: body });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`twilio_${response.status}:${text.slice(0, 120)}`);
  }
}

export async function enviarConviteCoanfitriaoSms(
  opts: EnviarConviteCoanfitriaoSmsOpts,
): Promise<{ ok: boolean; skipped?: boolean; reason?: string }> {
  if (!isTwilioConfigured()) {
    return { ok: false, skipped: true, reason: 'twilio_ausente' };
  }

  const masked = maskPhone(opts.telefone);
  const acceptUrl = buildInviteAcceptUrl(opts.token);
  const body = buildInviteSmsBody({
    nomeConvidado: opts.nomeConvidado,
    nomeUnidade: opts.nomeUnidade,
    acceptUrl,
    papelLabel: opts.papelLabel || papelToLabel('tudo' as CoanfitriaoPapel),
  });

  try {
    await sendViaTwilioRest(opts.telefone, body);
    return { ok: true };
  } catch (err) {
    const msg = (err as Error).message;
    console.warn('[coanfitriao] convite SMS erro:', masked, msg);
    return { ok: false, reason: msg };
  }
}
