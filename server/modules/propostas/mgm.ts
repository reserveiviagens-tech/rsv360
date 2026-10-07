import { and, eq } from 'drizzle-orm';
import { db } from '../../lib/db';
import { indicacoes } from '../../../backend/src/db/schema/indicacoes';

export type RegistrarIndicacaoInput = {
  indicadorId: number;
  tokenProposta: string;
  canal?: string;
  indicadoEmail?: string;
  indicadoTelefone?: string;
};

/**
 * G-D.10 / OD-GD-10 — `body.indicadorId` NÃO é autoridade.
 *
 * authenticated user id → indicador autorizado (server-side binding)
 * body.indicadorId opcional → hint; match continua; diverge → DENY
 * sem identidade autenticada válida → DENY
 */
export type ResolveIndicadorIdResult =
  | { ok: true; indicadorId: number }
  | {
      ok: false;
      status: 401 | 403;
      reason: 'unauthenticated' | 'indicador_mismatch';
    };

export function resolveIndicadorIdFromAuth(opts: {
  authenticatedUserId?: number | null;
  bodyIndicadorId?: unknown;
}): ResolveIndicadorIdResult {
  const raw = opts.authenticatedUserId;
  const authId = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(authId) || authId <= 0) {
    return { ok: false, status: 401, reason: 'unauthenticated' };
  }

  const bodyRaw = opts.bodyIndicadorId;
  if (bodyRaw !== undefined && bodyRaw !== null && bodyRaw !== '') {
    const bodyId = Number(bodyRaw);
    if (!Number.isFinite(bodyId) || bodyId !== authId) {
      return { ok: false, status: 403, reason: 'indicador_mismatch' };
    }
  }

  return { ok: true, indicadorId: authId };
}

export function montarUrlIndicacao(
  siteUrl: string,
  tokenProposta: string,
  indicadorId: number,
  canal?: string,
): string {
  const params = new URLSearchParams({ ref: String(indicadorId) });
  if (canal) params.set('canal', canal);
  const base = siteUrl.replace(/\/$/, '');
  return `${base}/proposta/${encodeURIComponent(tokenProposta)}?${params.toString()}`;
}

export async function registrarIndicacao(input: RegistrarIndicacaoInput) {
  const [existing] = await db
    .select()
    .from(indicacoes)
    .where(
      and(
        eq(indicacoes.tokenProposta, input.tokenProposta),
        eq(indicacoes.indicadorId, input.indicadorId),
      ),
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(indicacoes)
    .values({
      indicadorId: input.indicadorId,
      tokenProposta: input.tokenProposta,
      canal: input.canal ?? null,
      indicadoEmail: input.indicadoEmail ?? null,
      indicadoTelefone: input.indicadoTelefone ?? null,
      statusIndicacao: 'pendente',
    })
    .returning();

  return created;
}

export async function marcarConversaoIndicacao(tokenProposta: string, indicadorId: number) {
  const [updated] = await db
    .update(indicacoes)
    .set({ statusIndicacao: 'convertida', dataConversao: new Date() })
    .where(
      and(eq(indicacoes.tokenProposta, tokenProposta), eq(indicacoes.indicadorId, indicadorId)),
    )
    .returning();
  return updated ?? null;
}
