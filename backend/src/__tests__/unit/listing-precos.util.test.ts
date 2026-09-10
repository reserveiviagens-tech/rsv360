import {
  PRECO_MAX,
  parsePrecoMoney,
  summarizePrecos,
  validateListingPrecosPatch,
} from '../../../../server/modules/acomodacoes/services/listing-precos.util';

describe('listing-precos.util', () => {
  it('parses money and clears empty', () => {
    expect(parsePrecoMoney('', 'Preço')).toEqual({ ok: true, value: null });
    expect(parsePrecoMoney(null, 'Preço')).toEqual({ ok: true, value: null });
    expect(parsePrecoMoney('199,5', 'Preço')).toEqual({ ok: true, value: 199.5 });
    expect(parsePrecoMoney(250, 'Preço')).toEqual({ ok: true, value: 250 });
  });

  it('rejects negative and over max', () => {
    expect(parsePrecoMoney(-1, 'Preço').ok).toBe(false);
    expect(parsePrecoMoney(PRECO_MAX + 1, 'Preço').ok).toBe(false);
    expect(parsePrecoMoney('abc', 'Preço').ok).toBe(false);
  });

  it('requires base price > 0 when set', () => {
    const zero = validateListingPrecosPatch({ precoDiaria: 0 });
    expect(zero.ok).toBe(false);
    const ok = validateListingPrecosPatch({ precoDiaria: 180 });
    expect(ok).toEqual({ ok: true, value: { precoDiaria: 180 } });
  });

  it('allows clearing weekend price with null', () => {
    const r = validateListingPrecosPatch({ precoFimSemana: null });
    expect(r).toEqual({ ok: true, value: { precoFimSemana: null } });
  });

  it('coerces smart price toggle', () => {
    const r = validateListingPrecosPatch({ precoInteligenteAtivo: 1 });
    expect(r).toEqual({ ok: true, value: { precoInteligenteAtivo: true } });
  });

  it('summarizes card like the plan', () => {
    expect(
      summarizePrecos({
        precoDiaria: 250,
        precoFimSemana: 320,
        precoInteligenteAtivo: true,
      }),
    ).toBe('R$ 250/noite · Fim de semana R$ 320 · Preço Inteligente');
    expect(summarizePrecos({ precoDiaria: 250 })).toBe('R$ 250/noite');
    expect(summarizePrecos({ precoDiaria: null })).toBeNull();
  });
});
