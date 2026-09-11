import {
  summarizeCancelamento,
  validateListingCancelamento,
} from '../../../../server/modules/acomodacoes/services/listing-cancelamento.util';

describe('listing-cancelamento.util', () => {
  it('accepts null with defaults', () => {
    expect(validateListingCancelamento(null)).toEqual({
      ok: true,
      value: {
        politicaCancelamentoCurta: 'limitada',
        politicaCancelamentoLonga: 'restrita_longa',
        opcaoNaoReembolsavel: false,
      },
    });
  });

  it('rejects non-object payload', () => {
    expect(validateListingCancelamento('x').ok).toBe(false);
    expect(validateListingCancelamento([]).ok).toBe(false);
  });

  it('accepts valid policies', () => {
    expect(
      validateListingCancelamento({
        politicaCancelamentoCurta: 'flexivel',
        politicaCancelamentoLonga: 'flexivel_longa',
        opcaoNaoReembolsavel: true,
      }),
    ).toEqual({
      ok: true,
      value: {
        politicaCancelamentoCurta: 'flexivel',
        politicaCancelamentoLonga: 'flexivel_longa',
        opcaoNaoReembolsavel: true,
      },
    });
  });

  it('rejects invalid curta policy', () => {
    expect(validateListingCancelamento({ politicaCancelamentoCurta: 'auto' }).ok).toBe(false);
    expect(validateListingCancelamento({ politicaCancelamentoCurta: 1 }).ok).toBe(false);
  });

  it('rejects invalid longa policy', () => {
    expect(validateListingCancelamento({ politicaCancelamentoLonga: 'rigorosa_longa' }).ok).toBe(
      false,
    );
    expect(validateListingCancelamento({ politicaCancelamentoLonga: 1 }).ok).toBe(false);
  });

  it('coerces opcaoNaoReembolsavel to boolean', () => {
    expect(
      validateListingCancelamento({
        opcaoNaoReembolsavel: 'true',
      }),
    ).toEqual({
      ok: true,
      value: { opcaoNaoReembolsavel: true },
    });
    expect(
      validateListingCancelamento({
        opcaoNaoReembolsavel: 0,
      }),
    ).toEqual({
      ok: true,
      value: { opcaoNaoReembolsavel: false },
    });
  });

  it('summarizes card preview with human labels', () => {
    expect(
      summarizeCancelamento({
        politicaCancelamentoCurta: 'moderada',
        politicaCancelamentoLonga: 'flexivel_longa',
      }),
    ).toBe('Moderada · Flexível (longa duração)');
    expect(
      summarizeCancelamento({
        politicaCancelamentoCurta: 'limitada',
        politicaCancelamentoLonga: 'restrita_longa',
        opcaoNaoReembolsavel: true,
      }),
    ).toBe('Limitada · Restrita (longa duração) · Não reembolsável');
  });
});
