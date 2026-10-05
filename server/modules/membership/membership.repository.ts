/**
 * WS-15 / S3 — Membership Record + Adapter Contract (CONTRATO, sem persistencia).
 *
 * I-S3-10: este arquivo NAO possui implementacao "temporaria" nem fallback de persistencia.
 * O unico adapter executavel e o InMemory, marcado explicitamente como TEST DOUBLE.
 * O adapter persistente (enterprise_users) nasce atras do MIGRATION GATE.
 *
 * I-S3-08: `externalEnterpriseKey` e' preservado como eco/auditoria. A identidade interna
 * (internalEnterpriseId, serial) e' a UNICA chave de lookup. Nunca `Number(externalKey)`.
 * I-S3-09: PropertyUser NAO participa do lookup (nao ha campo para ele aqui).
 * I-S3-11/12: o adapter NAO concede role nem permission — so o MembershipVerdict de S2.
 */
import type {
  ExternalEnterpriseKey,
  InternalEnterpriseId,
} from '../multi-property/context/enterprise-context.types';
import type {
  EnterpriseMembershipPort,
  MembershipSubject,
  MembershipVerdict,
} from '../multi-property/context/enterprise-membership.port';
import {
  buildMembershipVerdict,
  type MembershipPolicy,
} from './membership.verdict';
import type { MembershipStatus } from './membership.types';

/** Registro de membership enterprise-level. Fonte: futura `enterprise_users` [MIGRATION GATE]. */
export interface MembershipRecord {
  readonly subjectUserId: number;
  readonly internalEnterpriseId: InternalEnterpriseId;
  readonly status: MembershipStatus;
  /** Eco auditavel apenas. NUNCA usado como chave de lookup (I-S3-08). */
  readonly externalEnterpriseKey: ExternalEnterpriseKey;
}

/**
 * Adapter: UNICA fonte de prova de membership.
 * Total: nunca lanca. Erro => `status='not_found'`, `reason='lookup-error'` (I-S3-05).
 */
export interface MembershipRepositoryAdapter {
  findMembership(
    subjectUserId: number,
    internalEnterpriseId: InternalEnterpriseId,
  ): Promise<MembershipRecord | null>;
}

function isValidId(v: unknown): v is number {
  return typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
}

/**
 * Adapter InMemory — TEST DOUBLE (jest/manual). NAO e persistencia (I-S3-10).
 * Snapshot defensivo na construcao; leituras nao mutam o estado.
 */
export class InMemoryMembershipRepository implements MembershipRepositoryAdapter {
  private readonly rows: readonly MembershipRecord[];

  constructor(records: readonly MembershipRecord[] = []) {
    this.rows = Object.freeze(
      (Array.isArray(records) ? records : []).filter(
        (r) =>
          r !== null &&
          typeof r === 'object' &&
          isValidId(r.subjectUserId) &&
          isValidId(r.internalEnterpriseId) &&
          typeof r.status === 'string' &&
          typeof r.externalEnterpriseKey === 'string',
      ),
    );
  }

  async findMembership(
    subjectUserId: number,
    internalEnterpriseId: InternalEnterpriseId,
  ): Promise<MembershipRecord | null> {
    const found = this.rows.find(
      (r) => r.subjectUserId === subjectUserId && r.internalEnterpriseId === internalEnterpriseId,
    );
    return found ?? null;
  }
}

/**
 * Implementacao do boundary do WS-04 (`EnterpriseMembershipPort`) sobre um adapter.
 * Compõe S2 (veredict canonico) + S3 (adapter). Nao duplica o resolver do WS-04.
 */
export class MembershipAuthorityPort implements EnterpriseMembershipPort {
  constructor(
    private readonly adapter: MembershipRepositoryAdapter,
    private readonly policy: MembershipPolicy = 'lookup',
  ) {}

  async hasMembership(
    subject: MembershipSubject,
    externalKey: ExternalEnterpriseKey,
    internalId: InternalEnterpriseId | null,
  ): Promise<MembershipVerdict> {
    const subjectUserId = subject !== null && typeof subject === 'object' ? subject.userId : 0;
    const key = typeof externalKey === 'string' ? externalKey : '';
    const internal = isValidId(internalId) ? internalId : null;

    // Identidade ou enterprise nao resolvidos => negacao sem tocar o adapter.
    if (!isValidId(subjectUserId) || internal === null) {
      return buildMembershipVerdict({
        subjectUserId,
        externalKey: key,
        internalId: internal,
        status: 'not_found',
        policy: this.policy,
      }) as MembershipVerdict;
    }

    let record: MembershipRecord | null = null;
    let lookupFailed = false;
    try {
      record = await this.adapter.findMembership(subjectUserId, internal);
    } catch {
      lookupFailed = true; // I-S3-05 — excecao NUNCA vira ALLOW
    }

    // `record` pode ser `undefined` se um adapter violar o contrato: tratar como ausencia.
    const found: MembershipRecord | null =
      record !== null && typeof record === 'object' ? (record as MembershipRecord) : null;

    const canonical = buildMembershipVerdict({
      subjectUserId,
      externalKey: key,
      internalId: internal,
      status: found === null ? 'not_found' : found.status,
      policy: this.policy,
      lookupFailed,
    });

    // Eco do registro preserva a external key do servidor (I-S3-08), sem alterar decisao.
    return {
      verified: canonical.verified,
      subjectUserId: canonical.subjectUserId,
      externalEnterpriseKey:
        found === null ? canonical.externalEnterpriseKey : found.externalEnterpriseKey,
      internalEnterpriseId: canonical.internalEnterpriseId,
      policy: canonical.policy,
    } as MembershipVerdict;
  }
}
