import {
  AMENITY_CATALOG,
  summarizeAmenidades,
  validateListingAmenidades,
} from '../../../../server/modules/acomodacoes/services/listing-comodidades.util';

describe('listing-comodidades.util', () => {
  it('accepts canonical ids and sorts by catalog', () => {
    const r = validateListingAmenidades(['piscina', 'wifi', 'tv']);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual(['wifi', 'tv', 'piscina']);
  });

  it('maps legacy labels', () => {
    const r = validateListingAmenidades(['Wi-Fi', 'Ar-condicionado', 'Itens básicos']);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual(['wifi', 'ar', 'basicos']);
  });

  it('dedupes ids', () => {
    const r = validateListingAmenidades(['wifi', 'wifi', { id: 'wifi' }]);
    expect(r).toEqual({ ok: true, value: ['wifi'] });
  });

  it('rejects unknown amenity with invalid token', () => {
    const r = validateListingAmenidades(['Teletransporte Espacial!!!']);
    expect(r.ok).toBe(false);
  });

  it('preserves legacy custom slug tokens', () => {
    const r = validateListingAmenidades(['wifi', 'legado_custom']);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toContain('legado_custom');
  });

  it('rejects non-array', () => {
    expect(validateListingAmenidades('wifi').ok).toBe(false);
  });

  it('summarizes card with + N mais', () => {
    const ids = AMENITY_CATALOG.slice(0, 5).map((a) => a.id);
    expect(summarizeAmenidades(ids, 3)).toBe('Wi-Fi, Ar-condicionado, TV + 2 mais');
    expect(summarizeAmenidades(['wifi', 'tv'])).toBe('Wi-Fi, TV');
    expect(summarizeAmenidades([])).toBeNull();
  });
});
