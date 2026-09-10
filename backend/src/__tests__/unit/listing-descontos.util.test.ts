import {
  DESCONTO_PCT_MAX,
  NOITES_MENSAL,
  NOITES_SEMANAL,
  buildDescontoStayBreakdown,
  summarizeDescontos,
  validateListingDescontosPatch,
} from '../../../../server/modules/acomodacoes/services/listing-descontos.util';

describe('listing-descontos.util', () => {
  it('accepts 0–99 and rounds', () => {
    const r = validateListingDescontosPatch({
      descontoSemanalPct: 10.4,
      descontoMensalPct: 21,
    });
    expect(r).toEqual({
      ok: true,
      value: { descontoSemanalPct: 10, descontoMensalPct: 21 },
    });
  });

  it('rejects over max', () => {
    const r = validateListingDescontosPatch({ descontoSemanalPct: DESCONTO_PCT_MAX + 1 });
    expect(r.ok).toBe(false);
  });

  it('rejects non-numeric', () => {
    const r = validateListingDescontosPatch({ descontoMensalPct: 'abc' });
    expect(r.ok).toBe(false);
  });

  it('treats null as 0 (clear discount)', () => {
    const r = validateListingDescontosPatch({ descontoSemanalPct: null });
    expect(r).toEqual({ ok: true, value: { descontoSemanalPct: 0 } });
  });

  it('summarizes like the plan card', () => {
    expect(
      summarizeDescontos({ descontoSemanalPct: 10, descontoMensalPct: 21 }),
    ).toBe('Desconto semanal de 10% · Desconto mensal de 21%');
    expect(summarizeDescontos({ descontoSemanalPct: 0, descontoMensalPct: 0 })).toBeNull();
    expect(summarizeDescontos({ descontoSemanalPct: 10 })).toBe('Desconto semanal de 10%');
  });

  it('builds stay breakdown with fee and payout', () => {
    const bd = buildDescontoStayBreakdown({
      precoDiaria: 100,
      noites: NOITES_SEMANAL,
      descontoPct: 10,
      feeRate: 0.1,
    });
    expect(bd).not.toBeNull();
    if (!bd) return;
    expect(bd.noites).toBe(7);
    expect(bd.precoBaseTotal).toBe(700);
    expect(bd.descontoValor).toBe(70);
    expect(bd.precoHospede).toBe(630);
    expect(bd.taxa).toBe(63);
    expect(bd.voceRecebe).toBe(567);
    expect(bd.mediaNoite).toBe(90);
  });

  it('returns null breakdown without base price', () => {
    expect(
      buildDescontoStayBreakdown({
        precoDiaria: 0,
        noites: NOITES_MENSAL,
        descontoPct: 20,
      }),
    ).toBeNull();
  });
});
