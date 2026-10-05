/**
 * WS-15 / S4 — Membership Authority PLUG (selecao de implementacao, TEST-ONLY).
 *
 * REGRA INEGOCIAVEL: `DenyAllMembershipPort` e o DEFAULT. O `MembershipAuthorityPort` (S3)
 * so e plugado quando a flag experimental `ws15MembershipAuthority` esta LIGADA.
 * Flag ausente, invalida ou != 'true' => DenyAll. Nao ha caminho implicito para o adapter.
 *
 * Nao altera o resolver do WS-04 (F-6 nao e tocado): o plug apenas escolhe QUAL port o
 * resolver recebe. A matriz fail-closed do resolver permanece intacta.
 */
import {
  DenyAllMembershipPort,
  type EnterpriseMembershipPort,
} from '../multi-property/context/enterprise-membership.port';
import { MembershipAuthorityPort, type MembershipRepositoryAdapter } from './membership.repository';

/** Nome da flag experimental (ambiente). TEST-ONLY ate WS-15 PASS + Owner. */
export const WS15_MEMBERSHIP_FLAG = 'WS15_MEMBERSHIP_AUTHORITY';

/**
 * Le a flag de um objeto env-like. Ausente/invalida/!= 'true' => false (DenyAll).
 * Aceita apenas a string exata 'true' (case-insensitive), sem truthiness implicita.
 */
export function isMembershipAuthorityEnabled(
  env: Record<string, unknown> | null | undefined,
): boolean {
  if (env === null || env === undefined || typeof env !== 'object') return false;
  const raw = (env as Record<string, unknown>)[WS15_MEMBERSHIP_FLAG];
  return typeof raw === 'string' && raw.trim().toLowerCase() === 'true';
}

export interface MembershipPlugOptions {
  /**
   * Adapter de membership. OBRIGATORIO para ligar a flag: se ausente, o plug DEGRADA
   * para DenyAll em vez de lançar ou autorizar (fail-closed na configuração).
   */
  adapter?: MembershipRepositoryAdapter | null;
  env?: Record<string, unknown> | null;
  /** Default explicito (usado por testes). Ausente => leitura do `env`. */
  enabled?: boolean;
}

/**
 * Retorna o port a ser injetado no resolver.
 * flag OFF/ausente/invalida  => DenyAllMembershipPort (comportamento WS-04 preservado)
 * flag ON + adapter           => MembershipAuthorityPort
 * flag ON + adapter ausente   => DenyAllMembershipPort (degradacao segura)
 */
export function selectMembershipPort(options: MembershipPlugOptions = {}): EnterpriseMembershipPort {
  const enabled =
    typeof options.enabled === 'boolean'
      ? options.enabled
      : isMembershipAuthorityEnabled(options.env ?? null);
  if (!enabled) return new DenyAllMembershipPort();
  if (options.adapter === null || options.adapter === undefined) return new DenyAllMembershipPort();
  return new MembershipAuthorityPort(options.adapter, 'lookup');
}
