import {
  buildImpostosReceitaMensalCsv,
  computeImpostoEstimado,
  extractImpostosFromMetadata,
} from '../../../../server/modules/acomodacoes/services/listing-impostos-receita-export.util';

describe('listing-impostos-receita-export.util', () => {
  const periodo = { mes: '2026-03', de: '2026-03-01', ate: '2026-03-31' };

  it('computeImpostoEstimado applies aliquotaPct and rounds to cents', () => {
    expect(computeImpostoEstimado(1000, { aliquotaPct: 5 })).toBe(50);
    expect(computeImpostoEstimado(100.33, { aliquotaPct: 2.5 })).toBe(2.51);
  });

  it('computeImpostoEstimado returns 0 when isento', () => {
    expect(computeImpostoEstimado(5000, { isento: true, aliquotaPct: 10 })).toBe(0);
  });

  it('computeImpostoEstimado returns null when aliquota missing', () => {
    expect(computeImpostoEstimado(5000, {})).toBeNull();
    expect(computeImpostoEstimado(5000, undefined)).toBeNull();
  });

  it('CSV never includes notas or raw CNPJ', () => {
    const csv = buildImpostosReceitaMensalCsv(
      [
        {
          acomodacaoId: 7,
          titulo: 'Casa',
          receita: 2000,
          metadata: {
            impostos: {
              aliquotaPct: 5,
              cnpj: '11222333000181',
              notas: 'Segredo fiscal interno',
              inscricaoMunicipal: 'IM-1',
            },
          },
        },
      ],
      periodo,
    );
    expect(csv).not.toContain('11222333000181');
    expect(csv).not.toContain('Segredo fiscal');
    expect(csv).toContain('100');
    expect(csv).toContain('IM-1');
  });

  it('CSV marks isento and zeros impostoEstimado', () => {
    const csv = buildImpostosReceitaMensalCsv(
      [
        {
          acomodacaoId: 1,
          titulo: 'Isenta',
          receita: 900,
          metadata: { impostos: { isento: true, aliquotaPct: 5 } },
        },
      ],
      periodo,
    );
    const row = csv.split('\n')[1];
    expect(row).toContain(',true,0,');
    expect(row).not.toMatch(/,5,/);
  });

  it('uses exact CSV header', () => {
    const csv = buildImpostosReceitaMensalCsv([], periodo);
    expect(csv.split('\n')[0]).toBe(
      'acomodacao_id,titulo,mes,de,ate,receita,aliquotaPct,isento,impostoEstimado,inscricaoMunicipal',
    );
  });

  it('extractImpostosFromMetadata reads nested impostos', () => {
    expect(extractImpostosFromMetadata({ impostos: { aliquotaPct: 3 } })?.aliquotaPct).toBe(3);
    expect(extractImpostosFromMetadata(null)).toBeUndefined();
  });
});
