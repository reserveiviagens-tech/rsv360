/**
 * WS-04 / S3 — EnterpriseMembershipPort + DenyAll (CONTRATO + POLITICA EXPLICITA).
 *
 * Contrato normativo: `.agents/shared/C36ID02_WS04_IMPLEMENTATION_PLAN.md` §10 (Anexo A, fatia S3).
 *
 * - O port e o UNICO ponto onde a validacao de membership pluga. WS-15 substitui APENAS
 *   a implementacao — nunca reescreve o resolver (S4) nem o contrato.
 * - `DenyAllMembershipPort` e politica explicita de negacao, NAO erro de infraestrutura:
 *   sempre resolve `verified=false`, sem consultar DB, sem I/O, sem roles, sem property.
 * - `membershipVerified=true` so existe quando houver prova real (WS-15). Ate la: false.
 * - Sincrono? Nao — assincrono por contrato (lookup real futuro faz I/O); DenyAll apenas
 *   nao usa I/O. Nunca lanca: erro interno da implementacao deve virar DENY no caller (S4).
 *
 * S3 NAO cria resolver (S4), middleware (S5), lookup real, roles, property, DB/migration.
 */

import type {
  ExternalEnterpriseKey,
  InternalEnterpriseId,
} from './enterprise-context.types';

/** Actor autenticado minimo necessario para a pergunta de membership. */
export interface MembershipSubject {
  readonly userId: number;
}

/** Resultado da pergunta "este usuario pertence a esta Enterprise?". */
export interface MembershipVerdict {
  /** true somente com prova de membership. DenyAll: sempre false. */
  readonly verified: boolean;
  /** Eco auditavel do que foi avaliado. Nunca autoriza por si so. */
  readonly subjectUserId: number;
  readonly externalEnterpriseKey: ExternalEnterpriseKey;
  readonly internalEnterpriseId: InternalEnterpriseId | null;
  /** Politica que produziu o veredito. Auditavel. */
  readonly policy: 'deny-all' | 'lookup';
}

/**
 * UNICO ponto de validacao de membership. Implementacao real (WS-15) pluga aqui.
 * Deve ser total: nunca lancar; indisponibilidade => `{ verified: false }` (fail-closed).
 */
export interface EnterpriseMembershipPort {
  hasMembership(
    subject: MembershipSubject,
    externalKey: ExternalEnterpriseKey,
    internalId: InternalEnterpriseId | null,
  ): Promise<MembershipVerdict>;
}

function isValidUserId(candidate: unknown): candidate is number {
  return (
    typeof candidate === 'number' &&
    Number.isInteger(candidate) &&
    Number.isSafeInteger(candidate) &&
    candidate > 0
  );
}

/**
 * Politica explicita de negacao (S3, transitória ate WS-15).
 * Pura: sem DB, sem I/O, sem roles, sem property, sem fallback, sem lancar.
 */
export class DenyAllMembershipPort implements EnterpriseMembershipPort {
  async hasMembership(
    subject: MembershipSubject,
    externalKey: ExternalEnterpriseKey,
    internalId: InternalEnterpriseId | null,
  ): Promise<MembershipVerdict> {
    const subjectUserId =
      subject !== null &&
      typeof subject === 'object' &&
      isValidUserId((subject as MembershipSubject).userId)
        ? (subject as MembershipSubject).userId
        : 0;
    const key: ExternalEnterpriseKey =
      typeof externalKey === 'string' ? externalKey : '';
    const internal: InternalEnterpriseId | null =
      typeof internalId === 'number' &&
      Number.isInteger(internalId) &&
      Number.isSafeInteger(internalId) &&
      internalId > 0
        ? internalId
        : null;
    return {
      verified: false,
      subjectUserId,
      externalEnterpriseKey: key,
      internalEnterpriseId: internal,
      policy: 'deny-all',
    };
  }
}
