/** Optional archive reason — never log raw value in error paths (LGPD). */

export const MOTIVO_ARQUIVAR_MAX = 200;

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export type MotivoArquivarOk = { ok: true; value: string | undefined };
export type MotivoArquivarErr = {
  ok: false;
  error: 'invalid_motivo';
  message: string;
};

export function sanitizeMotivoArquivar(raw: unknown): string | undefined {
  if (raw == null || raw === '') return undefined;
  if (typeof raw !== 'string') return '';
  const trimmed = raw.replace(CONTROL_CHARS, '').trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, MOTIVO_ARQUIVAR_MAX);
}

export function validateMotivoArquivar(raw: unknown): MotivoArquivarOk | MotivoArquivarErr {
  if (raw == null || raw === '') {
    return { ok: true, value: undefined };
  }
  if (typeof raw !== 'string') {
    return { ok: false, error: 'invalid_motivo', message: 'Motivo deve ser texto' };
  }
  const sanitized = sanitizeMotivoArquivar(raw);
  if (sanitized === '') {
    return { ok: false, error: 'invalid_motivo', message: 'Motivo inválido' };
  }
  return { ok: true, value: sanitized };
}

/** Same sanitize rules as archive — optional reason on restore. */
export const validateMotivoDesarquivar = validateMotivoArquivar;
