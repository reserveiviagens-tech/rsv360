import {
  DESCRICAO_ANUNCIO_MAX,
  DESCRICAO_CAMPO_MAX,
  sanitizeDescricaoTexto,
  summarizeDescricao,
  validateListingDescricaoDetalhada,
} from '../../../../server/modules/acomodacoes/services/listing-descricao.util';

describe('listing-descricao.util', () => {
  it('sanitizes controls and truncates', () => {
    expect(sanitizeDescricaoTexto('Olá\u0000 mundo\n', 20)).toBe('Olá mundo\n');
    expect(sanitizeDescricaoTexto('x'.repeat(10), 5)).toBe('xxxxx');
  });

  it('accepts structured descricaoDetalhada', () => {
    const r = validateListingDescricaoDetalhada({
      anuncio: 'Casa acolhedora',
      suaPropriedade: '2 quartos',
      acessoHospede: '',
    });
    expect(r).toEqual({
      ok: true,
      value: { anuncio: 'Casa acolhedora', suaPropriedade: '2 quartos' },
    });
  });

  it('rejects oversized anuncio before sanitize ambiguity', () => {
    const r = validateListingDescricaoDetalhada({
      anuncio: 'a'.repeat(DESCRICAO_ANUNCIO_MAX + 1),
    });
    expect(r.ok).toBe(false);
  });

  it('rejects oversized secondary field', () => {
    const r = validateListingDescricaoDetalhada({
      outrasInformacoes: 'b'.repeat(DESCRICAO_CAMPO_MAX + 1),
    });
    expect(r.ok).toBe(false);
  });

  it('rejects non-object payload', () => {
    expect(validateListingDescricaoDetalhada('texto').ok).toBe(false);
  });

  it('summarizes card preview', () => {
    expect(summarizeDescricao('  Casa   linda  ')).toBe('Casa linda');
    expect(summarizeDescricao('x'.repeat(100), 10)).toBe('xxxxxxxxx…');
    expect(summarizeDescricao('')).toBeNull();
  });
});
