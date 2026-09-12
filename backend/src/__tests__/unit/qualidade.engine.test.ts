import {
  avaliarQualidadePortfolio,
  avaliarQualidadeUnidade,
  type QualidadeUnitInput,
} from '../../../../server/modules/acomodacoes/services/qualidade.engine';

function emptyUnit(overrides: Partial<QualidadeUnitInput> = {}): QualidadeUnitInput {
  return {
    id: 1,
    titulo: '',
    statusPublicacao: 'rascunho',
    dadosCompletos: false,
    amenidades: [],
    midia: null,
    precoDiaria: null,
    minNoites: null,
    maxNoites: null,
    capacidadeMax: null,
    metadata: {},
    ...overrides,
  };
}

function filledUnit(overrides: Partial<QualidadeUnitInput> = {}): QualidadeUnitInput {
  return emptyUnit({
    titulo: 'Apartamento aconchegante no centro',
    statusPublicacao: 'publicado',
    dadosCompletos: true,
    capacidadeMax: 4,
    tipoId: 2,
    precoDiaria: 250,
    minNoites: 1,
    maxNoites: 30,
    periodoDisponibilidadeMeses: 12,
    descontoSemanalPct: 10,
    midia: { capa: 'https://cdn.example/photo.jpg', fotos: ['a'] },
    amenidades: ['wifi', 'tv'],
    metadata: {
      descricaoDetalhada: { anuncio: 'Descrição completa com mais de vinte caracteres.' },
      tipoPropriedade: { tipo: 'apartamento', acomodacao: 'espaco_inteiro' },
      tiposCama: { casal: 1 },
      modoReserva: 'instantanea',
      localizacao: { cidade: 'Caldas Novas' },
      guiaChegada: { wifiRede: 'RedeHospede', metodoCheckIn: 'Fechadura inteligente' },
      seguranca: { dispositivos: { fumaca: { ativo: true } } },
      idiomas: ['pt', 'en'],
      statusAnuncio: 'anunciado',
    },
    ...overrides,
  });
}

describe('qualidade.engine', () => {
  it('returns low score for empty listing', () => {
    const r = avaliarQualidadeUnidade(emptyUnit());
    expect(r.score).toBeLessThan(30);
    expect(r.categorias).toHaveLength(6);
    expect(r.categorias.every((c) => c.pct < 100)).toBe(true);
  });

  it('returns higher score for filled listing', () => {
    const empty = avaliarQualidadeUnidade(emptyUnit());
    const filled = avaliarQualidadeUnidade(filledUnit());
    expect(filled.score).toBeGreaterThan(empty.score);
    expect(filled.score).toBeGreaterThanOrEqual(80);
  });

  it('scores apresentacao independently from other categories', () => {
    const r = avaliarQualidadeUnidade(
      emptyUnit({
        midia: { capa: 'x.jpg' },
        titulo: 'Meu anúncio',
        metadata: { descricaoDetalhada: { anuncio: 'Texto longo o suficiente para contar.' } },
      }),
    );
    const ap = r.categorias.find((c) => c.id === 'apresentacao');
    expect(ap?.pct).toBe(100);
    const espaco = r.categorias.find((c) => c.id === 'espaco');
    expect(espaco?.pct).toBeLessThan(ap!.pct);
  });

  it('scores preco only when daily rate and discounts exist', () => {
    const onlyPrice = avaliarQualidadeUnidade(emptyUnit({ precoDiaria: 100 }));
    const precoCat = onlyPrice.categorias.find((c) => c.id === 'preco');
    expect(precoCat?.pct).toBe(50);

    const withDiscount = avaliarQualidadeUnidade(
      emptyUnit({ precoDiaria: 100, descontoSemanalPct: 5 }),
    );
    expect(withDiscount.categorias.find((c) => c.id === 'preco')?.pct).toBe(100);
  });

  it('aggregates portfolio averages across units', () => {
    const portfolio = avaliarQualidadePortfolio([
      emptyUnit({ id: 1, titulo: 'Vazio' }),
      filledUnit({ id: 2, titulo: 'Completo' }),
    ]);
    expect(portfolio.scoreMedio).not.toBeNull();
    expect(portfolio.porUnidade).toHaveLength(2);
    expect(portfolio.categorias).toHaveLength(6);
    expect(portfolio.categorias.every((c) => c.pct >= 0 && c.pct <= 100)).toBe(true);
    const apPct = portfolio.categorias.find((c) => c.id === 'apresentacao')?.pct ?? 0;
    expect(apPct).toBeGreaterThan(0);
    expect(apPct).toBeLessThan(100);
  });

  it('returns null scoreMedio for empty portfolio', () => {
    const portfolio = avaliarQualidadePortfolio([]);
    expect(portfolio.scoreMedio).toBeNull();
    expect(portfolio.porUnidade).toEqual([]);
  });

  it('exposes per-check breakdown for debugging UI', () => {
    const r = avaliarQualidadeUnidade(filledUnit());
    for (const cat of r.categorias) {
      expect(cat.checks.length).toBeGreaterThan(0);
      expect(cat.checks.every((ch) => typeof ch.ok === 'boolean')).toBe(true);
    }
  });
});
