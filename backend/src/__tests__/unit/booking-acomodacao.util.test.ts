import {
  resolveAcomodacaoIdFromBookingRow,
} from '../../../../server/modules/guest-portal/services/booking-acomodacao.util';

describe('booking-acomodacao.util — resolveAcomodacaoIdFromBookingRow', () => {
  it('reads acomodacaoId from booking metadata', () => {
    expect(
      resolveAcomodacaoIdFromBookingRow({
        metadata: { acomodacaoId: 42 },
      }),
    ).toBe(42);
  });

  it('falls back to item_id for accommodation booking types', () => {
    expect(
      resolveAcomodacaoIdFromBookingRow({
        booking_type: 'hotel',
        item_id: 99,
      }),
    ).toBe(99);
  });

  it('returns null when no link can be resolved', () => {
    expect(resolveAcomodacaoIdFromBookingRow({ booking_type: 'flight', item_id: 1 })).toBeNull();
    expect(resolveAcomodacaoIdFromBookingRow({})).toBeNull();
  });
});
