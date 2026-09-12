import {
  COMP_SET_MAX,
  summarizeCompSet,
  validateListingCompSet,
} from '../../../../server/modules/acomodacoes/services/listing-comp-set.util';

const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';

describe('listing-comp-set.util', () => {
  it('accepts nightly price entry', () => {
    const r = validateListingCompSet([
      { id: ID_A, nome: 'Vizinho A', precoNoite: 320.5 },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value?.[0]?.precoNoite).toBe(320.5);
    }
  });

  it('accepts min/max range and rejects min > max', () => {
    const ok = validateListingCompSet([
      { id: ID_A, nome: 'Faixa', precoMin: 200, precoMax: 400 },
    ]);
    expect(ok.ok).toBe(true);

    const bad = validateListingCompSet([
      { id: ID_A, nome: 'Faixa', precoMin: 500, precoMax: 100 },
    ]);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toBe('comp_set_invalido');
  });

  it('rejects missing price and empty nome', () => {
    expect(
      validateListingCompSet([{ id: ID_A, nome: 'Sem preço' }]).ok,
    ).toBe(false);
    expect(
      validateListingCompSet([{ id: ID_A, nome: '  ', precoNoite: 10 }]).ok,
    ).toBe(false);
  });

  it('rejects more than COMP_SET_MAX entries', () => {
    const rows = Array.from({ length: COMP_SET_MAX + 1 }, (_, i) => ({
      id: `${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`,
      nome: `C${i}`,
      precoNoite: 100,
    }));
    const r = validateListingCompSet(rows);
    expect(r.ok).toBe(false);
  });

  it('summarizeCompSet averages nightly and midpoints', () => {
    const summary = summarizeCompSet([
      { id: ID_A, nome: 'A', precoNoite: 100 },
      { id: ID_B, nome: 'B', precoMin: 200, precoMax: 400 },
    ]);
    expect(summary.count).toBe(2);
    expect(summary.mediaReferencia).toBe(200);
  });

  it('null clears list', () => {
    const r = validateListingCompSet(null);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBeUndefined();
  });
});
