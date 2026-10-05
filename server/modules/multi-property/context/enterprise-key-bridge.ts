/**
 * WS-04 / S2 — External -> Internal enterprise key bridge (FUNCAO PURA).
 *
 * Contrato normativo: `.agents/shared/C36ID02_WS04_IMPLEMENTATION_PLAN.md` §9 (Anexo A, fatia S2).
 *
 * Propriedades garantidas:
 * - NAO e autoridade: retorna apenas `InternalEnterpriseId | null`. Quem decide ALLOW/DENY
 *   e o resolver (S4) / middleware (S5). `null` significa "sem traducao" => DENY no caller.
 * - NAO executa membership, NAO decide autorizacao, NAO resolve property.
 * - NAO acessa DB, NAO faz I/O: o `EnterpriseKeyLookup` e injetado pelo caller (S4);
 *   a implementacao estatica auditada abaixo e apenas um mapa em memoria.
 * - SEM fallback: chave desconhecida, malformada ou ausente => `null`. Nunca `1`, nunca
 *   derivacao numerica da chave, nunca normalizacao silenciosa (espacos => rejeicao).
 * - Sincrona e total: nunca lanca excecao; lookup indisponivel (throw) => `null` (fail-closed).
 *
 * S2 NAO cria runtime de rota, NAO altera comportamento existente, NAO toca DB/migration.
 */

import type {
  ExternalEnterpriseKey,
  InternalEnterpriseId,
} from './enterprise-context.types';

/** Fonte de mapeamento external -> internal. Implementacao real (DB) chega atras do resolver S4. */
export interface EnterpriseKeyLookup {
  findInternalId(externalKey: ExternalEnterpriseKey): InternalEnterpriseId | null;
}

const ENT_PATTERN = /^ent_[A-Za-z0-9_-]{1,64}$/;
const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Allowlist conservadora de formato (S2). Chaves fora destes dois formatos sao rejeitadas
 * sem consulta ao lookup. Extensoes futuras exigem aditivo ao plano.
 */
export function isWellFormedExternalKey(candidate: unknown): candidate is ExternalEnterpriseKey {
  if (typeof candidate !== 'string') return false;
  if (candidate.length === 0) return false;
  if (candidate.trim() !== candidate) return false;
  return ENT_PATTERN.test(candidate) || UUID_PATTERN.test(candidate);
}

function isValidInternalId(candidate: unknown): candidate is InternalEnterpriseId {
  return (
    typeof candidate === 'number' &&
    Number.isInteger(candidate) &&
    Number.isSafeInteger(candidate) &&
    candidate > 0
  );
}

/** Traducao deterministica: mesma entrada + mesmo lookup => mesma saida, sem efeitos colaterais. */
export function translateExternalToInternal(
  externalKey: unknown,
  lookup: EnterpriseKeyLookup,
): InternalEnterpriseId | null {
  if (!isWellFormedExternalKey(externalKey)) return null;
  let resolved: unknown;
  try {
    resolved = lookup.findInternalId(externalKey);
  } catch {
    return null;
  }
  if (!isValidInternalId(resolved)) return null;
  return resolved;
}

/**
 * Lookup estatico auditado (mapa em memoria, snapshot por copia).
 * `hasOwnProperty` bloqueia hits via prototype chain; valores invalidos => `null`.
 */
export function createStaticEnterpriseKeyLookup(
  entries: Readonly<Record<string, number>>,
): EnterpriseKeyLookup {
  const snapshot: Record<string, number> = { ...entries };
  return {
    findInternalId(externalKey: ExternalEnterpriseKey): InternalEnterpriseId | null {
      if (!Object.prototype.hasOwnProperty.call(snapshot, externalKey)) return null;
      const id: unknown = snapshot[externalKey];
      return isValidInternalId(id) ? id : null;
    },
  };
}
