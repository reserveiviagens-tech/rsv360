import { portalRepository } from '../../guest-portal/db/portal.repository';
import { roundReviewMedia } from './anfitriao-reviews.util';

export type AcomodacaoReviewAgg = {
  acomodacaoId: number;
  media: number | null;
  total: number;
};

export type GuestFeedbackReviewsStatus = {
  disponivel: boolean;
  table: string | null;
  hasAcomodacaoColumn: boolean;
};

let reviewsStatusCache: GuestFeedbackReviewsStatus | null = null;

/** Clears in-process cache (tests only). */
export function resetGuestFeedbackReviewsStatusCache(): void {
  reviewsStatusCache = null;
}

export async function getGuestFeedbackReviewsStatus(): Promise<GuestFeedbackReviewsStatus> {
  if (reviewsStatusCache) return reviewsStatusCache;

  const table = await portalRepository.getFeedbackTable();
  if (!table) {
    reviewsStatusCache = { disponivel: false, table: null, hasAcomodacaoColumn: false };
    return reviewsStatusCache;
  }

  const columns = await portalRepository.getColumns(table);
  const hasAcomodacaoColumn = columns.includes('acomodacao_id');
  reviewsStatusCache = {
    disponivel: hasAcomodacaoColumn,
    table,
    hasAcomodacaoColumn,
  };
  return reviewsStatusCache;
}

function quoteIdent(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export async function aggregateReviewsForAcomodacoes(
  ids: number[],
): Promise<AcomodacaoReviewAgg[]> {
  const uniqueIds = [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))];
  if (uniqueIds.length === 0) return [];

  const status = await getGuestFeedbackReviewsStatus();
  if (!status.disponivel || !status.table) {
    return uniqueIds.map((acomodacaoId) => ({
      acomodacaoId,
      media: null,
      total: 0,
    }));
  }

  const table = status.table;
  const columns = await portalRepository.getColumns(table);
  const ratingColumn =
    columns.find((c) => c === 'overall_rating') ??
    columns.find((c) => c === 'rating') ??
    columns.find((c) => c === 'score') ??
    null;

  if (!ratingColumn) {
    return uniqueIds.map((acomodacaoId) => ({
      acomodacaoId,
      media: null,
      total: 0,
    }));
  }

  const placeholders = uniqueIds.map((_, i) => `$${i + 1}`).join(', ');
  const result = await portalRepository.query(
    `select
       gf.${quoteIdent('acomodacao_id')} as acomodacao_id,
       round(avg(gf.${quoteIdent(ratingColumn)})::numeric, 1) as media,
       count(*)::int as total
     from ${quoteIdent(table)} gf
     where gf.${quoteIdent('acomodacao_id')} in (${placeholders})
       and gf.${quoteIdent(ratingColumn)} is not null
     group by gf.${quoteIdent('acomodacao_id')}`,
    uniqueIds,
  );

  const byId = new Map<number, AcomodacaoReviewAgg>();
  for (const row of result.rows) {
    const acomodacaoId = Number(row.acomodacao_id);
    if (!Number.isFinite(acomodacaoId) || acomodacaoId <= 0) continue;
    byId.set(acomodacaoId, {
      acomodacaoId,
      media: roundReviewMedia(Number(row.media)),
      total: Number(row.total) || 0,
    });
  }

  return uniqueIds.map(
    (acomodacaoId) =>
      byId.get(acomodacaoId) ?? {
        acomodacaoId,
        media: null,
        total: 0,
      },
  );
}

module.exports = {
  aggregateReviewsForAcomodacoes,
  getGuestFeedbackReviewsStatus,
  resetGuestFeedbackReviewsStatusCache,
  roundReviewMedia,
};
