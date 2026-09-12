import {
  CONJUNTOS_REGRAS_MAX,
  summarizeConjuntoRegras,
  validateListingConjuntosRegras,
} from '../../../../server/modules/acomodacoes/services/listing-conjuntos-regras.util';

const VALID_ID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';

describe('listing-conjuntos-regras.util', () => {
  it('accepts null with undefined value', () => {
    expect(validateListingConjuntosRegras(null)).toEqual({ ok: true, value: undefined });
  });

  it('accepts empty array as undefined', () => {
    expect(validateListingConjuntosRegras([])).toEqual({ ok: true, value: undefined });
  });

  it('rejects non-array payload', () => {
    expect(validateListingConjuntosRegras({}).ok).toBe(false);
  });

  it('rejects more than max conjuntos', () => {
    const many = Array.from({ length: CONJUNTOS_REGRAS_MAX + 1 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      nome: `C${i}`,
      cor: 'slate',
    }));
    expect(validateListingConjuntosRegras(many).ok).toBe(false);
  });

  it('accepts valid conjunto with token color and rules', () => {
    expect(
      validateListingConjuntosRegras([
        {
          id: VALID_ID,
          nome: 'Alta temporada',
          cor: 'amber',
          precoPorNoite: 420,
          minNoites: 2,
          maxNoites: 14,
          checkinDiasBloqueados: [0, 6],
        },
      ]),
    ).toEqual({
      ok: true,
      value: [
        {
          id: VALID_ID,
          nome: 'Alta temporada',
          cor: 'amber',
          precoPorNoite: 420,
          minNoites: 2,
          maxNoites: 14,
          checkinDiasBloqueados: [0, 6],
        },
      ],
    });
  });

  it('prefers absolute price in summary when both price and pct set', () => {
    const text = summarizeConjuntoRegras({
      id: VALID_ID,
      nome: 'Teste',
      cor: 'sky',
      precoPorNoite: 300,
      ajustePct: 10,
    });
    expect(text).toContain('R$300/noite');
    expect(text).not.toContain('%');
  });

  it('rejects invalid date order via apply route separately — invalid nome', () => {
    expect(
      validateListingConjuntosRegras([{ id: VALID_ID, nome: '', cor: 'slate' }]).ok,
    ).toBe(false);
  });

  it('rejects ajustePct out of range', () => {
    expect(
      validateListingConjuntosRegras([
        { id: VALID_ID, nome: 'X', cor: 'slate', ajustePct: 80 },
      ]).ok,
    ).toBe(false);
  });

  it('rejects duplicate ids', () => {
    expect(
      validateListingConjuntosRegras([
        { id: VALID_ID, nome: 'A', cor: 'slate' },
        { id: VALID_ID, nome: 'B', cor: 'rose' },
      ]).ok,
    ).toBe(false);
  });

  it('accepts hex color whitelist', () => {
    const r = validateListingConjuntosRegras([
      { id: VALID_ID, nome: 'Hex', cor: '#64748b' },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value?.[0]?.cor).toBe('slate');
    }
  });
});
