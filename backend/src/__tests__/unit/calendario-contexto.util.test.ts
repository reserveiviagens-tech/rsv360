import {
  avaliarPrecificacao,
  classificarTemporadaTipo,
  easterSunday,
  expandFeriadosMd,
  feriadosBrasilAno,
  feriadosNacionaisBr,
  feriadosNoIntervalo,
  gerarPeriodosTemporadaAnos,
  isFimDeSemana,
  parseDataBrDdMmYyyy,
} from '../../../../server/modules/acomodacoes/services/calendario-contexto.util';

describe('calendario-contexto.util', () => {
  it('detecta sexta e sábado como fim de semana', () => {
    expect(isFimDeSemana('2026-09-04')).toBe(true);
    expect(isFimDeSemana('2026-09-05')).toBe(true);
    expect(isFimDeSemana('2026-09-06')).toBe(false);
    expect(isFimDeSemana('2026-09-07')).toBe(false);
  });

  it('classifica slug de temporada', () => {
    expect(classificarTemporadaTipo('alta')).toBe('alta');
    expect(classificarTemporadaTipo('baixa')).toBe('baixa');
    expect(classificarTemporadaTipo('media')).toBe('media');
    expect(classificarTemporadaTipo('feriado')).toBe('feriado');
    expect(classificarTemporadaTipo('ferias_escolares')).toBe('alta');
    expect(classificarTemporadaTipo('Alta Temporada')).toBe('alta');
  });

  it('inclui Natal e Carnaval nos feriados BR', () => {
    const list = feriadosNacionaisBr(2026);
    expect(list.some((f) => f.data === '2026-12-25' && f.nome === 'Natal')).toBe(true);
    expect(list.some((f) => f.nome === 'Carnaval')).toBe(true);
    const easter = easterSunday(2026).toISOString().slice(0, 10);
    expect(easter).toBe('2026-04-05');
  });

  it('inclui feriados estaduais GO e municipais de Caldas Novas', () => {
    const list = feriadosBrasilAno(2026, { cidade: 'Caldas Novas', uf: 'GO' });
    expect(list.some((f) => f.tipo === 'estadual' && f.uf === 'GO')).toBe(true);
    expect(list.some((f) => f.tipo === 'municipal' && String(f.municipio).includes('Caldas'))).toBe(
      true,
    );
  });

  it('gera períodos para 10 anos com carnaval e natal', () => {
    const periodos = gerarPeriodosTemporadaAnos(2026, 10);
    expect(periodos.length).toBeGreaterThan(100);
    expect(periodos.some((p) => p.rotulo === 'Carnaval')).toBe(true);
    expect(periodos.some((p) => p.rotulo?.includes('Natal'))).toBe(true);
    expect(periodos.some((p) => p.temporada === 'ferias_escolares')).toBe(true);
    expect(periodos.some((p) => p.inicio === '2026-01-01' && p.temporada === 'baixa')).toBe(true);
    expect(periodos.some((p) => p.fim === '2035-12-31')).toBe(true);
  });

  it('alerta preço abaixo em alta temporada', () => {
    const alerta = avaliarPrecificacao({
      precoEfetivo: 100,
      precoBase: 500,
      temporada: { id: 1, slug: 'alta', nome: 'Alta', tipo: 'alta' },
      fimDeSemana: false,
      feriado: null,
    });
    expect(alerta.nivel).toBe('abaixo');
    expect(alerta.tags.some((t) => t.includes('Alta'))).toBe(true);
    expect(alerta.faixa.minSugerido).toBeGreaterThan(100);
  });

  it('alerta preço acima em baixa temporada', () => {
    const alerta = avaliarPrecificacao({
      precoEfetivo: 900,
      precoBase: 400,
      temporada: { id: 2, slug: 'baixa', nome: 'Baixa', tipo: 'baixa' },
      fimDeSemana: false,
      feriado: null,
    });
    expect(alerta.nivel).toBe('acima');
    expect(alerta.tags.some((t) => t.includes('Baixa'))).toBe(true);
  });

  it('marca feriado e eleva faixa', () => {
    const alerta = avaliarPrecificacao({
      precoEfetivo: 500,
      precoBase: 400,
      temporada: null,
      fimDeSemana: false,
      feriado: { data: '2026-12-25', nome: 'Natal', tipo: 'nacional' },
    });
    expect(alerta.tags.some((t) => t.includes('Natal'))).toBe(true);
    expect(alerta.faixa.referencia).toBeGreaterThanOrEqual(Math.round(400 * 1.5));
  });

  it('parseia data BR da FeriadosAPI', () => {
    expect(parseDataBrDdMmYyyy('25/01/2026')).toEqual({ iso: '2026-01-25', md: '01-25' });
    expect(parseDataBrDdMmYyyy('invalid')).toBeNull();
  });

  it('expande MD municipal e mescla no intervalo', () => {
    const extras = expandFeriadosMd(
      [{ md: '05-17', nome: 'Aniversário Teste', tipo: 'municipal', municipio: 'X', uf: 'GO' }],
      '2026-01-01',
      '2027-12-31',
    );
    expect(extras.some((f) => f.data === '2026-05-17')).toBe(true);
    expect(extras.some((f) => f.data === '2027-05-17')).toBe(true);
    const map = feriadosNoIntervalo('2026-05-01', '2026-05-31', { cidade: 'X', uf: 'GO' }, extras);
    expect(map.get('2026-05-17')?.nome).toBe('Aniversário Teste');
  });
});
