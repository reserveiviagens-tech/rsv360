import {
  IDIOMAS_DEFAULT,
  summarizeIdiomas,
  validateListingIdiomas,
} from '../../../../server/modules/acomodacoes/services/listing-idiomas.util';

describe('listing-idiomas.util', () => {
  it('defaults null/undefined/empty to Português', () => {
    expect(validateListingIdiomas(null)).toEqual({ ok: true, value: [...IDIOMAS_DEFAULT] });
    expect(validateListingIdiomas(undefined)).toEqual({ ok: true, value: [...IDIOMAS_DEFAULT] });
    expect(validateListingIdiomas([])).toEqual({ ok: true, value: [...IDIOMAS_DEFAULT] });
    expect(validateListingIdiomas(['', '   '])).toEqual({ ok: true, value: [...IDIOMAS_DEFAULT] });
  });

  it('sanitizes and deduplicates labels', () => {
    expect(validateListingIdiomas(['Português', 'português', ' English '])).toEqual({
      ok: true,
      value: ['Português', 'English'],
    });
  });

  it('truncates labels to max length', () => {
    const long = 'a'.repeat(50);
    const result = validateListingIdiomas([long]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0]).toHaveLength(40);
    }
  });

  it('rejects non-array and over max count', () => {
    expect(validateListingIdiomas('Português').ok).toBe(false);
    expect(validateListingIdiomas({}).ok).toBe(false);
    expect(validateListingIdiomas(Array.from({ length: 9 }, (_, i) => `Lang${i}`)).ok).toBe(false);
  });

  it('summarizes card preview labels', () => {
    expect(summarizeIdiomas(['Português'])).toBe('Português');
    expect(summarizeIdiomas(undefined)).toBe('Português');
    expect(summarizeIdiomas(['Português', 'English'])).toBe('2 idiomas');
    expect(summarizeIdiomas(['English'])).toBe('1 idiomas');
  });
});
