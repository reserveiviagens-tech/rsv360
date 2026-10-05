/**
 * WS-04 / S1 — Canonical Enterprise Context types (TIPAGEM, SEM RUNTIME).
 *
 * Contrato normativo: `.agents/shared/C36ID02_WS04_IMPLEMENTATION_PLAN.md` §8.
 * - `ExternalEnterpriseKey` (string) = fronteira API/JWT/URL — carrier de contexto SOLICITADO.
 * - `InternalEnterpriseId` (number) = `enterprises.id` serial — leitura apenas.
 * - `EnterpriseContextResolution.authorizedEnterpriseId` = ÚNICA autoridade de tenant pós-WS-04.
 * - `membershipVerified` = false até WS-15 entregar o lookup real (dívida explícita, E-12).
 * - `source: 'legacy'` marca claim numérico normalizado (§8.4 item 5) — nunca autoridade extra.
 *
 * S1 NÃO cria runtime, NÃO altera comportamento, NÃO toca DB/migration.
 */

export type ExternalEnterpriseKey = string; // 'ent_*' | uuid (fronteira API/JWT/URL)
export type InternalEnterpriseId = number; // enterprises.id (serial) — leitura apenas

export interface EnterpriseContextResolution {
  /** Contexto AUTORIZADO pelo servidor. Única autoridade de tenant após WS-04. */
  authorizedEnterpriseId: ExternalEnterpriseKey;
  /** Id interno traduzido, quando determinístico. `null` ⇒ não traduzível ⇒ DENY no caller. */
  internalEnterpriseId: InternalEnterpriseId | null;
  /** true somente quando existir prova de membership (WS-15). Até lá: false. */
  membershipVerified: boolean;
  /** Como o contexto foi provado. Auditável. */
  source: 'jwt_claim' | 'legacy';
}

export interface RequestedEnterpriseContext {
  /** Contexto SOLICITADO pelo cliente (path/query/header). Nunca é autoridade (I-04). */
  requestedEnterpriseId: ExternalEnterpriseKey | null;
  origin: 'path' | 'query' | 'header' | null;
}
