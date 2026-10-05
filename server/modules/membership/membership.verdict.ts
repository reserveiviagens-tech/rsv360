/**
 * WS-15 / S2 — MembershipVerdict canonico (CONTRATO). Fecha o boundary do WS-04.
 *
 * Invariantes implementadas aqui:
 *  - I-05 unknown membership != ALLOW
 *  - I-06 lookup error != ALLOW   (status 'error' NUNCA autoriza)
 *  - verified=true SOMENTE com status 'active' + identidade valida + enterprise resolvida
 *  - `PropertyUser` NUNCA entra como fonte (I-04) — nao ha parametro para ele.
 *  - Status de papel e membership sao SEPARADOS: status da membership governa `verified`;
 *    papeis/PRIVILEGIOS sao avaliados em etapa posterior (S5/S6), nunca aqui.
 */
import type {
  ExternalEnterpriseKey,
  InternalEnterpriseId,
} from '../multi-property/context/enterprise-context.types';
import { isAuthorizingStatus, type MembershipStatus } from './membership.types';

export interface MembershipSubjectInput {
  readonly userId: number;
}

export type MembershipPolicy = 'deny-all' | 'lookup';

/** Motivo da negacao — auditavel; nunca concede autoridade. */
export type MembershipDenyReason =
  | 'no-membership'
  | 'inactive'
  | 'suspended'
  | 'revoked'
  | 'lookup-error'
  | 'invalid-subject'
  | 'unresolved-enterprise';

export interface CanonicalMembershipVerdict {
  readonly verified: boolean;
  readonly status: MembershipStatus;
  readonly subjectUserId: number;
  readonly externalEnterpriseKey: ExternalEnterpriseKey;
  readonly internalEnterpriseId: InternalEnterpriseId | null;
  readonly policy: MembershipPolicy;
  readonly reason: MembershipDenyReason | null;
}

function isValidUserId(v: unknown): v is number {
  return typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
}

/** Construtor fail-closed: unknown status => negacao. Nunca lanca. */
export function buildMembershipVerdict(input: {
  subjectUserId: unknown;
  externalKey: unknown;
  internalId: unknown;
  status: unknown;
  policy: MembershipPolicy;
  /** true quando a implementacao teve erro de lookup (I-06). */
  lookupFailed?: boolean;
}): CanonicalMembershipVerdict {
  const subjectUserId = isValidUserId(input.subjectUserId) ? input.subjectUserId : 0;
  const externalEnterpriseKey =
    typeof input.externalKey === 'string' ? input.externalKey : '';
  const internalEnterpriseId = isValidUserId(input.internalId) ? input.internalId : null;

  let status: MembershipStatus;
  let verified = false;
  let reason: MembershipDenyReason | null = null;

  if (input.lookupFailed) {
    status = 'not_found';
    reason = 'lookup-error';
  } else if (input.status === 'error' || (typeof input.status === 'string' && !(input.status in { active: 1, inactive: 1, suspended: 1, revoked: 1, not_found: 1 }))) {
    status = 'not_found';
    reason = 'lookup-error';
  } else {
    status = input.status as MembershipStatus;
    if (!isAuthorizingStatus(status)) {
      verified = false;
      reason =
        status === 'not_found'
          ? 'no-membership'
          : (status as MembershipDenyReason);
    } else if (subjectUserId === 0) {
      verified = false;
      reason = 'invalid-subject';
    } else if (internalEnterpriseId === null) {
      verified = false;
      reason = 'unresolved-enterprise';
    } else {
      verified = true;
      reason = null;
    }
  }

  return {
    verified,
    status,
    subjectUserId,
    externalEnterpriseKey,
    internalEnterpriseId,
    policy: input.policy,
    reason,
  };
}
