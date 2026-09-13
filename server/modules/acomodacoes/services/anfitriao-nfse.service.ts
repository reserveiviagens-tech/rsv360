/**
 * Host NFSe draft preparation (MVP — pending only, no municipal API).
 */

import { eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { acomodacoes } from '../../../../backend/src/db/schema/acomodacoes';
import {
  anfitriaoService,
  podeGerenciarUnidade,
  type AuthContext,
} from './anfitriao.service';
import {
  buildNfseDraft,
  appendNfseDraft,
  currentNfseMes,
  impostosForNfseFromMetadata,
  isValidNfseMes,
  monthBoundsForNfse,
  readNfseDraftsFromMetadata,
  type NfseDraft,
} from './listing-nfse-draft.util';
import { roundMoney } from './listing-impostos-receita-export.util';

export type PrepareNfseDraftResult =
  | { error: 'not_found' | 'forbidden' | 'invalid_mes'; message?: string }
  | { data: NfseDraft };

export type ListNfseDraftsResult =
  | { error: 'not_found' | 'forbidden' }
  | { data: NfseDraft[] };

async function assertGerenciaUnidade(auth: AuthContext, acomodacaoId: number) {
  const scoped = await anfitriaoService.obterUnidade(auth, acomodacaoId);
  if ('error' in scoped) return scoped;
  if (!(await podeGerenciarUnidade(auth, scoped.data))) {
    return { error: 'forbidden' as const };
  }
  return scoped;
}

export const anfitriaoNfseService = {
  async prepareNfseDraft(
    auth: AuthContext,
    acomodacaoId: number,
    opts?: { mes?: string },
  ): Promise<PrepareNfseDraftResult> {
    const scoped = await assertGerenciaUnidade(auth, acomodacaoId);
    if ('error' in scoped) return { error: scoped.error };

    const mesRaw = opts?.mes?.trim() || currentNfseMes();
    if (!isValidNfseMes(mesRaw)) {
      return { error: 'invalid_mes', message: 'Parâmetro mes inválido (YYYY-MM)' };
    }

    const { de, ate } = monthBoundsForNfse(mesRaw);
    const reservasResult = await anfitriaoService.listarReservas(auth, {
      de,
      ate,
      acomodacaoId,
    });
    if ('error' in reservasResult) {
      return { error: reservasResult.error };
    }

    let receita = 0;
    for (const r of reservasResult.data) {
      receita += Number(r.valorTotal) || 0;
    }
    receita = roundMoney(receita);

    const row = scoped.data;
    const impostos = impostosForNfseFromMetadata(row.metadata);
    const draft = buildNfseDraft({ mes: mesRaw, receita, impostos });

    const baseMeta =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? { ...(row.metadata as Record<string, unknown>) }
        : {};
    const existing = readNfseDraftsFromMetadata(baseMeta);
    baseMeta.nfseDrafts = appendNfseDraft(existing, draft);

    await db
      .update(acomodacoes)
      .set({ metadata: baseMeta, atualizadoEm: new Date() })
      .where(eq(acomodacoes.id, acomodacaoId));

    return { data: draft };
  },

  async listNfseDrafts(
    auth: AuthContext,
    acomodacaoId: number,
  ): Promise<ListNfseDraftsResult> {
    const scoped = await assertGerenciaUnidade(auth, acomodacaoId);
    if ('error' in scoped) return { error: scoped.error };
    return { data: readNfseDraftsFromMetadata(scoped.data.metadata) };
  },
};
