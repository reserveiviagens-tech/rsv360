import {
  LOCALIZACAO_TEXTO_LONGO_MAX,
  summarizeLocalizacao,
  validateListingLocalizacao,
} from '../../../../server/modules/acomodacoes/services/listing-localizacao.util';

describe('listing-localizacao.util', () => {
  it('accepts null as empty object', () => {
    expect(validateListingLocalizacao(null)).toEqual({ ok: true, value: {} });
  });

  it('rejects non-object payload', () => {
    expect(validateListingLocalizacao('x').ok).toBe(false);
    expect(validateListingLocalizacao([]).ok).toBe(false);
  });

  it('normalizes address, UF and CEP', () => {
    const r = validateListingLocalizacao({
      endereco: '  Rua A  ',
      cidade: 'Caldas Novas',
      uf: 'go',
      cep: '72800000',
      mostrarExata: true,
    });
    expect(r).toEqual({
      ok: true,
      value: {
        endereco: 'Rua A',
        cidade: 'Caldas Novas',
        uf: 'GO',
        cep: '72800-000',
        mostrarExata: true,
      },
    });
  });

  it('rejects invalid UF and CEP', () => {
    expect(validateListingLocalizacao({ uf: 'XX' }).ok).toBe(false);
    expect(validateListingLocalizacao({ cep: '123' }).ok).toBe(false);
  });

  it('rejects unknown caracteristicas / vistas ids', () => {
    expect(validateListingLocalizacao({ caracteristicas: ['xyz'] }).ok).toBe(false);
    expect(validateListingLocalizacao({ vistas: ['xyz'] }).ok).toBe(false);
  });

  it('accepts catalog ids and long texts within limits', () => {
    const r = validateListingLocalizacao({
      caracteristicas: ['praia', 'praia', 'centro'],
      vistas: ['mar'],
      descricaoBairro: 'Bairro calmo',
      locomocao: 'Uber fácil',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.caracteristicas).toEqual(['praia', 'centro']);
      expect(r.value.vistas).toEqual(['mar']);
      expect(r.value.descricaoBairro).toBe('Bairro calmo');
      expect(r.value.locomocao).toBe('Uber fácil');
    }
  });

  it('rejects oversized descricaoBairro', () => {
    const r = validateListingLocalizacao({
      descricaoBairro: 'a'.repeat(LOCALIZACAO_TEXTO_LONGO_MAX + 1),
    });
    expect(r.ok).toBe(false);
  });

  it('summarizes card preview', () => {
    expect(summarizeLocalizacao({ cidade: 'Caldas', uf: 'GO' })).toBe('Caldas, GO');
    expect(
      summarizeLocalizacao({
        cidade: 'Caldas',
        uf: 'GO',
        caracteristicas: ['praia'],
      }),
    ).toBe('Caldas, GO · 1 detalhe');
    expect(summarizeLocalizacao({})).toBeNull();
  });

  it('accepts lat/lng coordinates', () => {
    const r = validateListingLocalizacao({
      cidade: 'Caldas Novas',
      uf: 'GO',
      lat: -17.7539,
      lng: -48.6183,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.lat).toBeCloseTo(-17.7539, 4);
      expect(r.value.lng).toBeCloseTo(-48.6183, 4);
    }
  });

  it('rejects invalid lat/lng', () => {
    expect(validateListingLocalizacao({ lat: 999 }).ok).toBe(false);
    expect(validateListingLocalizacao({ lng: 999 }).ok).toBe(false);
  });
});
