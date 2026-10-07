/**
 * PR-03b — Authorization for proposta lookup by numeric :id (BOLA/IDOR).
 * Capability pública continua em rotas `rt-*` / cotação-pública (fora deste módulo).
 * GET anônimo por :id → payload deny-by-default (nunca tokenPublico / PII / chat).
 *
 * ---------------------------------------------------------------------------
 * G-D.3 / OD-GD-02 — STAFF de *resource access* ≠ allowlist HTTP `staffAuth`
 * ---------------------------------------------------------------------------
 * `staffAuth` (middleware global) admite JWT roles {admin, manager, user}.
 * Este módulo usa um Set **mais estreito** para privilegio de leitura/sensitive:
 *
 *   PROPOSTA_ACCESS_STAFF_ROLES = {admin, manager}
 *
 * Regras canônicas:
 * - `user` NÃO recebe privilégio de staff em proposta-access (sem presumir).
 * - `supervisor` NÃO é staff de access (aprovação = admin only em G-D.1 / OD-GD-04).
 * - Não alargar este Set sem Owner Decision.
 * - Não alterar o export global `staffAuth` para “alinhar” (blast radius).
 */

export type PropostaAccessUser = {
  id?: number;
  email?: string | null;
  role?: string | null;
  name?: string | null;
};

export type PropostaAccessRow = {
  id: number;
  isPublica?: boolean | null;
  clienteEmail?: string | null;
  tokenPublico?: string | null;
  titulo?: string | null;
  status?: string | null;
  validoAte?: Date | string | null;
  clienteNome?: string | null;
  valorTotal?: string | number | null;
  moeda?: string | null;
};

/** Canonical access-staff roles (G-D.3). Frozen — do not widen without OD. */
export const PROPOSTA_ACCESS_STAFF_ROLES = Object.freeze(['admin', 'manager'] as const);

const STAFF_ROLES: ReadonlySet<string> = new Set(PROPOSTA_ACCESS_STAFF_ROLES);

/** True iff role is in the access-staff Set (not the HTTP staffAuth allowlist). */
export function isPropostaAccessStaffRole(role?: string | null): boolean {
  return Boolean(role && STAFF_ROLES.has(role));
}

export function isPropostaStaff(user: PropostaAccessUser | null | undefined): boolean {
  return isPropostaAccessStaffRole(user?.role);
}

export function ownsProposta(
  user: PropostaAccessUser | null | undefined,
  row: PropostaAccessRow,
): boolean {
  if (!user?.email || !row.clienteEmail) return false;
  return user.email.toLowerCase() === row.clienteEmail.toLowerCase();
}

/** Capability token `rt-*` (~126 bits) — not a guessable RSV code. */
export function isRtPublicToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  return /^rt-[A-Za-z0-9_-]{16,}$/.test(token.trim());
}

/**
 * Deny-by-default allowlist for anonymous GET /propostas/:id.
 * NEVER includes tokenPublico, emails, phones, chat, eventos, conteudo, metadata.
 */
export function buildAnonymousIdLookupPayload(
  row: PropostaAccessRow,
): Record<string, unknown> {
  return {
    id: row.id,
    titulo: row.titulo ?? null,
    status: row.status ?? null,
    validoAte: row.validoAte ?? null,
    clienteNome: row.clienteNome ?? null,
    valorTotal: row.valorTotal ?? null,
    moeda: row.moeda ?? null,
    isPublica: Boolean(row.isPublica),
    payloadReduzido: true,
  };
}

/** Shape guard for tests / defense-in-depth. */
export function assertAnonymousIdPayloadSafe(payload: Record<string, unknown>): boolean {
  const forbidden = [
    'tokenPublico',
    'clienteEmail',
    'clienteTelefone',
    'chat',
    'eventos',
    'conteudo',
    'metadata',
    'comparativoCache',
  ];
  for (const key of forbidden) {
    if (key in payload && payload[key] != null) return false;
  }
  return payload.payloadReduzido === true;
}

export type PropostaReadDecision =
  | { ok: true; mode: 'full' }
  | { ok: true; mode: 'redacted' }
  | { ok: false; status: 404 };

/**
 * Read authz for GET /:id (numeric).
 * Staff → full; owner email → full; anon + isPublica → redacted; else 404.
 * Authenticated without ownership → 404 (horizontal BOLA).
 */
export function authorizePropostaIdRead(opts: {
  user: PropostaAccessUser | null | undefined;
  row: PropostaAccessRow;
}): PropostaReadDecision {
  const { user, row } = opts;
  if (isPropostaStaff(user)) return { ok: true, mode: 'full' };
  if (user && ownsProposta(user, row)) return { ok: true, mode: 'full' };
  if (user && !ownsProposta(user, row)) return { ok: false, status: 404 };
  // anonymous
  if (row.isPublica) return { ok: true, mode: 'redacted' };
  return { ok: false, status: 404 };
}

/**
 * Mutating / sensitive ops on :id (chat, hitl, responder).
 * Staff | owner | valid rt token matching row — never bare anonymous id.
 */
export function authorizePropostaIdSensitive(opts: {
  user: PropostaAccessUser | null | undefined;
  row: PropostaAccessRow;
  capabilityToken?: string | null;
}): { ok: true } | { ok: false; status: 404 } {
  const { user, row, capabilityToken } = opts;
  if (isPropostaStaff(user)) return { ok: true };
  if (user && ownsProposta(user, row)) return { ok: true };
  const token = capabilityToken?.trim();
  if (
    token &&
    isRtPublicToken(token) &&
    row.isPublica &&
    row.tokenPublico &&
    token === row.tokenPublico
  ) {
    return { ok: true };
  }
  return { ok: false, status: 404 };
}

/** visualizacao: write-only; public proposta or staff/owner. */
export function authorizePropostaVisualizacao(opts: {
  user: PropostaAccessUser | null | undefined;
  row: PropostaAccessRow;
}): { ok: true } | { ok: false; status: 404 } {
  const { user, row } = opts;
  if (isPropostaStaff(user) || ownsProposta(user, row)) return { ok: true };
  if (!user && row.isPublica) return { ok: true };
  return { ok: false, status: 404 };
}
