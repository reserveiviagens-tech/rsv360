import {
  ajustarPassoNavegacao,
  calcularPassosColapsados,
  hidratarWizardState,
  lerEntradaContextual,
  montarEntradaContextual,
  montarUrlCotacaoContextual,
  passoInicialContextual,
  passosVisiveis,
  resolverOrigemEntrada,
  temParamsContextuais,
} from '@rsv360/shared';

const baseState = {
  checkIn: '',
  checkOut: '',
  adults: 2,
  children: 0,
  hotelId: null as string | null,
  hotelOnlyFlow: false,
  ref: null as string | null,
  canal: null as string | null,
  profile: 'casal' as const,
};

describe('entrada contextual — lerEntradaContextual', () => {
  it('lê deep-link com hotel, datas e MGM', () => {
    const params = new URLSearchParams(
      'hotel=ht-42&checkin=2026-07-01&checkout=2026-07-05&adults=2&children=1&ref=10&canal=whatsapp',
    );
    const parsed = lerEntradaContextual(params);
    expect(parsed.hotel).toBe('ht-42');
    expect(parsed.acomodacaoId).toBeNull();
    expect(parsed.checkin).toBe('2026-07-01');
    expect(parsed.checkout).toBe('2026-07-05');
    expect(parsed.adults).toBe(2);
    expect(parsed.children).toBe(1);
    expect(parsed.ref).toBe('10');
    expect(parsed.canal).toBe('whatsapp');
  });

  it('aceita alias hotelId e acomodacaoId do anúncio público', () => {
    const parsed = lerEntradaContextual(
      new URLSearchParams('hotelId=aguas-da-fonte&acomodacaoId=443'),
    );
    expect(parsed.hotel).toBe('aguas-da-fonte');
    expect(parsed.acomodacaoId).toBe(443);
    const ctx = montarEntradaContextual(parsed, 'deeplink');
    const { state } = hidratarWizardState(
      { ...baseState, selectedAcomodacaoId: null as number | null },
      ctx,
    );
    expect(state.hotelId).toBe('aguas-da-fonte');
    expect(state.selectedAcomodacaoId).toBe(443);
  });

  it('deep-link tem precedência sobre rascunho na hidratação', () => {
    const params = lerEntradaContextual(new URLSearchParams('hotel=vitrine-1&checkin=2026-08-01&checkout=2026-08-03'));
    const ctx = montarEntradaContextual(params, 'deeplink');
    const { state, hotelTravado } = hidratarWizardState(baseState, ctx, {
      checkIn: '2025-01-01',
      checkOut: '2025-01-05',
      hotelId: 'outro',
    });
    expect(state.hotelId).toBe('vitrine-1');
    expect(state.checkIn).toBe('2026-08-01');
    expect(hotelTravado).toBe(true);
  });
});

describe('entrada contextual — origem e passos', () => {
  it('resolve origem deeplink > rascunho > frio', () => {
    const params = lerEntradaContextual(new URLSearchParams(''));
    expect(resolverOrigemEntrada(params, true)).toBe('rascunho');
    expect(resolverOrigemEntrada(params, false)).toBe('frio');
    const withHotel = lerEntradaContextual(new URLSearchParams('hotel=1'));
    expect(temParamsContextuais(withHotel)).toBe(true);
    expect(resolverOrigemEntrada(withHotel, true)).toBe('deeplink');
  });

  it('passoInicialContextual pula datas e hotel', () => {
    const ctx = montarEntradaContextual(
      lerEntradaContextual(new URLSearchParams('hotel=h1&checkin=2026-07-01&checkout=2026-07-03')),
      'deeplink',
    );
    const { state, hotelTravado } = hidratarWizardState(baseState, ctx);
    const colapsados = calcularPassosColapsados(ctx, state, hotelTravado);
    expect(colapsados).toEqual([0, 1]);
    expect(passoInicialContextual(colapsados)).toBe(2);
    expect(passosVisiveis(colapsados)).toHaveLength(6);
  });

  it('apenasHotel colapsa diversão e atrações', () => {
    const ctx = montarEntradaContextual(
      lerEntradaContextual(new URLSearchParams('hotel=h1&checkin=2026-07-01&checkout=2026-07-03&apenasHotel=1')),
      'deeplink',
    );
    const { state, hotelTravado } = hidratarWizardState(baseState, ctx);
    const colapsados = calcularPassosColapsados(ctx, state, hotelTravado);
    expect(colapsados).toEqual([0, 1, 2, 3]);
    expect(passoInicialContextual(colapsados)).toBe(4);
  });

  it('ajusta navegação pulando colapsados', () => {
    const colapsados = [0, 1];
    expect(ajustarPassoNavegacao(1, colapsados, 1)).toBe(2);
    expect(ajustarPassoNavegacao(2, colapsados, -1)).toBe(2);
  });
});

describe('montarUrlCotacaoContextual', () => {
  it('monta URL relativa e absoluta', () => {
    expect(montarUrlCotacaoContextual('', { hotel: '42', canal: 'vitrine' })).toBe(
      '/cotacao?hotel=42&canal=vitrine',
    );
    expect(montarUrlCotacaoContextual('http://localhost:3000', { hotel: '42', ref: 9 })).toBe(
      'http://localhost:3000/cotacao?hotel=42&ref=9',
    );
  });

  it('inclui acomodacaoId quando informado', () => {
    expect(
      montarUrlCotacaoContextual('', { hotel: 'aguas-da-fonte', acomodacaoId: 443 }),
    ).toBe('/cotacao?hotel=aguas-da-fonte&acomodacaoId=443');
  });
});
