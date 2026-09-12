import { and, eq, inArray, or, type SQL } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { acomodacoes } from '../../../../backend/src/db/schema/acomodacoes';
import { coanfitriaoConvites } from '../../../../backend/src/db/schema/coanfitriao-convites';

export type AcessoComo = 'proprietario' | 'coanfitriao';

/** Annotates listing rows with how the current user accesses each unit. Owner scope wins over co-host. */
export function annotateAcessoComo<T extends { id: number }>(
  rows: T[],
  ownedIds: Set<number>,
  staff = false,
): Array<T & { acessoComo: AcessoComo }> {
  return rows.map((row) => ({
    ...row,
    acessoComo: staff || ownedIds.has(row.id) ? 'proprietario' : 'coanfitriao',
  }));
}

/** Units where the user is an active co-host (email stored lowercased). */
export function buildCoanfitriaoAtivoEmailScope(normalizedEmail: string): SQL {
  return inArray(
    acomodacoes.id,
    db
      .select({ acomodacaoId: coanfitriaoConvites.acomodacaoId })
      .from(coanfitriaoConvites)
      .where(
        and(
          eq(coanfitriaoConvites.status, 'ativo'),
          eq(coanfitriaoConvites.email, normalizedEmail),
        ),
      ),
  );
}

export function combineOwnerAndCoanfitriaoScope(
  ownerScope: SQL,
  cohostScope: SQL | null | undefined,
): SQL {
  if (!cohostScope) return ownerScope;
  return or(ownerScope, cohostScope)!;
}
