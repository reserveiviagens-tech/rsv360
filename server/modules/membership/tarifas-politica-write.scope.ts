/**
 * G-C.9b.5 — Economic scope binding for PUT /politica-desconto (flag ON only).
 *
 * OD-9b5-A: anfitriao + global → DENY absoluto
 * OD-9b5-B: anfitriao + empreendimento → DENY
 * OD-9b5-C: anfitriao + acomodacao → ALLOW só se proprietarioId === auth.userId
 *
 * admin/manager: Enterprise Context (guard) + binding econômico:
 *   global → ALLOW
 *   empreendimento → hasEmpreendimentoAccess
 *   acomodacao → unidade existe + staff pode ver (obterUnidade)
 *
 * corretor/agente/promotor → DENY (não-MASTER)
 * Query/body/header enterpriseId/userId NÃO são autoridade.
 */
import type { AuthContext } from '../acomodacoes/services/anfitriao.service';

const STAFF_ROLES = new Set(['admin', 'manager']);
const MASTER_ROLES = new Set(['admin', 'manager', 'anfitriao']);

export type PoliticaWriteUnidadeResult =
  | { error: 'not_found' | 'forbidden' }
  | { data: unknown };

export type PoliticaWriteOwnerResult =
  | { not_found: true }
  | { proprietarioId: number | null };

export type PoliticaDescontoWritePorts = {
  /** Staff path: visibility via obterUnidade (includes staff bypass). */
  obterUnidade: (auth: AuthContext, id: number) => Promise<PoliticaWriteUnidadeResult>;
  /** Anfitriao path: ownership only — NOT cohost. */
  getUnitOwner: (acomodacaoId: number) => Promise<PoliticaWriteOwnerResult>;
  hasEmpreendimentoAccess: (auth: AuthContext, hotelId: string) => Promise<boolean>;
};

export type PoliticaDescontoWriteDecision =
  | { ok: true }
  | { ok: false; status: 403 | 404; reason: string };

export async function authorizePoliticaDescontoWrite(
  auth: AuthContext,
  scope: string | undefined,
  scopeId: string | null | undefined,
  ports: PoliticaDescontoWritePorts,
): Promise<PoliticaDescontoWriteDecision> {
  if (!MASTER_ROLES.has(auth.role)) {
    return { ok: false, status: 403, reason: 'role_not_master' };
  }

  const normalized =
    scope === undefined || scope === null || String(scope).trim() === ''
      ? 'global'
      : String(scope).trim();

  const isStaff = STAFF_ROLES.has(auth.role);
  const isAnfitriao = auth.role === 'anfitriao';

  if (normalized === 'global') {
    if (isAnfitriao) {
      return { ok: false, status: 403, reason: 'anfitriao_global_denied' };
    }
    if (isStaff) return { ok: true };
    return { ok: false, status: 403, reason: 'global_staff_only' };
  }

  if (normalized === 'empreendimento') {
    if (isAnfitriao) {
      return { ok: false, status: 403, reason: 'anfitriao_empreendimento_denied' };
    }
    if (scopeId === undefined || scopeId === null || String(scopeId).trim() === '') {
      return { ok: false, status: 403, reason: 'scope_id_required' };
    }
    try {
      const allowed = await ports.hasEmpreendimentoAccess(auth, String(scopeId).trim());
      if (!allowed) {
        return { ok: false, status: 403, reason: 'empreendimento_forbidden' };
      }
      return { ok: true };
    } catch {
      return { ok: false, status: 403, reason: 'empreendimento_error' };
    }
  }

  if (normalized === 'acomodacao') {
    if (scopeId === undefined || scopeId === null || String(scopeId).trim() === '') {
      return { ok: false, status: 403, reason: 'scope_id_required' };
    }
    const id = Number(scopeId);
    if (!Number.isFinite(id) || id <= 0) {
      return { ok: false, status: 403, reason: 'scope_id_invalid' };
    }

    if (isAnfitriao) {
      try {
        const owner = await ports.getUnitOwner(id);
        if ('not_found' in owner && owner.not_found) {
          return { ok: false, status: 404, reason: 'unit_not_found' };
        }
        const proprietarioId = (owner as { proprietarioId: number | null }).proprietarioId;
        if (proprietarioId !== auth.userId) {
          return { ok: false, status: 403, reason: 'anfitriao_not_owner' };
        }
        return { ok: true };
      } catch {
        return { ok: false, status: 403, reason: 'owner_lookup_error' };
      }
    }

    if (isStaff) {
      const scoped = await ports.obterUnidade(auth, id);
      if ('error' in scoped) {
        if (scoped.error === 'not_found') {
          return { ok: false, status: 404, reason: 'unit_not_found' };
        }
        return { ok: false, status: 403, reason: 'unit_forbidden' };
      }
      return { ok: true };
    }

    return { ok: false, status: 403, reason: 'role_not_allowed' };
  }

  return { ok: false, status: 403, reason: 'scope_unsupported' };
}
