import {
  summarizeTipoPropriedade,
  validateTipoPropriedade,
} from '../../../../server/modules/acomodacoes/services/listing-tipo-propriedade.util';

describe('listing-tipo-propriedade.util', () => {
  it('accepts catalog ids and numeric fields', () => {
    const r = validateTipoPropriedade({
      tipo: 'apartamento',
      acomodacao: 'espaco_inteiro',
      representacao: 'espaco_inteiro',
      andares: 10,
      andar: 3,
      ano: 2018,
      tamanhoM2: 68.5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        tipo: 'apartamento',
        acomodacao: 'espaco_inteiro',
        representacao: 'espaco_inteiro',
        andares: 10,
        andar: 3,
        ano: 2018,
        tamanhoM2: 68.5,
      });
    }
  });

  it('rejects unknown tipo', () => {
    const r = validateTipoPropriedade({ tipo: 'castelo' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('tipo_propriedade_invalido');
  });

  it('rejects out-of-range andar', () => {
    const r = validateTipoPropriedade({ andar: 999 });
    expect(r.ok).toBe(false);
  });

  it('allows empty object', () => {
    const r = validateTipoPropriedade({});
    expect(r).toEqual({ ok: true, value: {} });
  });

  it('summarizes for card preview', () => {
    expect(
      summarizeTipoPropriedade({
        tipo: 'casa',
        acomodacao: 'espaco_inteiro',
        tamanhoM2: 120,
      }),
    ).toBe('Casa · Espaço inteiro · 120 m²');
  });

  it('maps legacy Portuguese labels', () => {
    const r = validateTipoPropriedade({
      tipo: 'Apartamento',
      acomodacao: 'Espaço inteiro',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.tipo).toBe('apartamento');
      expect(r.value.acomodacao).toBe('espaco_inteiro');
    }
  });
});
