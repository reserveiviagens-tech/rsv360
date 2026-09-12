/** Round guest review average to one decimal place (honest display). */
export function roundReviewMedia(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
}

module.exports = { roundReviewMedia };
