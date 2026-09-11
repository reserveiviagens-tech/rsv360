import {
  STATUS_ANUNCIO_VALUES,
  summarizeStatusAnuncio,
  validateListingStatusAnuncio,
} from '../../../../server/modules/acomodacoes/services/listing-status-anuncio.util';

describe('listing-status-anuncio.util', () => {
  it('whitelists allowed status values', () => {
    expect(STATUS_ANUNCIO_VALUES).toEqual(['anunciado', 'nao_anunciado']);
  });

  it('defaults null to anunciado', () => {
    expect(validateListingStatusAnuncio(null)).toEqual({ ok: true, value: 'anunciado' });
    expect(validateListingStatusAnuncio(undefined)).toEqual({ ok: true, value: 'anunciado' });
  });

  it('accepts whitelisted string values', () => {
    expect(validateListingStatusAnuncio('anunciado')).toEqual({ ok: true, value: 'anunciado' });
    expect(validateListingStatusAnuncio('nao_anunciado')).toEqual({
      ok: true,
      value: 'nao_anunciado',
    });
  });

  it('rejects non-string and unknown values', () => {
    expect(validateListingStatusAnuncio(1).ok).toBe(false);
    expect(validateListingStatusAnuncio({}).ok).toBe(false);
    expect(validateListingStatusAnuncio('pausado').ok).toBe(false);
    expect(validateListingStatusAnuncio('').ok).toBe(false);
  });

  it('summarizes card preview labels', () => {
    expect(summarizeStatusAnuncio('anunciado')).toBe('Anunciado');
    expect(summarizeStatusAnuncio('nao_anunciado')).toBe('Não anunciado');
    expect(summarizeStatusAnuncio(undefined)).toBe('Anunciado');
    expect(summarizeStatusAnuncio(null)).toBe('Anunciado');
  });
});
