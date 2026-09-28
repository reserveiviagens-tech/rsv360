/**
 * C36-CE / C36-CL — pure helpers for commercial terms window / rate math / PEA eligibility.
 * No DB writes here; earning INSERT lives in partner-earning-writer.service.
 */

export type TermsWindow = {
  status: string;
  effectiveFrom: Date | string | null;
  effectiveTo: Date | string | null;
};

function asDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Half-open [effectiveFrom, effectiveTo) at T_pay; status must be active. */
export function isCommercialTermsEffectiveAt(
  terms: TermsWindow,
  tPay: Date | string,
): boolean {
  if (terms.status !== 'active') return false;
  const t = asDate(tPay);
  if (!t) return false;
  const from = asDate(terms.effectiveFrom);
  const to = asDate(terms.effectiveTo);
  if (from && t < from) return false;
  if (to && !(t < to)) return false;
  return true;
}

/** amount_cents = floor(base_cents * rate_bps / 10000) */
export function computeEarningCents(baseCents: number, rateBps: number): number {
  if (!Number.isInteger(baseCents) || baseCents < 0) {
    throw new Error('baseCents must be a non-negative integer');
  }
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000) {
    throw new Error('rateBps must be an integer in [0, 10000]');
  }
  return Math.floor((baseCents * rateBps) / 10000);
}

/** Half-open PEA window [effectiveFrom, effectiveTo) — same semantics as terms. */
export function isPeaEffectiveAt(
  pea: {
    status: string;
    effectiveFrom: Date | string | null;
    effectiveTo: Date | string | null;
  },
  tPay: Date | string,
): boolean {
  if (pea.status !== 'active') return false;
  const t = asDate(tPay);
  if (!t) return false;
  const from = asDate(pea.effectiveFrom);
  const to = asDate(pea.effectiveTo);
  if (from && t < from) return false;
  if (to && !(t < to)) return false;
  return true;
}

/** Filter commercial_owner PEAs effective at T_pay (no arbitrary first-row). */
export function filterCommercialOwnersAt(
  peas: Array<{
    peaId: string;
    partnerId: string;
    associationRole: string;
    status: string;
    effectiveFrom: Date | string | null;
    effectiveTo: Date | string | null;
  }>,
  tPay: Date | string,
): Array<{ peaId: string; partnerId: string }> {
  return peas
    .filter(
      (p) =>
        p.associationRole === 'commercial_owner' && isPeaEffectiveAt(p, tPay),
    )
    .map((p) => ({ peaId: p.peaId, partnerId: p.partnerId }));
}

/** C36-CC multi-PEA: 0 skip, 1 ok, >1 fail-closed */
export type AttributionOutcome =
  | { kind: 'skip'; reason: 'ATTR_NO_OWNER' }
  | { kind: 'single'; peaId: string; partnerId: string }
  | { kind: 'ambiguous'; reason: 'ATTR_AMBIGUOUS_OWNERS'; count: number };

export function resolveExclusiveCommercialOwner(
  candidates: Array<{ peaId: string; partnerId: string }>,
): AttributionOutcome {
  if (candidates.length === 0) return { kind: 'skip', reason: 'ATTR_NO_OWNER' };
  if (candidates.length === 1) {
    return {
      kind: 'single',
      peaId: candidates[0].peaId,
      partnerId: candidates[0].partnerId,
    };
  }
  return {
    kind: 'ambiguous',
    reason: 'ATTR_AMBIGUOUS_OWNERS',
    count: candidates.length,
  };
}
