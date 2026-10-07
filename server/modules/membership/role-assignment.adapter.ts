/**
 * WS-15 / M6 — Canonical Role Adapter (wiring, NAO autoridade nova).
 *
 * Conecta a autoridade persistente `enterprise_users.role` (M4/M5) ao
 * `recordRole` do `buildRoleContext` (S5): role persistido + membership
 * verificada => CanonicalRoleContext source `membership-record` (M1 D8).
 * NUNCA le req/claim/body/query/header/users.role/property_users.
 * Role sozinho NUNCA autoriza (guards S6 exigem membershipVerified + papel).
 * Erro/ausencia => contexto vazio (DENY nos guards).
 */
import type { InternalEnterpriseId } from '../multi-property/context/enterprise-context.types';
import { buildRoleContext, type CanonicalRoleContext } from './role.context';
import type { PgEnterpriseUsersRepository } from './role-assignment.repository';

function isValidId(v: unknown): v is number {
  return typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
}

export interface CanonicalAdapterInput {
  readonly subjectUserId: unknown;
  readonly internalEnterpriseId: unknown;
  readonly membershipVerified: boolean;
}

export async function resolveCanonicalRoleContext(
  repository: Pick<PgEnterpriseUsersRepository, 'findRole'> | null,
  input: CanonicalAdapterInput,
): Promise<CanonicalRoleContext> {
  if (repository === null || repository === undefined) return buildRoleContext({});
  if (input.membershipVerified !== true) return buildRoleContext({ membershipVerified: false });
  if (!isValidId(input.subjectUserId) || !isValidId(input.internalEnterpriseId)) {
    return buildRoleContext({ membershipVerified: false });
  }
  try {
    const role = await repository.findRole(
      input.subjectUserId as number,
      input.internalEnterpriseId as InternalEnterpriseId,
    );
    return buildRoleContext({
      recordRole: role ?? undefined,
      membershipVerified: true,
    });
  } catch {
    return buildRoleContext({ membershipVerified: false });
  }
}
