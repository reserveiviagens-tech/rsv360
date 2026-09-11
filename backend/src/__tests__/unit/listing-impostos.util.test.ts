import {
  maskCnpj,
  summarizeImpostos,
  validateListingImpostos,
} from '../../../../server/modules/acomodacoes/services/listing-impostos.util';

/** Algorithmically valid fake CNPJ for tests only — not a real company. */
const FAKE_CNPJ_FORMATTED = '11.222.333/0001-81';
const FAKE_CNPJ_DIGITS = '11222333000181';

describe('listing-impostos.util', () => {
  it('accepts null/undefined/empty as undefined value', () => {
    expect(validateListingImpostos(null)).toEqual({ ok: true, value: undefined });
    expect(validateListingImpostos(undefined)).toEqual({ ok: true, value: undefined });
    expect(validateListingImpostos({})).toEqual({ ok: true, value: undefined });
  });

  it('sanitizes inscricao and notas control chars', () => {
    expect(
      validateListingImpostos({
        inscricaoMunicipal: ' IM-1234\u0007 ',
        notas: ' Observação\u0008 ',
      }),
    ).toEqual({
      ok: true,
      value: {
        inscricaoMunicipal: 'IM-1234',
        notas: 'Observação',
      },
    });
  });

  it('strips disallowed chars from inscricao municipal', () => {
    expect(
      validateListingImpostos({
        inscricaoMunicipal: 'IM@1234#',
      }),
    ).toEqual({
      ok: true,
      value: { inscricaoMunicipal: 'IM1234' },
    });
  });

  it('forces aliquotaPct omitted when isento is true', () => {
    expect(
      validateListingImpostos({
        isento: true,
        aliquotaPct: 5,
      }),
    ).toEqual({
      ok: true,
      value: { isento: true },
    });
  });

  it('rejects unknown keys', () => {
    const result = validateListingImpostos({
      inscricaoMunicipal: 'IM-1234',
      foo: 'bar',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('impostos_invalido');
      expect(result.message).toContain('foo');
    }
  });

  it('accepts valid 14-digit fake CNPJ and stores digits only', () => {
    expect(validateListingImpostos({ cnpj: FAKE_CNPJ_FORMATTED })).toEqual({
      ok: true,
      value: { cnpj: FAKE_CNPJ_DIGITS },
    });
    expect(validateListingImpostos({ cnpj: FAKE_CNPJ_DIGITS })).toEqual({
      ok: true,
      value: { cnpj: FAKE_CNPJ_DIGITS },
    });
  });

  it('rejects CNPJ with wrong length or invalid checksum without echoing input', () => {
    const short = validateListingImpostos({ cnpj: '1234567890123' });
    expect(short.ok).toBe(false);
    if (!short.ok) {
      expect(short.message).toBe('CNPJ inválido');
      expect(short.message).not.toContain('1234567890123');
    }

    const letters = validateListingImpostos({ cnpj: 'abcdefghijklmn' });
    expect(letters.ok).toBe(false);
    if (!letters.ok) {
      expect(letters.message).toBe('CNPJ inválido');
      expect(letters.message).not.toContain('abcdefghijklmn');
    }

    const badChecksum = validateListingImpostos({ cnpj: '11222333000180' });
    expect(badChecksum.ok).toBe(false);
    if (!badChecksum.ok) {
      expect(badChecksum.message).toBe('CNPJ inválido');
      expect(badChecksum.message).not.toContain('11222333000180');
    }
  });

  it('omits empty CNPJ after stripping non-digits', () => {
    expect(validateListingImpostos({ cnpj: '   ..--  ' })).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it('rejects NaN and out-of-range aliquota', () => {
    expect(validateListingImpostos({ aliquotaPct: NaN }).ok).toBe(false);
    expect(validateListingImpostos({ aliquotaPct: -1 }).ok).toBe(false);
    expect(validateListingImpostos({ aliquotaPct: 100.1 }).ok).toBe(false);
    expect(validateListingImpostos({ aliquotaPct: 5.555 }).ok).toBe(false);
  });

  it('accepts valid aliquota with up to 2 decimal places', () => {
    expect(
      validateListingImpostos({ aliquotaPct: 5.5 }),
    ).toEqual({
      ok: true,
      value: { aliquotaPct: 5.5 },
    });
    expect(
      validateListingImpostos({ aliquotaPct: '12,25' }),
    ).toEqual({
      ok: true,
      value: { aliquotaPct: 12.25 },
    });
  });

  it('rejects non-object payload', () => {
    expect(validateListingImpostos([]).ok).toBe(false);
    expect(validateListingImpostos('x').ok).toBe(false);
  });

  it('rejects fields over max length', () => {
    expect(
      validateListingImpostos({
        inscricaoMunicipal: 'x'.repeat(41),
      }).ok,
    ).toBe(false);
    expect(
      validateListingImpostos({
        notas: 'x'.repeat(501),
      }).ok,
    ).toBe(false);
  });

  it('masks CNPJ for preview', () => {
    expect(maskCnpj(FAKE_CNPJ_DIGITS)).toBe('**.***.***/****-81');
    expect(maskCnpj('123')).toBe('**.***.***/****-**');
  });

  it('summarizes card preview labels without exposing full CNPJ', () => {
    expect(summarizeImpostos(undefined)).toBe('Adicionar informações');
    expect(summarizeImpostos({})).toBe('Adicionar informações');
    expect(summarizeImpostos({ isento: true })).toBe('Isento');
    expect(summarizeImpostos({ aliquotaPct: 5 })).toBe('5%');
    expect(summarizeImpostos({ aliquotaPct: 5.5 })).toBe('5.5%');
    expect(summarizeImpostos({ inscricaoMunicipal: 'IM-1234' })).toBe(
      'Inscrição cadastrada',
    );
    expect(
      summarizeImpostos({
        inscricaoMunicipal: 'IM-1234',
        notas: 'Nota interna',
      }),
    ).toBe('Inscrição cadastrada');

    const cnpjSummary = summarizeImpostos({ cnpj: FAKE_CNPJ_DIGITS });
    expect(cnpjSummary).toBe('CNPJ **.***.***/****-81');
    expect(cnpjSummary).not.toContain(FAKE_CNPJ_DIGITS);
    expect(cnpjSummary).not.toContain('112223330001');
  });
});
