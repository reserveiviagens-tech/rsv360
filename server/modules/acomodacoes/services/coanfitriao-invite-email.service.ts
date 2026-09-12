import { maskEmail } from './listing-coanfitrioes.util';
import type { CoanfitriaoPapel } from './listing-coanfitrioes.util';

/** Lazy-load mailer so acomodações boot does not pull communication providers at import time. */

const PAPEL_LABELS: Record<CoanfitriaoPapel, string> = {
  calendario: 'Calendário e disponibilidade',
  mensagens: 'Mensagens com hóspedes',
  tudo: 'Tudo (calendário + mensagens)',
};

export function papelToLabel(papel: CoanfitriaoPapel | string): string {
  return PAPEL_LABELS[papel as CoanfitriaoPapel] ?? String(papel);
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildInviteAcceptUrl(token: string): string {
  const base =
    process.env.COANFITRIAO_INVITE_BASE_URL ||
    process.env.TURISMO_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_TURISMO_URL ||
    'http://localhost:3001';
  return `${base.replace(/\/$/, '')}/anfitriao/convites/aceitar?token=${encodeURIComponent(token)}`;
}

export function buildInviteEmailHtml(opts: {
  nomeConvidado: string;
  nomeUnidade: string;
  acceptUrl: string;
  papelLabel: string;
}): string {
  const nome = escapeHtml(opts.nomeConvidado);
  const unidade = escapeHtml(opts.nomeUnidade);
  const papel = escapeHtml(opts.papelLabel);
  const url = escapeHtml(opts.acceptUrl);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Convite coanfitrião</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:32px 28px;">
          <tr>
            <td>
              <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">RSV 360°</p>
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;">Convite para coanfitrião</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#334155;">Olá, ${nome}!</p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#334155;">
                Você foi convidado(a) para ajudar a gerenciar a unidade <strong>${unidade}</strong> como coanfitrião.
              </p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#475569;">
                Permissão: <strong>${papel}</strong>
              </p>
              <p style="margin:0 0 24px;">
                <a href="${url}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:10px;">Aceitar convite</a>
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">
                Se o botão não funcionar, copie e cole o link no navegador (após entrar com o e-mail do convite).
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

export type EnviarConviteCoanfitriaoEmailOpts = {
  destinatarioEmail: string;
  nomeConvidado: string;
  nomeUnidade: string;
  token: string;
  papelLabel: string;
};

export async function enviarConviteCoanfitriaoEmail(
  opts: EnviarConviteCoanfitriaoEmailOpts,
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  if (!process.env.SENDGRID_API_KEY && !(process.env.SMTP_HOST && process.env.SMTP_PASS)) {
    return { ok: false, skipped: true, error: 'email_provider_ausente' };
  }

  const masked = maskEmail(opts.destinatarioEmail);
  const acceptUrl = buildInviteAcceptUrl(opts.token);
  const html = buildInviteEmailHtml({
    nomeConvidado: opts.nomeConvidado,
    nomeUnidade: opts.nomeUnidade,
    acceptUrl,
    papelLabel: opts.papelLabel,
  });
  const subject = 'Convite para coanfitrião — RSV 360°';

  try {
    const { CommunicationProviderFactory } = await import('../../communication/providers/factory');
    const provider = CommunicationProviderFactory.getProvider('default', 'email');
    if (!provider?.email) {
      return { ok: false, skipped: true, error: 'email_provider_ausente' };
    }
    const result = await provider.email.sendEmail(opts.destinatarioEmail, subject, html);
    if (!result.success) {
      console.warn('[coanfitriao] convite e-mail falhou:', masked, result.error ?? 'unknown');
      return { ok: false, error: result.error ?? 'send_failed' };
    }
    return { ok: true };
  } catch (err) {
    const msg = (err as Error).message;
    console.warn('[coanfitriao] convite e-mail erro:', masked, msg);
    return { ok: false, error: msg };
  }
}
