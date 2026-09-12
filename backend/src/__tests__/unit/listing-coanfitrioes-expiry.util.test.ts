import {
  COANFITRIAO_INVITE_TTL_DAYS,
  computeInviteExpiresAt,
  isInviteExpired,
  mapConviteRowToListingCoanfitriao,
} from '../../../../server/modules/acomodacoes/services/listing-coanfitrioes.util';

describe('listing-coanfitrioes expiry util', () => {
  it('computeInviteExpiresAt adds TTL days', () => {
    const from = new Date('2026-01-01T12:00:00.000Z');
    const expires = computeInviteExpiresAt(from);
    expect(expires.getTime() - from.getTime()).toBe(
      COANFITRIAO_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
  });

  it('isInviteExpired treats null/undefined as not expired (legacy)', () => {
    expect(isInviteExpired(null)).toBe(false);
    expect(isInviteExpired(undefined)).toBe(false);
  });

  it('isInviteExpired returns true when expiresAt is in the past', () => {
    const now = new Date('2026-06-01T00:00:00.000Z');
    expect(isInviteExpired('2026-05-31T23:59:59.000Z', now)).toBe(true);
    expect(isInviteExpired(new Date('2026-06-01T00:00:00.000Z'), now)).toBe(true);
  });

  it('isInviteExpired returns false when expiresAt is in the future', () => {
    const now = new Date('2026-06-01T00:00:00.000Z');
    expect(isInviteExpired('2026-06-02T00:00:00.000Z', now)).toBe(false);
  });

  it('mapConviteRowToListingCoanfitriao includes expiresAt as ISO string', () => {
    const expiry = new Date('2026-06-15T10:00:00.000Z');
    const mapped = mapConviteRowToListingCoanfitriao({
      id: 'c1',
      nome: 'Maria',
      email: 'cohost@test.local',
      papel: 'tudo',
      status: 'pendente',
      expiresAt: expiry,
    });
    expect(mapped.expiresAt).toBe(expiry.toISOString());
  });
});
