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

  it('sanitizes, maps to catalog casing, and deduplicates', () => {
    expect(validateListingIdiomas(['Português', 'português', ' English '])).toEqual({
      ok: true,
      value: ['Português', 'English'],
    });
  });

  it('rejects unknown language labels', () => {
    const result = validateListingIdiomas(['Português', 'Klingon']);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('idiomas_invalido');
      expect(result.message).toContain('Klingon');
    }
  });

  it('rejects non-array and over max count', () => {
    expect(validateListingIdiomas('Português').ok).toBe(false);
    expect(validateListingIdiomas({}).ok).toBe(false);
    expect(
      validateListingIdiomas([
        'Português',
        'English',
        'Español',
        'Français',
        'Italiano',
        'Deutsch',
        '日本語',
        '中文',
        '한국어',
      ]).ok,
    ).toBe(false);
  });

  it('summarizes card preview labels', () => {
    expect(summarizeIdiomas(['Português'])).toBe('Português');
    expect(summarizeIdiomas(undefined)).toBe('Português');
    expect(summarizeIdiomas(['Português', 'English'])).toBe('2 idiomas');
    expect(summarizeIdiomas(['English'])).toBe('1 idiomas');
  });
});
