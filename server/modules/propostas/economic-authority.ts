/**
 * G-D.6 / OD-GD-11 / PA-DEC-006 — Economic Authority composition (Propostas).
 *
 * Composition canônica para efeitos econômicos locais:
 *   Role Authority (admin = economic actor allowlist)
 * + Economic Authority (caps / explicit mutation gate)
 * + Audit (aprovação → auditoriaEstados; voucher definitivo = efeito de aprovar)
 * + Partner Authority = N/A nesta superfície staff (OD-GD-06)
 * + Enterprise Context / enterpriseId = carrier only; DEFER G-E/E-13 (OD-GD-05)
 *
 * `body.valorTotal` é dado sujeito a caps — NÃO é autoridade.
 * Gateway / refund / payout / ledger real = FORA deste gate.
 *
 * FLAG / membership plug: G-D.6 NÃO monta membership middleware em propostas.
 * Composição local sempre aplicada nas superfícies econômicas (OD-GD-11 APPROVED).
 * staffAuth global permanece UNTOUCHED.
 */
import { isPropostasAprovador } from './rbac';

/** Economic actor allowlist = admin (alinhado OD-GD-04 aprovador). */
export function canMutatePropostaEconomicFields(role?: string | null): boolean {
  return isPropostasAprovador(role);
}

export type ValorTotalCapResult =
  | { ok: true; valorTotal: string }
  | { ok: false; status: 400; reason: 'invalid_valor_total' };

/**
 * Cap: finito e >= 0. Reject NaN / Infinity / negativo.
 */
export function normalizeValorTotalCap(raw: unknown): ValorTotalCapResult {
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim().replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, status: 400, reason: 'invalid_valor_total' };
  }
  return { ok: true, valorTotal: String(n) };
}

/**
 * True when payload touches economic fields that require Economic Authority.
 */
export function payloadTouchesValorTotal(body: { valorTotal?: unknown } | null | undefined): boolean {
  return body != null && body.valorTotal !== undefined;
}
