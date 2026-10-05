/**
 * WS-04 / S6 — Declared enterprise claim (FUNCAO PURA, R8).
 *
 * R8: `req.user.enterpriseId` deixa de ser autoridade por si so: passa a ser
 * `identity.enterpriseIdClaim` (declarado). A autoridade final e SEMPRE
 * `req.authorizedEnterpriseContext`, atribuido pelo resolver S4 (R9).
 *
 * Regras: string bem-formada => declarada como esta; numero legado > 0 =>
 * normalizada `ent_<n>` (source legacy); resto (ausente/invalido/adulterado)
 * => `null` (nunca default, nunca fallback). Sem DB/I-O, sem membership, sem RBAC.
 */
import { isWellFormedExternalKey } from './enterprise-key-bridge';
import type { ExternalEnterpriseKey } from './enterprise-context.types';

export type EnterpriseClaimSource = 'jwt_claim' | 'legacy';

export interface DeclaredEnterpriseClaim {
  readonly key: ExternalEnterpriseKey;
  readonly source: EnterpriseClaimSource;
}

export function normalizeEnterpriseClaim(candidate: unknown): DeclaredEnterpriseClaim | null {
  if (typeof candidate === 'string') {
    if (!isWellFormedExternalKey(candidate)) return null;
    return { key: candidate, source: 'jwt_claim' };
  }
  if (
    typeof candidate === 'number' &&
    Number.isInteger(candidate) &&
    Number.isSafeInteger(candidate) &&
    candidate > 0
  ) {
    const key = `ent_${candidate}`;
    if (!isWellFormedExternalKey(key)) return null;
    return { key, source: 'legacy' };
  }
  return null;
}
