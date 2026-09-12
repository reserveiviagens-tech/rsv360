/**
 * Co-hosts on listing metadata (metadata.coanfitrioes).
 */

export const COANFITRIOES_MAX = 10;
export const COANFITRIOES_NOME_MAX = 120;
export const COANFITRIOES_EMAIL_MAX = 254;
export const COANFITRIOES_ID_MAX = 64;
export const COANFITRIAO_INVITE_TTL_DAYS = 14;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeInviteExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + COANFITRIAO_INVITE_TTL_DAYS * MS_PER_DAY);
}

/** Legacy rows without expiresAt are treated as not expired. */
export function isInviteExpired(
  expiresAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (expiresAt == null) return false;
  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return false;
  return expiry.getTime() <= now.getTime();
}

export const COANFITRIOES_PAPEIS = ['calendario', 'mensagens', 'tudo'] as const;
export const COANFITRIOES_STATUS = ['pendente', 'ativo', 'revogado'] as const;

export type CoanfitriaoPapel = (typeof COANFITRIOES_PAPEIS)[number];
export type CoanfitriaoStatus = (typeof COANFITRIOES_STATUS)[number];

export type ListingCoanfitriao = {
  id: string;
  nome: string;
  email?: string;
  papel: CoanfitriaoPapel;
  status: CoanfitriaoStatus;
  expiresAt?: string;
};

/** Row shape from coanfitriao_convites table (mapping helper input). */
export type CoanfitriaoConviteRow = {
  id: string;
  nome: string;
  email: string;
  papel: string;
  status: string;
  expiresAt?: Date | string | null;
};

export function mapConviteRowToListingCoanfitriao(row: CoanfitriaoConviteRow): ListingCoanfitriao {
  const mapped: ListingCoanfitriao = {
    id: row.id,
    nome: row.nome,
    email: row.email,
    papel: row.papel as CoanfitriaoPapel,
    status: row.status as CoanfitriaoStatus,
  };
  if (row.expiresAt != null) {
    const expiry =
      row.expiresAt instanceof Date ? row.expiresAt : new Date(row.expiresAt);
    if (!Number.isNaN(expiry.getTime())) {
      mapped.expiresAt = expiry.toISOString();
    }
  }
  return mapped;
}

export type CoanfitrioesValidationOk = { ok: true; value: ListingCoanfitriao[] };
export type CoanfitrioesValidationErr = {
  ok: false;
  error: 'coanfitrioes_invalido';
  message: string;
};

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PAPEL_SET = new Set<string>(COANFITRIOES_PAPEIS);
const STATUS_SET = new Set<string>(COANFITRIOES_STATUS);

function sanitizeNome(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(CONTROL_CHARS, '').trim().slice(0, COANFITRIOES_NOME_MAX);
}

function sanitizeId(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(CONTROL_CHARS, '').trim().slice(0, COANFITRIOES_ID_MAX);
}

export function normalizeCoanfitriaoEmail(raw: unknown): string | undefined {
  if (raw == null || raw === '') return undefined;
  if (typeof raw !== 'string') return undefined;
  const email = raw.replace(CONTROL_CHARS, '').trim().toLowerCase().slice(0, COANFITRIOES_EMAIL_MAX);
  if (!email) return undefined;
  if (!EMAIL_RE.test(email)) return undefined;
  return email;
}

/** Masks email for safe user-facing messages (LGPD). */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function coanfitriaoMatchesEmail(item: ListingCoanfitriao, email: string): boolean {
  if (!item.email) return false;
  const normalized = normalizeCoanfitriaoEmail(email);
  if (!normalized) return false;
  return item.email === normalized;
}

export function findCoanfitriaoAtivoByEmail(
  list: ListingCoanfitriao[] | null | undefined,
  email: string,
): ListingCoanfitriao | undefined {
  if (!Array.isArray(list) || !email) return undefined;
  return list.find((item) => item.status === 'ativo' && coanfitriaoMatchesEmail(item, email));
}

export function papelPermiteCalendario(papel: CoanfitriaoPapel): boolean {
  return papel === 'calendario' || papel === 'tudo';
}

export function papelPermiteMensagens(papel: CoanfitriaoPapel): boolean {
  return papel === 'mensagens' || papel === 'tudo';
}

export function validateListingCoanfitrioes(
  raw: unknown,
): CoanfitrioesValidationOk | CoanfitrioesValidationErr {
  if (raw == null) {
    return { ok: true, value: [] };
  }
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      error: 'coanfitrioes_invalido',
      message: 'Coanfitriões deve ser uma lista',
    };
  }
  if (raw.length > COANFITRIOES_MAX) {
    return {
      ok: false,
      error: 'coanfitrioes_invalido',
      message: `Máximo de ${COANFITRIOES_MAX} coanfitriões`,
    };
  }

  const value: ListingCoanfitriao[] = [];
  const emailsSeen = new Set<string>();
  const idsSeen = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return {
        ok: false,
        error: 'coanfitrioes_invalido',
        message: 'Item de coanfitrião inválido',
      };
    }
    const src = item as Record<string, unknown>;

    const id = sanitizeId(src.id);
    if (!id) {
      return {
        ok: false,
        error: 'coanfitrioes_invalido',
        message: 'ID do coanfitrião inválido',
      };
    }
    if (idsSeen.has(id)) {
      return {
        ok: false,
        error: 'coanfitrioes_invalido',
        message: 'ID de coanfitrião duplicado',
      };
    }
    idsSeen.add(id);

    if (typeof src.nome !== 'string') {
      return {
        ok: false,
        error: 'coanfitrioes_invalido',
        message: 'Nome do coanfitrião inválido',
      };
    }
    const nome = sanitizeNome(src.nome);
    if (!nome) {
      return {
        ok: false,
        error: 'coanfitrioes_invalido',
        message: 'Nome do coanfitrião é obrigatório',
      };
    }

    if (typeof src.papel !== 'string' || !PAPEL_SET.has(src.papel.trim())) {
      return {
        ok: false,
        error: 'coanfitrioes_invalido',
        message: 'Papel do coanfitrião inválido',
      };
    }
    const papel = src.papel.trim() as CoanfitriaoPapel;

    if (typeof src.status !== 'string' || !STATUS_SET.has(src.status.trim())) {
      return {
        ok: false,
        error: 'coanfitrioes_invalido',
        message: 'Status do coanfitrião inválido',
      };
    }
    const status = src.status.trim() as CoanfitriaoStatus;

    let email: string | undefined;
    if (Object.prototype.hasOwnProperty.call(src, 'email')) {
      if (src.email != null && src.email !== '' && typeof src.email !== 'string') {
        return {
          ok: false,
          error: 'coanfitrioes_invalido',
          message: 'E-mail do coanfitrião inválido',
        };
      }
      if (typeof src.email === 'string' && src.email.trim()) {
        email = normalizeCoanfitriaoEmail(src.email);
        if (!email) {
          return {
            ok: false,
            error: 'coanfitrioes_invalido',
            message: 'E-mail do coanfitrião inválido',
          };
        }
        if (emailsSeen.has(email)) {
          return {
            ok: false,
            error: 'coanfitrioes_invalido',
            message: 'E-mail de coanfitrião duplicado',
          };
        }
        emailsSeen.add(email);
      }
    }

    const row: ListingCoanfitriao = { id, nome, papel, status };
    if (email) row.email = email;
    value.push(row);
  }

  return { ok: true, value };
}

export function readCoanfitrioesFromMetadata(metadata: unknown): ListingCoanfitriao[] {
  if (metadata == null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return [];
  }
  const raw = (metadata as Record<string, unknown>).coanfitrioes;
  const validated = validateListingCoanfitrioes(raw);
  return validated.ok ? validated.value : [];
}

export function enrichMetadataWithCoanfitrioes(
  metadata: unknown,
  list: ListingCoanfitriao[],
): Record<string, unknown> {
  const base =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  base.coanfitrioes = list.length > 0 ? list : undefined;
  return base;
}

/** Card preview for co-hosts section. */
export function summarizeCoanfitrioes(
  value: ListingCoanfitriao[] | null | undefined,
): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const active = value.filter((c) => c.status !== 'revogado').length;
  if (active === 0) return null;

  return active === 1 ? '1 coanfitrião' : `${active} coanfitriões`;
}
