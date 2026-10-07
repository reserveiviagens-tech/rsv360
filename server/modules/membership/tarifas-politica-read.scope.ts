/**
 * G-C.9b.4 — Partner / economic scope binding for GET /politica-desconto (flag ON).
 *
 * OD-9b4-A: scope ausente → DENY
 * OD-9b4-B: scope=global → somente staff (admin|manager)
 * OD-9b4-C: scope=empreendimento → binding Partner comprovado ao hotelId
 * scope=acomodacao → obterUnidade (owner/carteira/staff)
 *
 * Query scope/scopeId NÃO são autoridade; apenas inputs a validar.
 */
import type { AuthContext } from '../acomodacoes/services/anfitriao.service';

const STAFF_ROLES = new Set(['admin', 'manager']);

export type PoliticaReadUnidadeResult =
  | { error: 'not_found' | 'forbidden' }
  | { data: unknown };

export type PoliticaDescontoReadPorts = {
  obterUnidade: (auth: AuthContext, id: number) => Promise<PoliticaReadUnidadeResult>;
  hasEmpreendimentoAccess: (auth: AuthContext, hotelId: string) => Promise<boolean>;
};

export type PoliticaDescontoReadDecision =
  | { ok: true }
  | { ok: false; status: 403 | 404; reason: string };

export async function authorizePoliticaDescontoRead(
  auth: AuthContext,
  scope: string | undefined,
  scopeId: string | undefined,
  ports: PoliticaDescontoReadPorts,
): Promise<PoliticaDescontoReadDecision> {
  if (scope === undefined || scope === null || String(scope).trim() === '') {
    return { ok: false, status: 403, reason: 'scope_required' };
  }

  const normalized = String(scope).trim();

  if (normalized === 'global') {
    if (!STAFF_ROLES.has(auth.role)) {
      return { ok: false, status: 403, reason: 'global_staff_only' };
    }
    return { ok: true };
  }

  if (normalized === 'acomodacao') {
    if (scopeId === undefined || scopeId === null || String(scopeId).trim() === '') {
      return { ok: false, status: 403, reason: 'scope_id_required' };
    }
    const id = Number(scopeId);
    if (!Number.isFinite(id) || id <= 0) {
      return { ok: false, status: 403, reason: 'scope_id_invalid' };
    }
    const scoped = await ports.obterUnidade(auth, id);
    if ('error' in scoped) {
      if (scoped.error === 'not_found') {
        return { ok: false, status: 404, reason: 'unit_not_found' };
      }
      return { ok: false, status: 403, reason: 'unit_forbidden' };
    }
    return { ok: true };
  }

  if (normalized === 'empreendimento') {
    if (scopeId === undefined || scopeId === null || String(scopeId).trim() === '') {
      return { ok: false, status: 403, reason: 'scope_id_required' };
    }
    const hotelId = String(scopeId).trim();
    try {
      const allowed = await ports.hasEmpreendimentoAccess(auth, hotelId);
      if (!allowed) {
        return { ok: false, status: 403, reason: 'empreendimento_forbidden' };
      }
      return { ok: true };
    } catch {
      return { ok: false, status: 403, reason: 'empreendimento_error' };
    }
  }

  return { ok: false, status: 403, reason: 'scope_unsupported' };
}
