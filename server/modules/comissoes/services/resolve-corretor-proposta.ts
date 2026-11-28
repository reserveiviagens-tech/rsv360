import { and, asc, eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { acomodacoes } from '../../../../backend/src/db/schema/acomodacoes';
import { carteiraCorretor } from '../../../../backend/src/db/schema/carteira-corretor';

/**
 * Corretor ativo na carteira do proprietário da acomodação (MVP-B).
 * Se houver vários, usa o vínculo mais antigo (criado_em ASC).
 */
export async function resolveCorretorIdForAcomodacao(acomodacaoId: number): Promise<number | null> {
  if (!Number.isFinite(acomodacaoId) || acomodacaoId <= 0) return null;

  const [acomodacaoRow] = await db
    .select({ proprietarioId: acomodacoes.proprietarioId })
    .from(acomodacoes)
    .where(eq(acomodacoes.id, acomodacaoId))
    .limit(1);

  const proprietarioId = acomodacaoRow?.proprietarioId;
  if (!proprietarioId) return null;

  const [carteira] = await db
    .select({ corretorId: carteiraCorretor.corretorId })
    .from(carteiraCorretor)
    .where(
      and(
        eq(carteiraCorretor.proprietarioId, proprietarioId),
        eq(carteiraCorretor.status, 'ativo'),
      ),
    )
    .orderBy(asc(carteiraCorretor.criadoEm))
    .limit(1);

  return carteira?.corretorId ?? null;
}

module.exports = { resolveCorretorIdForAcomodacao };
