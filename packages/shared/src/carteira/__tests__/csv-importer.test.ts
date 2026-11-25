import {
  parseCarteiraCsv,
  parseCarteiraCsvContato,
  parseCarteiraCsvVinculo,
} from '../csv-importer.service';

describe('csv-importer carteira_vinculo', () => {
  it('rejects empty file', () => {
    const r = parseCarteiraCsvVinculo('');
    expect(r.linhasValidas).toBe(0);
    expect(r.erros[0]?.reason).toMatch(/vazio/i);
  });

  it('parses valid rows and skips header', () => {
    const csv = 'corretorId,proprietarioId\n2,10\n3,11';
    const r = parseCarteiraCsvVinculo(csv);
    expect(r.linhasValidas).toBe(2);
    expect(r.preview).toEqual([
      { corretorId: 2, proprietarioId: 10 },
      { corretorId: 3, proprietarioId: 11 },
    ]);
  });

  it('reports invalid IDs', () => {
    const csv = 'a,b\n2,0';
    const r = parseCarteiraCsvVinculo(csv);
    expect(r.linhasInvalidas).toBe(2);
    expect(r.erros.some((e) => e.line === 1)).toBe(true);
  });

  it('supports semicolon delimiter', () => {
    const csv = '2;101\n2;102';
    const r = parseCarteiraCsvVinculo(csv);
    expect(r.linhasValidas).toBe(2);
  });
});

describe('csv-importer contato_corretor', () => {
  it('validates email and phone', () => {
    const csv = 'Nome,Email,Telefone\nJoão Silva,joao@exemplo.com,(64) 99999-8888\nX,bad,123';
    const r = parseCarteiraCsvContato(csv);
    expect(r.linhasValidas).toBe(1);
    expect(r.preview[0]?.nome).toBe('João Silva');
    expect(r.erros.length).toBe(1);
  });
});

describe('parseCarteiraCsv mode router', () => {
  it('routes contato mode', () => {
    const r = parseCarteiraCsv('Maria,maria@test.com,64999998888', 'contato_corretor');
    expect(r.linhasValidas).toBe(1);
  });
});