const mockGetFeedbackTable = jest.fn();
const mockGetColumns = jest.fn();
const mockQuery = jest.fn();

jest.mock('../../../../server/modules/guest-portal/db/portal.repository', () => ({
  portalRepository: {
    getFeedbackTable: (...args: unknown[]) => mockGetFeedbackTable(...args),
    getColumns: (...args: unknown[]) => mockGetColumns(...args),
    query: (...args: unknown[]) => mockQuery(...args),
  },
}));

import {
  aggregateReviewsForAcomodacoes,
  getGuestFeedbackReviewsStatus,
  resetGuestFeedbackReviewsStatusCache,
} from '../../../../server/modules/acomodacoes/services/anfitriao-reviews.service';

describe('anfitriao-reviews.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetGuestFeedbackReviewsStatusCache();
  });

  it('getGuestFeedbackReviewsStatus returns disponivel=false when table missing', async () => {
    mockGetFeedbackTable.mockResolvedValue(null);
    const status = await getGuestFeedbackReviewsStatus();
    expect(status.disponivel).toBe(false);
    expect(status.table).toBeNull();
  });

  it('aggregateReviewsForAcomodacoes returns zeros when feedback table unavailable', async () => {
    mockGetFeedbackTable.mockResolvedValue(null);
    const aggs = await aggregateReviewsForAcomodacoes([10, 20]);
    expect(aggs).toEqual([
      { acomodacaoId: 10, media: null, total: 0 },
      { acomodacaoId: 20, media: null, total: 0 },
    ]);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('aggregateReviewsForAcomodacoes aggregates by acomodacao_id', async () => {
    mockGetFeedbackTable.mockResolvedValue('guest_feedback');
    mockGetColumns.mockResolvedValue(['id', 'booking_id', 'overall_rating', 'acomodacao_id']);
    mockQuery.mockResolvedValue({
      rows: [
        { acomodacao_id: 10, media: '4.5', total: 2 },
        { acomodacao_id: 20, media: '5.0', total: 1 },
      ],
    });

    const aggs = await aggregateReviewsForAcomodacoes([10, 20, 30]);
    expect(mockQuery).toHaveBeenCalled();
    expect(aggs).toEqual([
      { acomodacaoId: 10, media: 4.5, total: 2 },
      { acomodacaoId: 20, media: 5, total: 1 },
      { acomodacaoId: 30, media: null, total: 0 },
    ]);
  });
});
