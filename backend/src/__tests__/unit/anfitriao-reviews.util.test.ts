import { roundReviewMedia } from '../../../../server/modules/acomodacoes/services/anfitriao-reviews.util';

describe('anfitriao-reviews.util — roundReviewMedia', () => {
  it('rounds to one decimal place', () => {
    expect(roundReviewMedia(4.56)).toBe(4.6);
    expect(roundReviewMedia(4.54)).toBe(4.5);
    expect(roundReviewMedia(5)).toBe(5);
  });

  it('returns null for invalid input', () => {
    expect(roundReviewMedia(null)).toBeNull();
    expect(roundReviewMedia(undefined)).toBeNull();
    expect(roundReviewMedia(Number.NaN)).toBeNull();
  });
});
