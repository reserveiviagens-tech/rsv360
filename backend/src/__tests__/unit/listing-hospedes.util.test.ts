import {
  CAPACIDADE_MAX,
  CAPACIDADE_MIN,
  summarizeCapacidade,
  validateListingCapacidade,
} from '../../../../server/modules/acomodacoes/services/listing-hospedes.util';

describe('listing-hospedes.util', () => {
  it('accepts capacidadeMax in range', () => {
    expect(validateListingCapacidade({ capacidadeMax: 4 })).toEqual({
      ok: true,
      capacidadeMax: 4,
    });
  });

  it('rejects below min and above max', () => {
    expect(validateListingCapacidade({ capacidadeMax: 0 }).ok).toBe(false);
    expect(validateListingCapacidade({ capacidadeMax: CAPACIDADE_MAX + 1 }).ok).toBe(false);
  });

  it('rejects non-integer garbage', () => {
    expect(validateListingCapacidade({ capacidadeMax: 'abc' }).ok).toBe(false);
  });

  it('allows clearing capacidadeBase', () => {
    expect(validateListingCapacidade({ capacidadeBase: null })).toEqual({
      ok: true,
      capacidadeBase: null,
    });
  });

  it('rejects base greater than max when both set', () => {
    const r = validateListingCapacidade({ capacidadeMax: 2, capacidadeBase: 4 });
    expect(r.ok).toBe(false);
  });

  it('summarizes card text', () => {
    expect(summarizeCapacidade(1)).toBe('Máximo de 1 hóspede');
    expect(summarizeCapacidade(4)).toBe('Máximo de 4 hóspedes');
    expect(summarizeCapacidade(0)).toBeNull();
    expect(summarizeCapacidade(CAPACIDADE_MIN)).toBe('Máximo de 1 hóspede');
  });
});
