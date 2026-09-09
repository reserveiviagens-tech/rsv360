import {
  clampSmartPrice,
  normalizeMinNoitesPorCheckin,
  resolverDescontoHospede,
  resolverMinNoitesCheckin,
  sugerirPrecoCompetitivo,
  validarRegrasEstadiaAcomodacao,
} from '../../../../server/modules/acomodacoes/services/host-pricing.helpers';

describe('host-pricing.helpers (Fase C RSV360°)', () => {
  const basePolicy = {
    descontoSemanalPct: 10,
    descontoMensalPct: 21,
    descontoUltimaHoraPct: 10,
    descontoUltimaHoraDias: 3,
    descontoAntecipadaPct: 15,
    descontoAntecipadaDias: 30,
    descontoNovoAnuncioPct: 20,
    descontoNovoAnuncioLimite: 3,
    descontoAvaliacaoPct: 15,
    descontoAvaliacaoMinNota: 4.8,
    descontoAvaliacaoMinReviews: 3,
  };

  it('picks monthly over weekly when stay >= 28 nights', () => {
    const r = resolverDescontoHospede(basePolicy, {
      noites: 28,
      diasAntecedencia: 10,
      reservasConfirmadasAnuncio: 10,
    });
    expect(r.regra).toBe('mensal');
    expect(r.pct).toBe(21);
  });

  it('applies last-minute when within lead days', () => {
    const r = resolverDescontoHospede(
      { ...basePolicy, descontoMensalPct: 0, descontoSemanalPct: 0 },
      { noites: 2, diasAntecedencia: 2, reservasConfirmadasAnuncio: 10 },
    );
    expect(r.regra).toBe('ultima_hora');
    expect(r.pct).toBe(10);
  });

  it('chooses highest matching discount (no stack)', () => {
    const r = resolverDescontoHospede(basePolicy, {
      noites: 7,
      diasAntecedencia: 60,
      reservasConfirmadasAnuncio: 0,
      guestRating: 5,
      guestReviews: 5,
    });
    expect(r.pct).toBe(20);
    expect(r.regra).toBe('novo_anuncio');
  });

  it('suggests competitive price below base', () => {
    const tip = sugerirPrecoCompetitivo(250);
    expect(tip.precoSugerido).toBeLessThan(250);
    expect(tip.ganhoBuscasPct).toBeGreaterThanOrEqual(5);
  });

  it('clamps price when smart pricing is active', () => {
    expect(clampSmartPrice(80, true, 100, 400)).toBe(100);
    expect(clampSmartPrice(500, true, 100, 400)).toBe(400);
    expect(clampSmartPrice(80, false, 100, 400)).toBe(80);
  });

  it('normalizes min nights by check-in weekday', () => {
    expect(normalizeMinNoitesPorCheckin(null)).toBeNull();
    expect(normalizeMinNoitesPorCheckin({})).toBeNull();
    const map = normalizeMinNoitesPorCheckin({ '5': 3, '6': 2 }, 1);
    expect(map).toEqual({
      '0': 1,
      '1': 1,
      '2': 1,
      '3': 1,
      '4': 1,
      '5': 3,
      '6': 2,
    });
  });

  it('resolves effective min nights for check-in date', () => {
    const map = { '5': 3, '6': 2, '0': 1, '1': 1, '2': 1, '3': 1, '4': 1 };
    // 2026-09-11 is Friday
    expect(resolverMinNoitesCheckin('2026-09-11', 1, map)).toBe(3);
    // 2026-09-12 is Saturday
    expect(resolverMinNoitesCheckin('2026-09-12', 1, map)).toBe(2);
    expect(resolverMinNoitesCheckin('2026-09-11', 2, null)).toBe(2);
  });

  it('enforces stay rules with validarRegrasEstadiaAcomodacao', () => {
    const now = new Date('2026-09-07T10:00:00');
    const base = {
      minNoites: 2,
      maxNoites: 30,
      antecedenciaDias: 0,
      avisoPrevioMesmoDia: '09:00',
      permitirPedidosMesmoDia: true,
      periodoDisponibilidadeMeses: 12,
    };
    expect(validarRegrasEstadiaAcomodacao('2026-10-01', '2026-10-03', base, now)).toEqual({
      ok: true,
    });
    expect(
      validarRegrasEstadiaAcomodacao('2026-10-01', '2026-10-02', base, now).ok,
    ).toBe(false);
    expect(
      validarRegrasEstadiaAcomodacao(
        '2026-09-07',
        '2026-09-09',
        { ...base, avisoPrevioMesmoDia: '09:00' },
        new Date('2026-09-07T10:30:00'),
      ),
    ).toMatchObject({ ok: false, code: 'aviso_mesmo_dia' });
    expect(
      validarRegrasEstadiaAcomodacao(
        '2026-09-07',
        '2026-09-09',
        { ...base, permitirPedidosMesmoDia: false },
        now,
      ),
    ).toMatchObject({ ok: false, code: 'antecedencia' });
    expect(
      validarRegrasEstadiaAcomodacao(
        '2026-10-01',
        '2026-10-03',
        { ...base, periodoDisponibilidadeMeses: 0 },
        now,
      ),
    ).toMatchObject({ ok: false, code: 'janela_disponibilidade' });
  });
});
