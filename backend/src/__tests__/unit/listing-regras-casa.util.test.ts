import {
  REGRAS_ADICIONAIS_MAX,
  parseRegrasCasaTime,
  summarizeCheckinCheckout,
  summarizeRegrasCasa,
  validateListingRegrasCasa,
} from '../../../../server/modules/acomodacoes/services/listing-regras-casa.util';

describe('listing-regras-casa.util', () => {
  it('accepts null with empty object', () => {
    expect(validateListingRegrasCasa(null)).toEqual({ ok: true, value: {} });
  });

  it('rejects non-object payload', () => {
    expect(validateListingRegrasCasa('x').ok).toBe(false);
    expect(validateListingRegrasCasa([]).ok).toBe(false);
  });

  it('coerces boolean fields', () => {
    expect(
      validateListingRegrasCasa({
        pets: 'true',
        eventos: 1,
        fumar: 'false',
        silencio: 0,
        filmagem: '1',
      }),
    ).toEqual({
      ok: true,
      value: {
        pets: true,
        eventos: true,
        fumar: false,
        silencio: false,
        filmagem: true,
      },
    });
  });

  it('rejects invalid boolean type', () => {
    expect(validateListingRegrasCasa({ pets: {} }).ok).toBe(false);
  });

  it('accepts valid HH:MM times and normalizes', () => {
    expect(
      validateListingRegrasCasa({
        checkInDe: '9:00',
        checkOutAte: '11:00',
        silencioInicio: '22:00',
        silencioFim: '7:00',
      }),
    ).toEqual({
      ok: true,
      value: {
        checkInDe: '09:00',
        checkOutAte: '11:00',
        silencioInicio: '22:00',
        silencioFim: '07:00',
      },
    });
  });

  it('accepts empty time fields', () => {
    expect(
      validateListingRegrasCasa({
        checkInDe: '',
        checkOutAte: null,
      }),
    ).toEqual({ ok: true, value: {} });
  });

  it('rejects invalid time strings', () => {
    expect(validateListingRegrasCasa({ checkInDe: '25:00' }).ok).toBe(false);
    expect(validateListingRegrasCasa({ checkOutAte: 'noon' }).ok).toBe(false);
    expect(validateListingRegrasCasa({ silencioInicio: '22:60' }).ok).toBe(false);
  });

  it('accepts checkInAte as HH:MM or free text', () => {
    expect(validateListingRegrasCasa({ checkInAte: 'Flexível' })).toEqual({
      ok: true,
      value: { checkInAte: 'Flexível' },
    });
    expect(validateListingRegrasCasa({ checkInAte: '18:30' })).toEqual({
      ok: true,
      value: { checkInAte: '18:30' },
    });
  });

  it('sanitizes regrasAdicionais', () => {
    expect(
      validateListingRegrasCasa({
        regrasAdicionais: '  Sem festas\u0007  ',
      }),
    ).toEqual({
      ok: true,
      value: { regrasAdicionais: 'Sem festas' },
    });
  });

  it('rejects oversized regrasAdicionais', () => {
    const r = validateListingRegrasCasa({
      regrasAdicionais: 'a'.repeat(REGRAS_ADICIONAIS_MAX + 1),
    });
    expect(r.ok).toBe(false);
  });

  it('parseRegrasCasaTime returns empty string for blank input', () => {
    expect(parseRegrasCasaTime('')).toBe('');
    expect(parseRegrasCasaTime(null)).toBe('');
  });

  it('parseRegrasCasaTime rejects garbage', () => {
    expect(parseRegrasCasaTime('abc')).toBe(null);
    expect(parseRegrasCasaTime(12)).toBe(null);
  });

  it('summarizes card preview with defaults', () => {
    expect(summarizeRegrasCasa(undefined)).toBe('Check-in 14:00 · Checkout 11:00');
    expect(summarizeRegrasCasa({ checkInDe: '15:00', checkOutAte: '10:00' })).toBe(
      'Check-in 15:00 · Checkout 10:00',
    );
  });

  it('summarizeCheckinCheckout uses defaults when times missing', () => {
    expect(summarizeCheckinCheckout(null)).toBe('Check-in 14:00 · Checkout 11:00');
    expect(summarizeCheckinCheckout({ checkInAte: 'Flexível' })).toBe(
      'Check-in 14:00 · Checkout 11:00',
    );
  });

  it('summarizeCheckinCheckout formats custom check-in and checkout', () => {
    expect(summarizeCheckinCheckout({ checkInDe: '16:00', checkOutAte: '12:00' })).toBe(
      'Check-in 16:00 · Checkout 12:00',
    );
  });
});
