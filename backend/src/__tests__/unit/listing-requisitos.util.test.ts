import {
  summarizeRequisitos,
  validateListingExigirFotoPerfil,
} from '../../../../server/modules/acomodacoes/services/listing-requisitos.util';

describe('listing-requisitos.util', () => {
  it('defaults null to false', () => {
    expect(validateListingExigirFotoPerfil(null)).toEqual({ ok: true, value: false });
    expect(validateListingExigirFotoPerfil(undefined)).toEqual({ ok: true, value: false });
  });

  it('coerces boolean-like values', () => {
    expect(validateListingExigirFotoPerfil(true)).toEqual({ ok: true, value: true });
    expect(validateListingExigirFotoPerfil(false)).toEqual({ ok: true, value: false });
    expect(validateListingExigirFotoPerfil('true')).toEqual({ ok: true, value: true });
    expect(validateListingExigirFotoPerfil('false')).toEqual({ ok: true, value: false });
    expect(validateListingExigirFotoPerfil(1)).toEqual({ ok: true, value: true });
    expect(validateListingExigirFotoPerfil(0)).toEqual({ ok: true, value: false });
  });

  it('rejects invalid types', () => {
    expect(validateListingExigirFotoPerfil({}).ok).toBe(false);
    expect(validateListingExigirFotoPerfil([]).ok).toBe(false);
  });

  it('summarizes card preview labels', () => {
    expect(summarizeRequisitos(true)).toBe('Foto de perfil exigida');
    expect(summarizeRequisitos(false)).toBe('Requisitos padrão');
    expect(summarizeRequisitos(undefined)).toBe('Requisitos padrão');
    expect(summarizeRequisitos(null)).toBe('Requisitos padrão');
  });
});
