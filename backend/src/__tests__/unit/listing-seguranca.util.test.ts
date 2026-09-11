import {
  DISPOSITIVO_DETALHES_MAX,
  RECOMENDACOES_ESPECIAIS_MAX,
  summarizeSeguranca,
  validateListingSeguranca,
} from '../../../../server/modules/acomodacoes/services/listing-seguranca.util';

describe('listing-seguranca.util', () => {
  it('accepts null with empty object', () => {
    expect(validateListingSeguranca(null)).toEqual({ ok: true, value: {} });
  });

  it('rejects non-object payload', () => {
    expect(validateListingSeguranca('x').ok).toBe(false);
    expect(validateListingSeguranca([]).ok).toBe(false);
  });

  it('rejects unknown top-level keys', () => {
    const r = validateListingSeguranca({ extra: true });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('seguranca_invalida');
      expect(r.message).toContain('extra');
    }
  });

  it('coerces boolean consideracoes and omits false', () => {
    expect(
      validateListingSeguranca({
        consideracoes: {
          altura: 'true',
          agua: 0,
          animais: '1',
        },
      }),
    ).toEqual({
      ok: true,
      value: {
        consideracoes: {
          altura: true,
          animais: true,
        },
      },
    });
  });

  it('rejects unknown consideracao keys', () => {
    const r = validateListingSeguranca({
      consideracoes: { 'chave-invalida': true },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain('chave-invalida');
    }
  });

  it('rejects invalid consideracao boolean type', () => {
    expect(validateListingSeguranca({ consideracoes: { altura: {} } }).ok).toBe(false);
  });

  it('accepts active dispositivos and sanitizes detalhes', () => {
    expect(
      validateListingSeguranca({
        dispositivos: {
          'camera-externa': { ativo: true, detalhes: '  Portão\u0007  ' },
          fumaca: { ativo: 'true' },
          co: { ativo: false },
        },
      }),
    ).toEqual({
      ok: true,
      value: {
        dispositivos: {
          'camera-externa': { ativo: true, detalhes: 'Portão' },
          fumaca: { ativo: true },
        },
      },
    });
  });

  it('rejects unknown dispositivo keys', () => {
    const r = validateListingSeguranca({
      dispositivos: { 'drone-vigilancia': { ativo: true } },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain('drone-vigilancia');
    }
  });

  it('rejects oversized dispositivo detalhes', () => {
    const r = validateListingSeguranca({
      dispositivos: {
        ruido: { ativo: true, detalhes: 'a'.repeat(DISPOSITIVO_DETALHES_MAX + 1) },
      },
    });
    expect(r.ok).toBe(false);
  });

  it('rejects dispositivo with unknown nested fields', () => {
    const r = validateListingSeguranca({
      dispositivos: {
        armas: { ativo: true, local: 'quarto' },
      },
    });
    expect(r.ok).toBe(false);
  });

  it('accepts infoPropriedade booleans and rejects unknown keys', () => {
    expect(
      validateListingSeguranca({
        infoPropriedade: { vigilancia: true, aparelhos: 'false' },
      }),
    ).toEqual({
      ok: true,
      value: { infoPropriedade: { vigilancia: true } },
    });

    expect(
      validateListingSeguranca({
        infoPropriedade: { 'espaco-compartilhado': 1, vigilancia: true },
      }),
    ).toEqual({
      ok: true,
      value: {
        infoPropriedade: {
          'espaco-compartilhado': true,
          vigilancia: true,
        },
      },
    });

    expect(
      validateListingSeguranca({
        infoPropriedade: { desconhecido: true },
      }).ok,
    ).toBe(false);
  });

  it('sanitizes recomendacoesEspeciais', () => {
    expect(
      validateListingSeguranca({
        recomendacoesEspeciais: '  Cuidado com degraus\u0007  ',
      }),
    ).toEqual({
      ok: true,
      value: { recomendacoesEspeciais: 'Cuidado com degraus' },
    });
  });

  it('rejects oversized recomendacoesEspeciais', () => {
    const r = validateListingSeguranca({
      recomendacoesEspeciais: 'a'.repeat(RECOMENDACOES_ESPECIAIS_MAX + 1),
    });
    expect(r.ok).toBe(false);
  });

  it('summarizes card preview', () => {
    expect(summarizeSeguranca(undefined)).toBe('Adicionar informações');
    expect(
      summarizeSeguranca({
        consideracoes: { altura: true, agua: false },
        dispositivos: {
          fumaca: { ativo: true },
          co: { ativo: false },
        },
      }),
    ).toBe('1 consideração(ões) · 1 dispositivo(s)');
  });
});
