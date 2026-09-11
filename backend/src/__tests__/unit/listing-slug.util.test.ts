import {
  normalizeListingSlug,
  isValidListingSlug,
  summarizeListingSlug,
  resolveModoReserva,
  clientAcceptNeedsHostApproval,
} from '../../../../server/modules/acomodacoes/services/listing-slug.util';

describe('listing-slug.util', () => {
  it('normalizes slug to lowercase kebab', () => {
    expect(normalizeListingSlug('  Lacqua DiRoma Kit!! ')).toBe('lacqua-diroma-kit');
  });

  it('validates slug shape', () => {
    expect(isValidListingSlug('lacqua-kit')).toBe(true);
    expect(isValidListingSlug('a')).toBe(true);
    expect(isValidListingSlug('-bad')).toBe(false);
    expect(isValidListingSlug('Bad Caps')).toBe(false);
  });

  it('summarizeListingSlug returns normalized slug or empty', () => {
    expect(summarizeListingSlug('  My Villa!! ')).toBe('my-villa');
    expect(summarizeListingSlug('')).toBe('');
    expect(summarizeListingSlug(null)).toBe('');
  });

  it('resolves modoReserva defaults to instantanea', () => {
    expect(resolveModoReserva('aprovar')).toBe('aprovar');
    expect(resolveModoReserva('instantanea')).toBe('instantanea');
    expect(resolveModoReserva(undefined)).toBe('instantanea');
    expect(clientAcceptNeedsHostApproval('aprovar')).toBe(true);
    expect(clientAcceptNeedsHostApproval('instantanea')).toBe(false);
  });
});
