/**
 * Host listing location verification — sanitize + staff decision helpers.
 */

export type VerificacaoLocalStatus = 'pendente' | 'enviado' | 'aprovado' | 'rejeitado';

const HOST_WRITABLE_STATUS = new Set<VerificacaoLocalStatus>(['pendente', 'enviado']);

export function asVerificacaoLocalRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

/**
 * Host PATCH may not self-approve. Invalid statuses are forced to `enviado`.
 */
export function sanitizeVerificacaoLocalHostPatch(
  existingMetadata: Record<string, unknown>,
  patchValue: unknown,
): Record<string, unknown> {
  const prev = asVerificacaoLocalRecord(existingMetadata.verificacaoLocal);
  const incoming = asVerificacaoLocalRecord(patchValue);
  const requested = String(incoming.status ?? prev.status ?? 'pendente') as VerificacaoLocalStatus;
  const status: VerificacaoLocalStatus = HOST_WRITABLE_STATUS.has(requested)
    ? requested
    : 'enviado';

  const next: Record<string, unknown> = {
    ...prev,
    ...incoming,
    status,
  };

  if (status === 'enviado') {
    delete next.revisadoEm;
    delete next.motivoRejeicao;
  } else {
    // Keep prior staff fields when host only edits evidences while still pending
    if (prev.revisadoEm != null && next.revisadoEm == null) next.revisadoEm = prev.revisadoEm;
  }

  return next;
}

export function applyStaffVerificacaoLocalDecision(
  existingMetadata: Record<string, unknown>,
  action: 'aprovar' | 'rejeitar',
  motivo?: string,
): Record<string, unknown> {
  const prev = asVerificacaoLocalRecord(existingMetadata.verificacaoLocal);
  const now = new Date().toISOString();
  return {
    ...existingMetadata,
    verificacaoLocal: {
      ...prev,
      status: action === 'aprovar' ? 'aprovado' : 'rejeitado',
      revisadoEm: now,
      ...(action === 'rejeitar'
        ? { motivoRejeicao: typeof motivo === 'string' ? motivo.slice(0, 500) : null }
        : { motivoRejeicao: null }),
    },
  };
}
