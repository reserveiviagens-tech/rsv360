/**
 * WS-04 / S5 — Authorized enterprise context middleware (ADAPTADOR, NAO AUTORIDADE).
 *
 * A UNICA autoridade e o resolver S4 (`resolveEnterpriseContext`), que compoe
 * S1 (tipos) + S2 (bridge) + S3 (membership port). Este middleware apenas:
 *  1. extrai identidade de `req.user` (preenchido pela autenticacao a montante);
 *  2. extrai o CLAIM de `req.user.enterpriseId` (identidade declarada, nao prova);
 *  3. extrai o REQUESTED (intencao do cliente: path > query > header);
 *  4. delega a decisao ao resolver e publica o resultado em `req.*`.
 *
 * Invariantes (Plano §0, gate S5):
 * - `req.body.enterpriseId` NUNCA e lido (A-1 §5). Corpo nao e carrier.
 * - carrier (path/query/header) NUNCA vira autoridade: so popula
 *   `req.requestedEnterpriseContext`. Em `enforce`, mismatch => 403.
 * - `req.enterpriseId` legado NAO e escrito nem lido aqui (W1-F3: sem dual authority).
 * - Modo default `legacy`; `enforce` somente via env explicito (TEST-ONLY ate WS-15 PASS + Owner).
 * - Sem RBAC, sem property, sem DB/I-O, sem fallback `ent_1`/`1`.
 */
import type { NextFunction, Request, Response } from 'express';
import { resolveEnterpriseContext, type ResolutionMode } from './enterprise-context.resolver';
import { createStaticEnterpriseKeyLookup, type EnterpriseKeyLookup } from './enterprise-key-bridge';
import { DenyAllMembershipPort, type EnterpriseMembershipPort } from './enterprise-membership.port';
import type { RequestedEnterpriseContext } from './enterprise-context.types';

export type { ResolutionMode };

export interface AuthorizedContextMiddlewareDeps {
  lookup?: EnterpriseKeyLookup;
  membership?: EnterpriseMembershipPort;
  mode?: ResolutionMode;
}

function readClaim(req: Request): unknown {
  const user = (req as { user?: { enterpriseId?: unknown } }).user;
  if (user === null || user === undefined || typeof user !== 'object') return undefined;
  return (user as { enterpriseId?: unknown }).enterpriseId;
}

function readUserId(req: Request): unknown {
  const user = (req as { user?: { id?: unknown } }).user;
  if (user === null || user === undefined || typeof user !== 'object') return undefined;
  return (user as { id?: unknown }).id;
}

/** Ordem deterministica: path > query > header. Corpo NUNCA e carrier (A-1 §5). */
function extractRequested(req: Request): RequestedEnterpriseContext | null {
  const params = (req.params ?? {}) as Record<string, unknown>;
  const query = (req.query ?? {}) as Record<string, unknown>;
  const headers = (req.headers ?? {}) as Record<string, unknown>;
  const fromPath = params.enterpriseId;
  if (typeof fromPath === 'string' && fromPath.length > 0) {
    return { requestedEnterpriseId: fromPath, origin: 'path' };
  }
  const fromQuery = query.enterpriseId;
  if (typeof fromQuery === 'string' && fromQuery.length > 0) {
    return { requestedEnterpriseId: fromQuery, origin: 'query' };
  }
  const headerRaw = headers['x-enterprise-id'];
  const fromHeader = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;
  if (typeof fromHeader === 'string' && fromHeader.length > 0) {
    return { requestedEnterpriseId: fromHeader, origin: 'header' };
  }
  return null;
}

function resolveMode(explicit: ResolutionMode | undefined): ResolutionMode {
  if (explicit === 'enforce' || explicit === 'legacy') return explicit;
  return process.env.AUTHZ_ENTERPRISE_CONTEXT_MODE === 'enforce' ? 'enforce' : 'legacy';
}

export function createAuthorizedContextMiddleware(deps: AuthorizedContextMiddlewareDeps = {}) {
  const lookup = deps.lookup ?? createStaticEnterpriseKeyLookup({});
  const membership = deps.membership ?? new DenyAllMembershipPort();
  const mode = resolveMode(deps.mode);
  return async function authorizedContextMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const requested = extractRequested(req);
    req.requestedEnterpriseContext = requested ?? undefined;
    try {
      const result = await resolveEnterpriseContext({
        userId: readUserId(req),
        enterpriseClaim: readClaim(req),
        requested,
        mode,
        lookup,
        membership,
      });
      if (result.outcome === 'deny') {
        res.status(result.status).json({ error: 'enterprise_context_denied', reason: result.reason });
        return;
      }
      req.authorizedEnterpriseContext = result.resolution;
      next();
    } catch {
      res.status(403).json({ error: 'enterprise_context_denied', reason: 'membership-error' });
    }
  };
}
