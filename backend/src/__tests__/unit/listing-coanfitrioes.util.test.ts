import {
  COANFITRIOES_MAX,
  summarizeCoanfitrioes,
  validateListingCoanfitrioes,
} from '../../../../server/modules/acomodacoes/services/listing-coanfitrioes.util';

describe('listing-coanfitrioes.util', () => {
  it('accepts null as empty array', () => {
    expect(validateListingCoanfitrioes(null)).toEqual({ ok: true, value: [] });
  });

  it('rejects non-array payload', () => {
    expect(validateListingCoanfitrioes({}).ok).toBe(false);
    expect(validateListingCoanfitrioes('x').ok).toBe(false);
  });

  it('normalizes nome, email, papel and status', () => {
    const r = validateListingCoanfitrioes([
      {
        id: ' c1 ',
        nome: '  Maria  ',
        email: ' COHOST@test.local ',
        papel: 'calendario',
        status: 'pendente',
      },
    ]);
    expect(r).toEqual({
      ok: true,
      value: [
        {
          id: 'c1',
          nome: 'Maria',
          email: 'cohost@test.local',
          papel: 'calendario',
          status: 'pendente',
        },
      ],
    });
  });

  it('rejects missing nome', () => {
    expect(
      validateListingCoanfitrioes([
        { id: 'c1', nome: '   ', papel: 'tudo', status: 'ativo' },
      ]).ok,
    ).toBe(false);
  });

  it('rejects invalid papel or status', () => {
    expect(
      validateListingCoanfitrioes([
        { id: 'c1', nome: 'Ana', papel: 'admin', status: 'ativo' },
      ]).ok,
    ).toBe(false);
    expect(
      validateListingCoanfitrioes([
        { id: 'c1', nome: 'Ana', papel: 'tudo', status: 'banido' },
      ]).ok,
    ).toBe(false);
  });

  it('rejects duplicate email when present', () => {
    const r = validateListingCoanfitrioes([
      { id: 'c1', nome: 'Ana', email: 'a@test.local', papel: 'tudo', status: 'ativo' },
      { id: 'c2', nome: 'Bob', email: 'A@test.local', papel: 'mensagens', status: 'pendente' },
    ]);
    expect(r.ok).toBe(false);
  });

  it('rejects duplicate id', () => {
    const r = validateListingCoanfitrioes([
      { id: 'c1', nome: 'Ana', papel: 'tudo', status: 'ativo' },
      { id: 'c1', nome: 'Bob', papel: 'mensagens', status: 'pendente' },
    ]);
    expect(r.ok).toBe(false);
  });

  it('rejects more than max co-hosts', () => {
    const items = Array.from({ length: COANFITRIOES_MAX + 1 }, (_, i) => ({
      id: `c${i}`,
      nome: `Host ${i}`,
      papel: 'tudo' as const,
      status: 'pendente' as const,
    }));
    expect(validateListingCoanfitrioes(items).ok).toBe(false);
  });

  it('rejects invalid email format', () => {
    expect(
      validateListingCoanfitrioes([
        { id: 'c1', nome: 'Ana', email: 'not-an-email', papel: 'tudo', status: 'pendente' },
      ]).ok,
    ).toBe(false);
  });

  it('summarizes card preview', () => {
    expect(
      summarizeCoanfitrioes([
        { id: 'c1', nome: 'Ana', papel: 'tudo', status: 'ativo' },
        { id: 'c2', nome: 'Bob', papel: 'mensagens', status: 'revogado' },
      ]),
    ).toBe('1 coanfitrião');
    expect(
      summarizeCoanfitrioes([
        { id: 'c1', nome: 'Ana', papel: 'tudo', status: 'ativo' },
        { id: 'c2', nome: 'Bob', papel: 'mensagens', status: 'pendente' },
      ]),
    ).toBe('2 coanfitriões');
    expect(summarizeCoanfitrioes([])).toBeNull();
    expect(
      summarizeCoanfitrioes([
        { id: 'c1', nome: 'Ana', papel: 'tudo', status: 'revogado' },
      ]),
    ).toBeNull();
  });
});
