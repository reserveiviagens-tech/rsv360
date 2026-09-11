import {
  MOTIVO_ARQUIVAR_MAX,
  sanitizeMotivoArquivar,
  validateMotivoArquivar,
  validateMotivoDesarquivar,
} from '../../../../server/modules/acomodacoes/services/listing-arquivar.util';

describe('listing-arquivar.util', () => {
  it('accepts null/undefined/empty as undefined', () => {
    expect(validateMotivoArquivar(null)).toEqual({ ok: true, value: undefined });
    expect(validateMotivoArquivar(undefined)).toEqual({ ok: true, value: undefined });
    expect(validateMotivoArquivar('')).toEqual({ ok: true, value: undefined });
    expect(validateMotivoArquivar('   ')).toEqual({ ok: true, value: undefined });
  });

  it('sanitizes control chars and trims', () => {
    expect(sanitizeMotivoArquivar(' pausa\u0007 temporária ')).toBe('pausa temporária');
    expect(validateMotivoArquivar(' pausa\u0007 temporária ')).toEqual({
      ok: true,
      value: 'pausa temporária',
    });
  });

  it('truncates to max length', () => {
    const long = 'a'.repeat(MOTIVO_ARQUIVAR_MAX + 20);
    expect(sanitizeMotivoArquivar(long)?.length).toBe(MOTIVO_ARQUIVAR_MAX);
  });

  it('rejects non-string motivo', () => {
    expect(validateMotivoArquivar(123)).toEqual({
      ok: false,
      error: 'invalid_motivo',
      message: 'Motivo deve ser texto',
    });
  });

  it('validateMotivoDesarquivar reuses archive sanitize rules', () => {
    expect(validateMotivoDesarquivar).toBe(validateMotivoArquivar);
    expect(validateMotivoDesarquivar(' retomada ')).toEqual({ ok: true, value: 'retomada' });
  });
});
