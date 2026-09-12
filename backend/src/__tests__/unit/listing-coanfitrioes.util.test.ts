import {
  COANFITRIOES_MAX,
  coanfitriaoMatchesEmail,
  findCoanfitriaoAtivoByEmail,
  mapConviteRowToListingCoanfitriao,
  maskEmail,
  normalizeCoanfitriaoEmail,
  papelPermiteCalendario,
  papelPermiteMensagens,
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

  it('normalizeCoanfitriaoEmail trims and lowercases', () => {
    expect(normalizeCoanfitriaoEmail(' COHOST@test.local ')).toBe('cohost@test.local');
    expect(normalizeCoanfitriaoEmail('bad')).toBeUndefined();
  });

  it('maskEmail hides local part except first char', () => {
    expect(maskEmail('cohost@test.local')).toBe('c***@test.local');
  });

  it('coanfitriaoMatchesEmail is case-insensitive', () => {
    const item = {
      id: 'c1',
      nome: 'Ana',
      email: 'cohost@test.local',
      papel: 'tudo' as const,
      status: 'pendente' as const,
    };
    expect(coanfitriaoMatchesEmail(item, 'COHOST@test.local')).toBe(true);
    expect(coanfitriaoMatchesEmail(item, 'other@test.local')).toBe(false);
  });

  it('findCoanfitriaoAtivoByEmail returns only active matches', () => {
    const list = [
      {
        id: 'c1',
        nome: 'Ana',
        email: 'cohost@test.local',
        papel: 'calendario' as const,
        status: 'pendente' as const,
      },
      {
        id: 'c2',
        nome: 'Bob',
        email: 'cohost@test.local',
        papel: 'mensagens' as const,
        status: 'ativo' as const,
      },
    ];
    expect(findCoanfitriaoAtivoByEmail(list, 'cohost@test.local')?.id).toBe('c2');
    expect(findCoanfitriaoAtivoByEmail(list, 'missing@test.local')).toBeUndefined();
  });

  it('papelPermiteCalendario and papelPermiteMensagens', () => {
    expect(papelPermiteCalendario('calendario')).toBe(true);
    expect(papelPermiteCalendario('tudo')).toBe(true);
    expect(papelPermiteCalendario('mensagens')).toBe(false);
    expect(papelPermiteMensagens('mensagens')).toBe(true);
    expect(papelPermiteMensagens('tudo')).toBe(true);
    expect(papelPermiteMensagens('calendario')).toBe(false);
  });

  it('mapConviteRowToListingCoanfitriao maps DB row to API shape', () => {
    expect(
      mapConviteRowToListingCoanfitriao({
        id: 'c1',
        nome: 'Maria',
        email: 'cohost@test.local',
        papel: 'tudo',
        status: 'pendente',
      }),
    ).toEqual({
      id: 'c1',
      nome: 'Maria',
      email: 'cohost@test.local',
      papel: 'tudo',
      status: 'pendente',
    });
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
