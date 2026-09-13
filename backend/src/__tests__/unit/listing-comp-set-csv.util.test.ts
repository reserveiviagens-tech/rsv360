import {
  formatCompSetCsv,
  parseCompSetCsv,
} from '../../../../server/modules/acomodacoes/services/listing-comp-set-csv.util';

describe('listing-comp-set-csv.util', () => {
  it('parses valid CSV and generates UUIDs', () => {
    const csv = [
      'nome,precoNoite,precoMin,precoMax,notas',
      'Vizinho A,320.5,,,boa localização',
      'Faixa B,,200,400,',
    ].join('\n');
    const r = parseCompSetCsv(csv);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(2);
    expect(r.value[0]?.nome).toBe('Vizinho A');
    expect(r.value[0]?.precoNoite).toBe(320.5);
    expect(r.value[0]?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(r.value[1]?.precoMin).toBe(200);
    expect(r.value[1]?.precoMax).toBe(400);
  });

  it('rejects empty CSV', () => {
    const r = parseCompSetCsv('   ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('comp_set_csv_invalido');
  });

  it('rejects scrape-like URLs in nome or notas', () => {
    const withUrl = parseCompSetCsv(
      ['nome,precoNoite,precoMin,precoMax,notas', 'https://airbnb.com/rooms/1,100,,,'].join(
        '\n',
      ),
    );
    expect(withUrl.ok).toBe(false);

    const withBooking = parseCompSetCsv(
      [
        'nome,precoNoite,precoMin,precoMax,notas',
        'Hotel X,100,,,ver booking.com/hotel/x',
      ].join('\n'),
    );
    expect(withBooking.ok).toBe(false);
  });

  it('rejects header-only or bad header', () => {
    expect(parseCompSetCsv('nome,precoNoite,precoMin,precoMax\n').ok).toBe(false);
    expect(parseCompSetCsv('a,b,c\nx,1,2').ok).toBe(false);
  });

  it('round-trips via formatCompSetCsv', () => {
    const parsed = parseCompSetCsv(
      'nome,precoNoite,precoMin,precoMax,notas\nCasa,150,,,"nota, com vírgula"',
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const again = parseCompSetCsv(formatCompSetCsv(parsed.value));
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.value[0]?.nome).toBe('Casa');
    expect(again.value[0]?.precoNoite).toBe(150);
    expect(again.value[0]?.notas).toBe('nota, com vírgula');
  });
});
