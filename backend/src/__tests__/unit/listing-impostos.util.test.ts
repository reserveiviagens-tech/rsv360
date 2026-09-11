import {
  summarizeImpostos,
  validateListingImpostos,
} from '../../../../server/modules/acomodacoes/services/listing-impostos.util';

describe('listing-impostos.util', () => {
  it('accepts null/undefined/empty as undefined value', () => {
    expect(validateListingImpostos(null)).toEqual({ ok: true, value: undefined });
    expect(validateListingImpostos(undefined)).toEqual({ ok: true, value: undefined });
    expect(validateListingImpostos({})).toEqual({ ok: true, value: undefined });
  });

  it('sanitizes inscricao and notas control chars', () => {
    expect(
      validateListingImpostos({
        inscricaoMunicipal: ' IM-1234\u0007 ',
        notas: ' Observação\u0008 ',
      }),
    ).toEqual({
      ok: true,
      value: {
        inscricaoMunicipal: 'IM-1234',
        notas: 'Observação',
      },
    });
  });

  it('strips disallowed chars from inscricao municipal', () => {
    expect(
      validateListingImpostos({
        inscricaoMunicipal: 'IM@1234#',
      }),
    ).toEqual({
      ok: true,
      value: { inscricaoMunicipal: 'IM1234' },
    });
  });

  it('forces aliquotaPct omitted when isento is true', () => {
    expect(
      validateListingImpostos({
        isento: true,
        aliquotaPct: 5,
      }),
    ).toEqual({
      ok: true,
      value: { isento: true },
    });
  });

  it('rejects unknown keys', () => {
    const result = validateListingImpostos({
      inscricaoMunicipal: 'IM-1234',
      cnpj: 'fake',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('impostos_invalido');
      expect(result.message).toContain('cnpj');
    }
  });

  it('rejects NaN and out-of-range aliquota', () => {
    expect(validateListingImpostos({ aliquotaPct: NaN }).ok).toBe(false);
    expect(validateListingImpostos({ aliquotaPct: -1 }).ok).toBe(false);
    expect(validateListingImpostos({ aliquotaPct: 100.1 }).ok).toBe(false);
    expect(validateListingImpostos({ aliquotaPct: 5.555 }).ok).toBe(false);
  });

  it('accepts valid aliquota with up to 2 decimal places', () => {
    expect(
      validateListingImpostos({ aliquotaPct: 5.5 }),
    ).toEqual({
      ok: true,
      value: { aliquotaPct: 5.5 },
    });
    expect(
      validateListingImpostos({ aliquotaPct: '12,25' }),
    ).toEqual({
      ok: true,
      value: { aliquotaPct: 12.25 },
    });
  });

  it('rejects non-object payload', () => {
    expect(validateListingImpostos([]).ok).toBe(false);
    expect(validateListingImpostos('x').ok).toBe(false);
  });

  it('rejects fields over max length', () => {
    expect(
      validateListingImpostos({
        inscricaoMunicipal: 'x'.repeat(41),
      }).ok,
    ).toBe(false);
    expect(
      validateListingImpostos({
        notas: 'x'.repeat(501),
      }).ok,
    ).toBe(false);
  });

  it('summarizes card preview labels', () => {
    expect(summarizeImpostos(undefined)).toBe('Adicionar informações');
    expect(summarizeImpostos({})).toBe('Adicionar informações');
    expect(summarizeImpostos({ isento: true })).toBe('Isento');
    expect(summarizeImpostos({ aliquotaPct: 5 })).toBe('5%');
    expect(summarizeImpostos({ aliquotaPct: 5.5 })).toBe('5.5%');
    expect(summarizeImpostos({ inscricaoMunicipal: 'IM-1234' })).toBe(
      'Inscrição cadastrada',
    );
    expect(
      summarizeImpostos({
        inscricaoMunicipal: 'IM-1234',
        notas: 'Nota interna',
      }),
    ).toBe('Inscrição cadastrada');
  });
});
