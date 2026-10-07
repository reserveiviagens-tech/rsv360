/**
 * WS-15 / M5 — Enterprise RoleAssignment Repository (persistencia real).
 *
 * Implementa `MembershipRepositoryAdapter` sobre a tabela `enterprise_users`
 * (0064, M1 D1-D7): lookup por (user_id, enterprise_id) com enterprise vinda
 * EXCLUSIVAMENTE do contexto autorizado (D10). Ausencia/invalido => null =>
 * DENY no veredito S2. Erro => null (I-S3-05: excecao NUNCA vira ALLOW).
 * Role lido via `findRole` (M1 D2/D8); S2/S5/S6 inalterados.
 *
 * S7-safe: NAO importa `pg`/drizzle/knex (I-S7-09/10). Recebe um query-runner
 * injetavel (`PgQueryRunner`) — o wiring real (Pool) vive fora do modulo
 * membership (M6/app composition). Sem runner => unconfigured (fail-closed).
 */
import type { InternalEnterpriseId } from '../multi-property/context/enterprise-context.types';
import {
  isCanonicalRole,
  isAuthorizingStatus,
  type EnterpriseRole,
  type MembershipStatus,
} from './membership.types';
import type {
  MembershipRecord,
  MembershipRepositoryAdapter,
} from './membership.repository';

/** Runner minimo injetavel (ex.: pg Pool). Erro => tratado como ausencia. */
export interface PgQueryRunner {
  query(text: string, params: readonly unknown[]): Promise<{ rows: readonly unknown[] }>;
}

function isValidId(v: unknown): v is number {
  return typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
}

interface AssignmentRow {
  readonly status: unknown;
  readonly role: unknown;
}

function toRecord(
  subjectUserId: number,
  internalEnterpriseId: InternalEnterpriseId,
  row: AssignmentRow | null,
): MembershipRecord | null {
  if (row === null) return null;
  const s = row.status;
  const status: MembershipStatus =
    typeof s === 'string' && isAuthorizingStatus(s)
      ? s
      : typeof s === 'string' && (s === 'inactive' || s === 'suspended' || s === 'revoked')
        ? (s as MembershipStatus)
        : 'not_found';
  return {
    subjectUserId,
    internalEnterpriseId,
    status,
    externalEnterpriseKey: '',
  };
}

/**
 * Adapter persistente real. `findMembership` = prova de membership (S3);
 * `findRole` = papel persistido (M1 D2/D8) — so valido com membership active
 * (o caller S5 compoe com membershipVerified; role sozinho NUNCA autoriza).
 */
export class PgEnterpriseUsersRepository implements MembershipRepositoryAdapter {
  /** Fail-closed quando nao configurado (sem runner). */
  readonly isConfigured: boolean;

  constructor(private readonly runner: PgQueryRunner | null = null) {
    this.isConfigured = runner !== null;
  }

  private async fetchAssignment(
    subjectUserId: number,
    internalEnterpriseId: InternalEnterpriseId,
  ): Promise<AssignmentRow | null> {
    if (this.runner === null) return null;
    try {
      const res = await this.runner.query(
        `select status, role from enterprise_users
          where user_id = $1 and enterprise_id = $2 limit 1`,
        [subjectUserId, internalEnterpriseId],
      );
      const row = res.rows[0] as AssignmentRow | undefined;
      return row ?? null;
    } catch {
      return null; // I-S3-05 — erro vira ausencia (DENY no caller)
    }
  }

  async findMembership(
    subjectUserId: number,
    internalEnterpriseId: InternalEnterpriseId,
  ): Promise<MembershipRecord | null> {
    if (!isValidId(subjectUserId) || !isValidId(internalEnterpriseId)) return null;
    const row = await this.fetchAssignment(subjectUserId, internalEnterpriseId);
    return toRecord(subjectUserId, internalEnterpriseId, row);
  }

  async findRole(
    subjectUserId: number,
    internalEnterpriseId: InternalEnterpriseId,
  ): Promise<EnterpriseRole | null> {
    if (!isValidId(subjectUserId) || !isValidId(internalEnterpriseId)) return null;
    const row = await this.fetchAssignment(subjectUserId, internalEnterpriseId);
    if (row === null || row.status !== 'active') return null;
    return isCanonicalRole(row.role) ? row.role : null;
  }
}

