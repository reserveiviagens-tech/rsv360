import {
  summarizeGuiasLocais,
  validateListingGuiasLocais,
} from '../../../../server/modules/acomodacoes/services/listing-guias-locais.util';

describe('listing-guias-locais.util', () => {
  it('accepts null/undefined/empty as undefined value', () => {
    expect(validateListingGuiasLocais(null)).toEqual({ ok: true, value: undefined });
    expect(validateListingGuiasLocais(undefined)).toEqual({ ok: true, value: undefined });
    expect(validateListingGuiasLocais([])).toEqual({ ok: true, value: undefined });
  });

  it('sanitizes control chars and trims strings', () => {
    expect(
      validateListingGuiasLocais([
        {
          id: ' g-1 ',
          titulo: ' Restaurantes\u0007 ',
          conteudo: ' Dica local\u0008 ',
        },
      ]),
    ).toEqual({
      ok: true,
      value: [{ id: 'g-1', titulo: 'Restaurantes', conteudo: 'Dica local' }],
    });
  });

  it('rejects empty id', () => {
    const result = validateListingGuiasLocais([
      { id: '   ', titulo: 'Guia', conteudo: 'Texto' },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('guias_locais_invalido');
      expect(result.message).toContain('ID');
    }
  });

  it('rejects unknown item keys', () => {
    const result = validateListingGuiasLocais([
      { id: 'g-1', titulo: 'Guia', conteudo: 'Texto', extra: true },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('guias_locais_invalido');
      expect(result.message).toContain('extra');
    }
  });

  it('rejects non-array and over max count', () => {
    expect(validateListingGuiasLocais({}).ok).toBe(false);
    expect(validateListingGuiasLocais('x').ok).toBe(false);

    const tooMany = Array.from({ length: 11 }, (_, i) => ({
      id: `g-${i}`,
      titulo: `Guia ${i}`,
      conteudo: 'Conteúdo',
    }));
    expect(validateListingGuiasLocais(tooMany).ok).toBe(false);
  });

  it('rejects fields over max length', () => {
    expect(
      validateListingGuiasLocais([
        { id: 'g-1', titulo: 'x'.repeat(81), conteudo: 'ok' },
      ]).ok,
    ).toBe(false);
    expect(
      validateListingGuiasLocais([
        { id: 'g-1', titulo: 'ok', conteudo: 'x'.repeat(2001) },
      ]).ok,
    ).toBe(false);
  });

  it('summarizes card preview labels', () => {
    expect(summarizeGuiasLocais(undefined)).toBe('Adicionar informações');
    expect(summarizeGuiasLocais([])).toBe('Adicionar informações');
    expect(
      summarizeGuiasLocais([{ id: '1', titulo: 'A', conteudo: 'B' }]),
    ).toBe('1 guia');
    expect(
      summarizeGuiasLocais([
        { id: '1', titulo: 'A', conteudo: 'B' },
        { id: '2', titulo: 'C', conteudo: 'D' },
      ]),
    ).toBe('2 guias');
  });
});
