import { buildImpostosExportCsv } from '../../../../server/modules/acomodacoes/services/listing-impostos-export.util';

/** Algorithmically valid fake CNPJ for tests only — not a real company. */
const FAKE_CNPJ_DIGITS = '11222333000181';

describe('listing-impostos-export.util', () => {
  it('includes masked CNPJ in CSV line, never raw 14 digits', () => {
    const csv = buildImpostosExportCsv([
      {
        id: 42,
        titulo: 'Unidade teste',
        hotelId: 'HTL-001',
        metadata: {
          impostos: {
            cnpj: FAKE_CNPJ_DIGITS,
            aliquotaPct: 5,
          },
        },
      },
    ]);

    expect(csv).toContain('**.***.***/****-81');
    expect(csv).not.toContain(FAKE_CNPJ_DIGITS);
    expect(csv).not.toContain('112223330001');
  });

  it('sets temNotas sim/nao without exporting notas text', () => {
    const withNotas = buildImpostosExportCsv([
      {
        id: 1,
        titulo: 'Com notas',
        hotelId: 'H1',
        metadata: { impostos: { notas: 'Observação interna confidencial' } },
      },
    ]);
    expect(withNotas.split('\n')[1]).toMatch(/,sim$/);
    expect(withNotas).not.toContain('Observação interna');
    expect(withNotas).not.toContain('confidencial');

    const withoutNotas = buildImpostosExportCsv([
      {
        id: 2,
        titulo: 'Sem notas',
        hotelId: 'H2',
        metadata: { impostos: { inscricaoMunicipal: 'IM-99' } },
      },
    ]);
    expect(withoutNotas.split('\n')[1]).toMatch(/,nao$/);
  });

  it('escapes commas in titulo', () => {
    const csv = buildImpostosExportCsv([
      {
        id: 3,
        titulo: 'Apto, centro histórico',
        hotelId: 'H3',
        metadata: {},
      },
    ]);

    expect(csv).toContain('"Apto, centro histórico"');
  });

  it('uses exact CSV header', () => {
    const csv = buildImpostosExportCsv([]);
    expect(csv.split('\n')[0]).toBe(
      'id,titulo,hotelId,isento,aliquotaPct,inscricaoMunicipal,cnpjMascarado,temNotas',
    );
  });
});
