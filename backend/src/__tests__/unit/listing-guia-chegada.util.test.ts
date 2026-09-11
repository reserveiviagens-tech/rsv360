import {
  GUIA_CASA_MAX,
  GUIA_CHEGADA_TEXT_MAX,
  INSTRUCAO_CHECKOUT_TEXTO_MAX,
  INSTRUCAO_CHECKOUT_TITULO_MAX,
  INSTRUCOES_CHECKIN_MAX,
  METODO_CHECKIN_DETALHE_MAX,
  METODO_CHECKIN_VALUES,
  PREFERENCIA_INTERACAO_VALUES,
  WIFI_REDE_MAX,
  WIFI_SENHA_MAX,
  summarizeCheckoutInstrucoes,
  summarizeComoChegar,
  summarizeGuiaCasa,
  summarizeInteracao,
  summarizeMetodoCheckin,
  summarizeWifi,
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
      wifiRede: 'rede-teste',
      wifiSenha: 'senha-teste',
    });
    expect(result).toEqual({
      ok: true,
      value: {
        comoChegar: 'Portão azul',
        wifiRede: 'rede-teste',
        wifiSenha: 'senha-teste',
      },
    });
  });

  it('sanitizes wifiRede and wifiSenha with trim and control-char strip', () => {
    expect(
      validateListingGuiaChegada({
        wifiRede: '  rede-teste\u0007 ',
        wifiSenha: '  senha-teste\u0007 ',
      }),
    ).toEqual({
      ok: true,
      value: {
        wifiRede: 'rede-teste',
        wifiSenha: 'senha-teste',
      },
    });
  });

  it('rejects wifiRede over max length', () => {
    const long = 'r'.repeat(WIFI_REDE_MAX + 1);
    const result = validateListingGuiaChegada({ wifiRede: long });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain(String(WIFI_REDE_MAX));
    }
  });

  it('rejects wifiSenha over max length', () => {
    const long = 'x'.repeat(WIFI_SENHA_MAX + 1);
    const result = validateListingGuiaChegada({ wifiSenha: long });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain(String(WIFI_SENHA_MAX));
    }
  });

  it('accepts valid guiaCasa with trim and control-char strip', () => {
    expect(
      validateListingGuiaChegada({
        guiaCasa: '  TV na sala\u0007 e ar-condicionado no quarto  ',
      }),
    ).toEqual({
      ok: true,
      value: { guiaCasa: 'TV na sala e ar-condicionado no quarto' },
    });
  });

  it('rejects guiaCasa over max length', () => {
    const long = 'g'.repeat(GUIA_CASA_MAX + 1);
    const result = validateListingGuiaChegada({ guiaCasa: long });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('guia_chegada_invalido');
      expect(result.message).toContain(String(GUIA_CASA_MAX));
    }
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

  it('rejects instrucoesCheckout with empty id after sanitize', () => {
    const result = validateListingGuiaChegada({
      instrucoesCheckout: [{ id: '   ', titulo: 'Título', texto: 'Texto' }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('ID');
    }
  });

  it('rejects instrucoesCheckout titulo over max length', () => {
    const long = 't'.repeat(INSTRUCAO_CHECKOUT_TITULO_MAX + 1);
    expect(
      validateListingGuiaChegada({
        instrucoesCheckout: [{ id: 'item-1', titulo: long, texto: 'Texto' }],
      }).ok,
    ).toBe(false);
  });

  it('rejects instrucoesCheckout texto over max length', () => {
    const long = 'x'.repeat(INSTRUCAO_CHECKOUT_TEXTO_MAX + 1);
    expect(
      validateListingGuiaChegada({
        instrucoesCheckout: [{ id: 'item-1', titulo: 'Título', texto: long }],
      }).ok,
    ).toBe(false);
  });

  it('accepts whitelisted metodoCheckIn with sanitized detalhe and instrucoes', () => {
    expect(
      validateListingGuiaChegada({
        metodoCheckIn: 'Fechadura inteligente',
        metodoCheckInDetalhe: '  Portão lateral\u0007 ',
        instrucoesCheckIn: '  Digite 1234 no teclado  ',
      }),
    ).toEqual({
      ok: true,
      value: {
        metodoCheckIn: 'Fechadura inteligente',
        metodoCheckInDetalhe: 'Portão lateral',
        instrucoesCheckIn: 'Digite 1234 no teclado',
      },
    });
  });

  it.each(METODO_CHECKIN_VALUES)('accepts metodoCheckIn value %s', (method) => {
    expect(validateListingGuiaChegada({ metodoCheckIn: method })).toEqual({
      ok: true,
      value: { metodoCheckIn: method },
    });
  });

  it('rejects unknown metodoCheckIn', () => {
    const result = validateListingGuiaChegada({ metodoCheckIn: 'Porteiro fantasma' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('guia_chegada_invalido');
      expect(result.message).toContain('Método de check-in');
    }
  });

  it('rejects metodoCheckInDetalhe over max length', () => {
    const long = 'd'.repeat(METODO_CHECKIN_DETALHE_MAX + 1);
    expect(validateListingGuiaChegada({ metodoCheckInDetalhe: long }).ok).toBe(false);
  });

  it('rejects instrucoesCheckIn over max length', () => {
    const long = 'i'.repeat(INSTRUCOES_CHECKIN_MAX + 1);
    expect(validateListingGuiaChegada({ instrucoesCheckIn: long }).ok).toBe(false);
  });

  it.each(PREFERENCIA_INTERACAO_VALUES)(
    'accepts preferenciaInteracao value %s',
    (option) => {
      expect(validateListingGuiaChegada({ preferenciaInteracao: option })).toEqual({
        ok: true,
        value: { preferenciaInteracao: option },
      });
    },
  );

  it('rejects unknown preferenciaInteracao', () => {
    const result = validateListingGuiaChegada({
      preferenciaInteracao: 'Prefiro falar só por telefone',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('guia_chegada_invalido');
      expect(result.message).toContain('Preferência de interação');
    }
  });

  it('rejects preferenciaInteracao with extra whitespace-only value', () => {
    expect(validateListingGuiaChegada({ preferenciaInteracao: '   ' }).ok).toBe(false);
  });

  describe('summarizeMetodoCheckin', () => {
    it('returns default when empty or invalid', () => {
      expect(summarizeMetodoCheckin({})).toBe('Adicionar informações');
      expect(summarizeMetodoCheckin(null)).toBe('Adicionar informações');
      expect(summarizeMetodoCheckin({ metodoCheckIn: 'Porteiro fantasma' as never })).toBe(
        'Adicionar informações',
      );
    });

    it('returns method label when set', () => {
      expect(
        summarizeMetodoCheckin({ metodoCheckIn: 'Recepção presencial' }),
      ).toBe('Recepção presencial');
    });
  });

  describe('summarizeWifi', () => {
    it('returns default when wifiRede is empty', () => {
      expect(summarizeWifi({})).toBe('Adicionar informações');
      expect(summarizeWifi(null)).toBe('Adicionar informações');
      expect(summarizeWifi({ wifiSenha: 'senha-teste' })).toBe('Adicionar informações');
    });

    it('returns network label when wifiRede is set', () => {
      expect(summarizeWifi({ wifiRede: 'rede-teste' })).toBe('Rede: rede-teste');
    });

    it('never includes password in summary even when set', () => {
      const summary = summarizeWifi({
        wifiRede: 'rede-teste',
        wifiSenha: 'senha-teste',
      });
      expect(summary).toBe('Rede: rede-teste');
      expect(summary).not.toContain('senha-teste');
      expect(summary).not.toMatch(/senha/i);
    });
  });

  describe('summarizeGuiaCasa', () => {
    it('returns default when empty', () => {
      expect(summarizeGuiaCasa({})).toBe('Adicionar informações');
      expect(summarizeGuiaCasa(null)).toBe('Adicionar informações');
    });

    it('returns full text when within 40 chars', () => {
      expect(
        summarizeGuiaCasa({ guiaCasa: 'TV na sala e ar-condicionado no quarto' }),
      ).toBe('TV na sala e ar-condicionado no quarto');
    });

    it('truncates long text to about 40 chars', () => {
      const long =
        'Use o controle remoto da TV Samsung na gaveta da mesa de cabeceira do quarto principal';
      const summary = summarizeGuiaCasa({ guiaCasa: long });
      expect(summary.length).toBeLessThanOrEqual(40);
      expect(summary.endsWith('…')).toBe(true);
    });
  });

  describe('summarizeCheckoutInstrucoes', () => {
    it('returns default when empty', () => {
      expect(summarizeCheckoutInstrucoes({})).toBe('Adicionar informações');
      expect(summarizeCheckoutInstrucoes(null)).toBe('Adicionar informações');
      expect(summarizeCheckoutInstrucoes({ instrucoesCheckout: [] })).toBe(
        'Adicionar informações',
      );
    });

    it('returns singular count for one item', () => {
      expect(
        summarizeCheckoutInstrucoes({
          instrucoesCheckout: [{ id: '1', titulo: 'Lixeira', texto: 'Levar lixo' }],
        }),
      ).toBe('1 instrução');
    });

    it('returns plural count for multiple items', () => {
      expect(
        summarizeCheckoutInstrucoes({
          instrucoesCheckout: [
            { id: '1', titulo: 'Lixeira', texto: 'Levar lixo' },
            { id: '2', titulo: 'Chaves', texto: 'Deixar na mesa' },
          ],
        }),
      ).toBe('2 instruções');
    });
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

  describe('summarizeInteracao', () => {
    it('returns default when empty', () => {
      expect(summarizeInteracao({})).toBe('Adicionar informações');
      expect(summarizeInteracao(null)).toBe('Adicionar informações');
    });

    it('returns short label for whitelisted options', () => {
      expect(
        summarizeInteracao({
          preferenciaInteracao:
            'Não estarei disponível pessoalmente e prefiro me comunicar pelo aplicativo',
        }),
      ).toBe('Pelo aplicativo');
      expect(
        summarizeInteracao({
          preferenciaInteracao:
            'Gosto de cumprimentar pessoalmente, mas fora isso, prefiro ficar mais na minha',
        }),
      ).toBe('Discreto');
      expect(
        summarizeInteracao({
          preferenciaInteracao: 'Eu gosto de socializar e passar tempo com os hóspedes',
        }),
      ).toBe('Gosta de socializar');
      expect(
        summarizeInteracao({
          preferenciaInteracao:
            'Não tenho preferência, me adapto às preferências dos hóspedes',
        }),
      ).toBe('Adaptável');
    });

    it('truncates unknown legacy text to about 40 chars', () => {
      const legacy =
        'Texto legado muito longo que não está na whitelist mas ainda pode aparecer no card';
      const summary = summarizeInteracao({ preferenciaInteracao: legacy as never });
      expect(summary.length).toBeLessThanOrEqual(40);
      expect(summary.endsWith('…')).toBe(true);
    });
  });
});
