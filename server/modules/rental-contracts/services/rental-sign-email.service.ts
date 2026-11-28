import { maskEmail } from '../../acomodacoes/services/listing-coanfitrioes.util';
import { buildPublicSignPath } from './rental-contract.service';

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildRentalSignPublicBaseUrl(): string {
  const base =
    process.env.TURISMO_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_TURISMO_URL ||
    'http://localhost:3005';
  return base.replace(/\/$/, '');
}

export function buildRentalSignPublicUrl(requestId: string, token: string): string {
  return `${buildRentalSignPublicBaseUrl()}${buildPublicSignPath(requestId, token)}`;
}

export function buildRentalSignEmailHtml(opts: {
  signerName: string;
  unitName: string;
  signingUrl: string;
  expiresAtIso: string;
}): string {
  const nome = escapeHtml(opts.signerName);
  const unidade = escapeHtml(opts.unitName);
  const url = escapeHtml(opts.signingUrl);
  const expira = escapeHtml(new Date(opts.expiresAtIso).toLocaleString('pt-BR'));

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Assinatura de contrato</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:32px 28px;">
          <tr>
            <td>
              <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">RSV 360°</p>
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;">Assinatura do contrato de locação</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#334155;">Olá, ${nome}!</p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#334155;">
                Há um contrato pendente para a unidade <strong>${unidade}</strong>. Revise o PDF e conclua a assinatura eletrônica.
              </p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#475569;">
                Este link expira em <strong>${expira}</strong>.
              </p>
              <p style="margin:0 0 24px;">
                <a href="${url}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:10px;">Abrir e assinar</a>
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">
                Se o botão não funcionar, copie e cole o link no navegador.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getEmailFrom(): string {
  const from =
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    process.env.SENDGRID_FROM_EMAIL ||
    process.env.SMTP_USER ||
    'noreply@rsv360.com';
  if (from.includes('<')) return from;
  return `RSV 360° <${from}>`;
}

function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SENDGRID_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_PASS),
  );
}

async function sendViaSendGrid(to: string, subject: string, html: string): Promise<void> {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) throw new Error('sendgrid_missing');
  const fromEmail =
    process.env.SENDGRID_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    'noreply@rsv360.com';
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail.replace(/^.*<|>.*$/g, '').trim() || 'noreply@rsv360.com' },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`sendgrid_${response.status}:${body.slice(0, 120)}`);
  }
}

async function sendViaSmtp(to: string, subject: string, html: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodemailer = require('nodemailer') as typeof import('nodemailer');
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure =
    process.env.SMTP_SECURE === 'true' || String(process.env.SMTP_PORT) === '465';
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  await transporter.sendMail({
    from: getEmailFrom(),
    to,
    subject,
    html,
  });
}

export type RentalSignInviteEmailOpts = {
  destinatarioEmail: string;
  signerName: string;
  unitName: string;
  requestId: string;
  signingToken: string;
  expiresAtIso: string;
};

export type RentalSignInviteEmailResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

export async function sendRentalSignInviteEmail(
  opts: RentalSignInviteEmailOpts,
): Promise<RentalSignInviteEmailResult> {
  if (!isEmailConfigured()) {
    return { ok: false, skipped: true, error: 'email_provider_ausente' };
  }

  const masked = maskEmail(opts.destinatarioEmail);
  const signingUrl = buildRentalSignPublicUrl(opts.requestId, opts.signingToken);
  const html = buildRentalSignEmailHtml({
    signerName: opts.signerName,
    unitName: opts.unitName,
    signingUrl,
    expiresAtIso: opts.expiresAtIso,
  });
  const subject = `Assinatura de contrato — ${opts.unitName}`;

  try {
    if (process.env.SENDGRID_API_KEY) {
      await sendViaSendGrid(opts.destinatarioEmail, subject, html);
    } else {
      await sendViaSmtp(opts.destinatarioEmail, subject, html);
    }
    return { ok: true };
  } catch (err) {
    const msg = (err as Error).message;
    console.warn('[rental-sign] convite e-mail erro:', masked, msg);
    return { ok: false, error: msg };
  }
}