/** Gate determinístico — comissão só após proposta.status === 'paid' (Fatia 4). */

export const COMISSAO_PROPOSTA_STATUS_PAGO = 'paid';

export type ComissaoPropostaBlockedCode = 'proposta_status_blocked';

export type ComissaoPropostaGate =
  | { allowed: true; status: typeof COMISSAO_PROPOSTA_STATUS_PAGO }
  | {
      allowed: false;
      status: string;
      code: ComissaoPropostaBlockedCode;
      message: string;
    };

export function normalizePropostaStatus(status: unknown): string {
  return String(status ?? '')
    .trim()
    .toLowerCase();
}

export function avaliarComissaoPropostaStatus(status: unknown): ComissaoPropostaGate {
  const normalized = normalizePropostaStatus(status);
  if (normalized === COMISSAO_PROPOSTA_STATUS_PAGO) {
    return { allowed: true, status: COMISSAO_PROPOSTA_STATUS_PAGO };
  }
  const label = normalized || 'unknown';
  return {
    allowed: false,
    status: label,
    code: 'proposta_status_blocked',
    message: `Liquidação bloqueada: status "${label}". Apenas propostas com status paid geram comissão.`,
  };
}