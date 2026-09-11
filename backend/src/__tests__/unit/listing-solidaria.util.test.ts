import {
  summarizeSolidaria,
  validateListingHospedagemSolidaria,
} from '../../../../server/modules/acomodacoes/services/listing-solidaria.util';

describe('listing-solidaria.util', () => {
  it('defaults null to false', () => {
    expect(validateListingHospedagemSolidaria(null)).toEqual({ ok: true, value: false });
    expect(validateListingHospedagemSolidaria(undefined)).toEqual({ ok: true, value: false });
  });

  it('coerces boolean-like values', () => {
    expect(validateListingHospedagemSolidaria(true)).toEqual({ ok: true, value: true });
    expect(validateListingHospedagemSolidaria(false)).toEqual({ ok: true, value: false });
    expect(validateListingHospedagemSolidaria('true')).toEqual({ ok: true, value: true });
    expect(validateListingHospedagemSolidaria('false')).toEqual({ ok: true, value: false });
    expect(validateListingHospedagemSolidaria(1)).toEqual({ ok: true, value: true });
    expect(validateListingHospedagemSolidaria(0)).toEqual({ ok: true, value: false });
  });

  it('rejects invalid types', () => {
    expect(validateListingHospedagemSolidaria({}).ok).toBe(false);
    expect(validateListingHospedagemSolidaria([]).ok).toBe(false);
  });

  it('summarizes card preview labels', () => {
    expect(summarizeSolidaria(true)).toBe('Ativa');
    expect(summarizeSolidaria(false)).toBe('Desligada');
    expect(summarizeSolidaria(undefined)).toBe('Desligada');
    expect(summarizeSolidaria(null)).toBe('Desligada');
  });
});
