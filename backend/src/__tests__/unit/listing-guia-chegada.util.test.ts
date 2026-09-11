import {
  GUIA_CHEGADA_TEXT_MAX,
  summarizeComoChegar,
  validateListingGuiaChegada,
} from '../../../../server/modules/acomodacoes/services/listing-guia-chegada.util';

describe('listing-guia-chegada.util', () => {
  it('accepts null with empty object', () => {
    expect(validateListingGuiaChegada(null)).toEqual({ ok: true, value: {} });
  });

  it('rejects non-object payload', () => {
    expect(validateListingGuiaChegada('x').ok).toBe(false);
    expect(validateListingGuiaChegada([]).ok).toBe(false);
  });

  it('accepts valid comoChegar with trim and control-char strip', () => {
    expect(
      validateListingGuiaChegada({
        comoChegar: '  Link do mapa\u0007 https://maps.example  ',
      }),
    ).toEqual({
      ok: true,
      value: { comoChegar: 'Link do mapa https://maps.example' },
    });
  });

  it('rejects comoChegar over max length', () => {
    const long = 'a'.repeat(GUIA_CHEGADA_TEXT_MAX + 1);
    const result = validateListingGuiaChegada({ comoChegar: long });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('guia_chegada_invalido');
      expect(result.message).toContain(String(GUIA_CHEGADA_TEXT_MAX));
    }
  });

  it('rejects unknown top-level keys', () => {
    const result = validateListingGuiaChegada({
      comoChegar: 'Instruções',
      extraField: 'nope',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('extraField');
    }
  });

  it('passes through wifiRede and wifiSenha without requiring both', () => {
    const result = validateListingGuiaChegada({
      comoChegar: 'Portão azul',
      wifiRede: 'wifi-test',
      wifiSenha: 'wifi-test-secret',
    });
    expect(result).toEqual({
      ok: true,
      value: {
        comoChegar: 'Portão azul',
        wifiRede: 'wifi-test',
        wifiSenha: 'wifi-test-secret',
      },
    });
  });

  it('rejects wifiSenha over max length', () => {
    const long = 'x'.repeat(GUIA_CHEGADA_TEXT_MAX + 1);
    expect(validateListingGuiaChegada({ wifiSenha: long }).ok).toBe(false);
  });

  it('accepts bounded instrucoesCheckout with sanitized fields', () => {
    expect(
      validateListingGuiaChegada({
        instrucoesCheckout: [
          {
            id: ' checkout-1 ',
            titulo: ' Lixeira ',
            texto: ' Levar lixo\u0007 para a rua ',
          },
        ],
      }),
    ).toEqual({
      ok: true,
      value: {
        instrucoesCheckout: [
          {
            id: 'checkout-1',
            titulo: 'Lixeira',
            texto: 'Levar lixo para a rua',
          },
        ],
      },
    });
  });

  it('rejects instrucoesCheckout over max items', () => {
    const items = Array.from({ length: 21 }, (_, i) => ({
      id: `item-${i}`,
      titulo: 'Título',
      texto: 'Texto',
    }));
    expect(validateListingGuiaChegada({ instrucoesCheckout: items }).ok).toBe(false);
  });

  describe('summarizeComoChegar', () => {
    it('returns default when empty', () => {
      expect(summarizeComoChegar({})).toBe('Adicionar informações');
      expect(summarizeComoChegar(null)).toBe('Adicionar informações');
    });

    it('returns full text when within 40 chars', () => {
      expect(summarizeComoChegar({ comoChegar: 'Portão azul ao lado da padaria' })).toBe(
        'Portão azul ao lado da padaria',
      );
    });

    it('truncates long text to about 40 chars', () => {
      const long =
        'Siga pela Avenida Principal até o cruzamento com a Rua das Flores e entre pelo portão metálico';
      const summary = summarizeComoChegar({ comoChegar: long });
      expect(summary.length).toBeLessThanOrEqual(40);
      expect(summary.endsWith('…')).toBe(true);
    });
  });
});
