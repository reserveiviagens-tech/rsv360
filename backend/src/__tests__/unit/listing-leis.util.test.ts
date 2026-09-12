import {
  summarizeLeisLocais,
  validateListingLeis,
} from '../../../../server/modules/acomodacoes/services/listing-leis.util';

/** Fake license number for tests only — not a real permit. */
const FAKE_LICENCA = 'LIC-2024-001';
const FAKE_NOTAS = 'Observação interna de teste';

describe('listing-leis.util', () => {
  it('accepts null/undefined/empty as undefined value', () => {
    expect(validateListingLeis(null)).toEqual({ ok: true, value: undefined });
    expect(validateListingLeis(undefined)).toEqual({ ok: true, value: undefined });
    expect(validateListingLeis({})).toEqual({ ok: true, value: undefined });
  });

  it('sanitizes licenca, zoneamento and notas control chars', () => {
    expect(
      validateListingLeis({
        licencaNumero: ' LIC-1\u0007 ',
        zoneamento: ' Residencial\u0008 ',
        notas: ' Nota\u0008 ',
      }),
    ).toEqual({
      ok: true,
      value: {
        licencaNumero: 'LIC-1',
        zoneamento: 'Residencial',
        notas: 'Nota',
      },
    });
  });

  it('strips disallowed chars from licenca numero', () => {
    expect(
      validateListingLeis({
        licencaNumero: 'LIC@1234#',
      }),
    ).toEqual({
      ok: true,
      value: { licencaNumero: 'LIC1234' },
    });
  });

  it('accepts declaracaoAceita true and omits false', () => {
    expect(validateListingLeis({ declaracaoAceita: true })).toEqual({
      ok: true,
      value: { declaracaoAceita: true },
    });
    expect(validateListingLeis({ declaracaoAceita: false })).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it('rejects unknown keys', () => {
    const result = validateListingLeis({
      licencaNumero: FAKE_LICENCA,
      foo: 'bar',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('leis_invalido');
      expect(result.message).toContain('foo');
    }
  });

  it('rejects non-object payload', () => {
    expect(validateListingLeis([]).ok).toBe(false);
    expect(validateListingLeis('x').ok).toBe(false);
  });

  it('rejects fields over max length', () => {
    expect(
      validateListingLeis({
        licencaNumero: 'x'.repeat(41),
      }).ok,
    ).toBe(false);
    expect(
      validateListingLeis({
        zoneamento: 'x'.repeat(81),
      }).ok,
    ).toBe(false);
    expect(
      validateListingLeis({
        notas: 'x'.repeat(501),
      }).ok,
    ).toBe(false);
  });

  it('rejects invalid declaracaoAceita type', () => {
    const result = validateListingLeis({ declaracaoAceita: 'maybe' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('declaracaoAceita deve ser boolean');
    }
  });

  it('does not echo licenca or notas in error messages', () => {
    const badLicenca = validateListingLeis({ licencaNumero: 12345 });
    expect(badLicenca.ok).toBe(false);
    if (!badLicenca.ok) {
      expect(badLicenca.message).toBe('Número de licença inválido');
      expect(badLicenca.message).not.toContain('12345');
    }

    const badNotas = validateListingLeis({ notas: 999 });
    expect(badNotas.ok).toBe(false);
    if (!badNotas.ok) {
      expect(badNotas.message).toBe('Notas inválidas');
      expect(badNotas.message).not.toContain('999');
    }
  });

  it('summarizes card preview labels without exposing licenca or notas', () => {
    expect(summarizeLeisLocais(undefined)).toBe('Adicionar informações');
    expect(summarizeLeisLocais({})).toBe('Adicionar informações');
    expect(summarizeLeisLocais({ declaracaoAceita: true })).toBe('Declaração aceita');
    expect(summarizeLeisLocais({ licencaNumero: FAKE_LICENCA })).toBe('Licença cadastrada');
    expect(summarizeLeisLocais({ zoneamento: 'Residencial' })).toBe('Zoneamento informado');
    expect(summarizeLeisLocais({ notas: FAKE_NOTAS })).toBe('Informações adicionais');

    const summary = summarizeLeisLocais({
      licencaNumero: FAKE_LICENCA,
      notas: FAKE_NOTAS,
    });
    expect(summary).toBe('Licença cadastrada');
    expect(summary).not.toContain(FAKE_LICENCA);
    expect(summary).not.toContain(FAKE_NOTAS);
  });
});
