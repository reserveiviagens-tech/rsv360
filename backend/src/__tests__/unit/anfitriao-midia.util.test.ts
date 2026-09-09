import {
  midiaAddFoto,
  midiaMoveFoto,
  midiaRemoveFoto,
  midiaSetCategoria,
  midiaWithCapa,
  normalizeMidia,
} from '../../../../server/modules/acomodacoes/services/anfitriao-midia.util';

describe('anfitriao-midia.util', () => {
  it('normalizes legacy string[] fotos into itens', () => {
    const m = normalizeMidia({ capa: '/a.webp', fotos: ['/a.webp', '/b.webp'] });
    expect(m.fotos).toEqual(['/a.webp', '/b.webp']);
    expect(m.itens).toHaveLength(2);
    expect(m.itens[0]).toMatchObject({ url: '/a.webp', categoria: null });
  });

  it('preserves categorias when reordering', () => {
    const raw = {
      capa: '/a.webp',
      fotos: [
        { url: '/a.webp', categoria: 'quarto' },
        { url: '/b.webp', categoria: 'piscina' },
      ],
    };
    const moved = midiaMoveFoto(raw, '/a.webp', 'right');
    expect(moved.fotos).toEqual(['/b.webp', '/a.webp']);
    expect(moved.itens.map((i) => i.categoria)).toEqual(['piscina', 'quarto']);
  });

  it('sets and clears categoria', () => {
    const base = midiaAddFoto({}, '/x.webp');
    const withCat = midiaSetCategoria(base, '/x.webp', 'exterior');
    expect(withCat.itens[0].categoria).toBe('exterior');
    const cleared = midiaSetCategoria(withCat, '/x.webp', null);
    expect(cleared.itens[0].categoria).toBeNull();
  });

  it('rejects invalid categoria', () => {
    const base = midiaAddFoto({}, '/x.webp');
    expect(() => midiaSetCategoria(base, '/x.webp', 'foguete')).toThrow(/inválida/i);
  });

  it('keeps capa sync on remove', () => {
    const raw = midiaWithCapa({ fotos: ['/a.webp', '/b.webp'] }, '/a.webp');
    const next = midiaRemoveFoto(raw, '/a.webp');
    expect(next.capa).toBe('/b.webp');
    expect(next.fotos).toEqual(['/b.webp']);
  });
});
