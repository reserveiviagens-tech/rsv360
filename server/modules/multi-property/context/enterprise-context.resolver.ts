/**
 * WS-04 / S4 — Enterprise context resolver (FAIL-CLOSED, SEM HTTP, SEM DB).
 * Compoe S1 (tipos) + S2 (bridge) + S3 (membership port). Sem middleware (S5),
 * sem RBAC, sem property, sem enforce runtime, sem DB/I-O.
 * Regras: identidade ausente => 401; claim ausente/malformado => 403;
 * requested != claim => 403 em enforce (legacy autoriza pelo claim + flag);
 * internal null => 403; membership false NAO nega (divida WS-15); ambiguidade => DENY.
 */
import type { EnterpriseContextResolution, ExternalEnterpriseKey, InternalEnterpriseId, RequestedEnterpriseContext } from './enterprise-context.types';
import { isWellFormedExternalKey, translateExternalToInternal, type EnterpriseKeyLookup } from './enterprise-key-bridge';
import type { EnterpriseMembershipPort, MembershipVerdict } from './enterprise-membership.port';
export type ResolutionMode = 'legacy' | 'enforce';
export interface ResolveEnterpriseContextInput {
  userId: unknown; enterpriseClaim: unknown;
  requested: RequestedEnterpriseContext | null;
  mode: ResolutionMode; lookup: EnterpriseKeyLookup; membership: EnterpriseMembershipPort;
}
export type DenyReason = 'no-identity' | 'missing-claim' | 'malformed-claim' | 'requested-mismatch' | 'unknown-enterprise' | 'membership-error';
export type ResolveEnterpriseContextResult =
  | { readonly outcome: 'authorized'; readonly status: 200; readonly resolution: EnterpriseContextResolution; readonly requested: RequestedEnterpriseContext | null; readonly requestedMismatch: boolean; readonly membership: MembershipVerdict }
  | { readonly outcome: 'deny'; readonly status: 401 | 403; readonly reason: DenyReason; readonly requested: RequestedEnterpriseContext | null; readonly internalEnterpriseId: InternalEnterpriseId | null; readonly membership: MembershipVerdict | null };
function isValidUserId(c: unknown): c is number {
  return typeof c === 'number' && Number.isInteger(c) && Number.isSafeInteger(c) && c > 0;
}
function normalizeClaim(claim: unknown): { key: ExternalEnterpriseKey; source: 'jwt_claim' | 'legacy' } | null {
  if (typeof claim === 'string') {
    if (!isWellFormedExternalKey(claim)) return null;
    return { key: claim, source: 'jwt_claim' };
  }
  if (typeof claim === 'number' && Number.isInteger(claim) && Number.isSafeInteger(claim) && claim > 0) {
    const key = `ent_${claim}`;
    if (!isWellFormedExternalKey(key)) return null;
    return { key, source: 'legacy' };
  }
  return null;
}
function sanitizeRequested(r: RequestedEnterpriseContext | null): RequestedEnterpriseContext | null {
  if (r === null || r === undefined || typeof r !== 'object') return null;
  const id = (r as RequestedEnterpriseContext).requestedEnterpriseId;
  const origin = (r as RequestedEnterpriseContext).origin;
  if (id !== null && id !== undefined && typeof id !== 'string') return null;
  if (origin !== null && origin !== undefined && origin !== 'path' && origin !== 'query' && origin !== 'header') return null;
  return { requestedEnterpriseId: (id as ExternalEnterpriseKey | null) ?? null, origin: (origin as 'path' | 'query' | 'header' | null) ?? null };
}
const FALLBACK_VERDICT: MembershipVerdict = { verified: false, subjectUserId: 0, externalEnterpriseKey: '', internalEnterpriseId: null, policy: 'deny-all' };
export async function resolveEnterpriseContext(input: ResolveEnterpriseContextInput): Promise<ResolveEnterpriseContextResult> {
  const mode: ResolutionMode = input.mode === 'enforce' ? 'enforce' : 'legacy';
  const requested = sanitizeRequested(input.requested);
  if (!isValidUserId(input.userId)) {
    return { outcome: 'deny', status: 401, reason: 'no-identity', requested, internalEnterpriseId: null, membership: null };
  }
  const userId = input.userId;
  if (input.enterpriseClaim === null || input.enterpriseClaim === undefined || input.enterpriseClaim === '') {
    return { outcome: 'deny', status: 403, reason: 'missing-claim', requested, internalEnterpriseId: null, membership: null };
  }
  const normalized = normalizeClaim(input.enterpriseClaim);
  if (normalized === null) {
    return { outcome: 'deny', status: 403, reason: 'malformed-claim', requested, internalEnterpriseId: null, membership: null };
  }
  const requestedId = requested?.requestedEnterpriseId ?? null;
  const mismatch = requestedId !== null && requestedId !== normalized.key;
  if (mismatch && mode === 'enforce') {
    let internal: InternalEnterpriseId | null = null;
    try { internal = translateExternalToInternal(normalized.key, input.lookup); } catch { internal = null; }
    return { outcome: 'deny', status: 403, reason: 'requested-mismatch', requested, internalEnterpriseId: internal, membership: null };
  }
  let internalId: InternalEnterpriseId | null = null;
  try { internalId = translateExternalToInternal(normalized.key, input.lookup); } catch { internalId = null; }
  if (internalId === null) {
    return { outcome: 'deny', status: 403, reason: 'unknown-enterprise', requested, internalEnterpriseId: null, membership: null };
  }
  let verdict: MembershipVerdict;
  try {
    verdict = await input.membership.hasMembership({ userId }, normalized.key, internalId);
  } catch {
    return { outcome: 'deny', status: 403, reason: 'membership-error', requested, internalEnterpriseId: internalId, membership: FALLBACK_VERDICT };
  }
  if (verdict === null || verdict === undefined || typeof verdict !== 'object') {
    return { outcome: 'deny', status: 403, reason: 'membership-error', requested, internalEnterpriseId: internalId, membership: FALLBACK_VERDICT };
  }
  return {
    outcome: 'authorized', status: 200,
    resolution: { authorizedEnterpriseId: normalized.key, internalEnterpriseId: internalId, membershipVerified: verdict.verified === true, source: normalized.source },
    requested, requestedMismatch: mismatch, membership: verdict,
  };
}

