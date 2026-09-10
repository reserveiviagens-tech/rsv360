import {
  SOBRE_ANFITRIAO_BIO_MAX,
  summarizeSobreAnfitriao,
  validateListingSobreAnfitriao,
} from '../../../../server/modules/acomodacoes/services/listing-sobre-anfitriao.util';

describe('listing-sobre-anfitriao.util', () => {
  it('accepts null as empty object', () => {
    expect(validateListingSobreAnfitriao(null)).toEqual({ ok: true, value: {} });
  });

  it('rejects non-object payload', () => {
    expect(validateListingSobreAnfitriao('x').ok).toBe(false);
    expect(validateListingSobreAnfitriao([]).ok).toBe(false);
  });

  it('normalizes bio, interesses, anos and mostrarNoAnuncio', () => {
    const r = validateListingSobreAnfitriao({
      bioCurta: '  Olá, sou anfitrião  ',
      interesses: ['gastronomia', 'gastronomia', 'natureza'],
      anosAnfitriao: 3,
      mostrarNoAnuncio: true,
    });
    expect(r).toEqual({
      ok: true,
      value: {
        bioCurta: 'Olá, sou anfitrião',
        interesses: ['gastronomia', 'natureza'],
        anosAnfitriao: 3,
        mostrarNoAnuncio: true,
      },
    });
  });

  it('rejects unknown interesse ids', () => {
    expect(validateListingSobreAnfitriao({ interesses: ['xyz'] }).ok).toBe(false);
  });

  it('rejects invalid anosAnfitriao', () => {
    expect(validateListingSobreAnfitriao({ anosAnfitriao: -1 }).ok).toBe(false);
    expect(validateListingSobreAnfitriao({ anosAnfitriao: 100 }).ok).toBe(false);
  });

  it('rejects non-boolean mostrarNoAnuncio', () => {
    expect(validateListingSobreAnfitriao({ mostrarNoAnuncio: 'sim' }).ok).toBe(false);
  });

  it('rejects oversized bioCurta', () => {
    const r = validateListingSobreAnfitriao({
      bioCurta: 'a'.repeat(SOBRE_ANFITRIAO_BIO_MAX + 1),
    });
    expect(r.ok).toBe(false);
  });

  it('summarizes card preview', () => {
    expect(
      summarizeSobreAnfitriao({
        bioCurta: 'Apaixonado por Caldas Novas',
        interesses: ['natureza'],
        anosAnfitriao: 2,
      }),
    ).toBe('Apaixonado por Caldas Novas · 1 interesse · 2 anos como anfitrião');
    expect(summarizeSobreAnfitriao({ mostrarNoAnuncio: false })).toBe('Oculto no anúncio');
    expect(summarizeSobreAnfitriao({})).toBeNull();
  });
});
