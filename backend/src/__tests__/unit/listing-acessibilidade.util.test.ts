import {
  summarizeAcessibilidade,
  validateListingAcessibilidade,
} from '../../../../server/modules/acomodacoes/services/listing-acessibilidade.util';
import { unidadeTemAcessibilidadeDeclarada } from '../../../../server/modules/acomodacoes/services/acessibilidade-fotos.util';

describe('listing-acessibilidade.util', () => {
  it('rejects unknown resource id', () => {
    const r = validateListingAcessibilidade([{ id: 'wifi', possui: false }]);
    expect(r.ok).toBe(false);
  });

  it('rejects possui true without photos', () => {
    const r = validateListingAcessibilidade([
      { id: 'entrada-larga', possui: true, fotos: [] },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('acessibilidade_invalida');
  });

  it('accepts possui true with photo', () => {
    const r = validateListingAcessibilidade([
      {
        id: 'entrada-larga',
        possui: true,
        fotos: [{ url: 'https://cdn.example/a.jpg', status: 'pendente' }],
      },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toHaveLength(1);
      expect(r.value[0].id).toBe('entrada-larga');
      expect(r.value[0].fotos[0].status).toBe('pendente');
    }
  });

  it('clears photos when possui false', () => {
    const r = validateListingAcessibilidade([
      {
        id: 'sem-degraus',
        possui: false,
        fotos: [{ url: 'https://cdn.example/a.jpg', status: 'publicado' }],
      },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value[0]).toEqual({ id: 'sem-degraus', possui: false, fotos: [] });
    }
  });

  it('summarizes obligatory photos first', () => {
    expect(
      summarizeAcessibilidade([{ id: 'vaga-pcd', possui: true, fotos: [] }]),
    ).toBe('Obrigatório: adicione novas fotos');
    expect(
      summarizeAcessibilidade([
        {
          id: 'vaga-pcd',
          possui: true,
          fotos: [{ url: 'https://x', status: 'em_revisao' }],
        },
      ]),
    ).toBe('1 foto(s) em revisão');
  });

  it('unidadeTemAcessibilidadeDeclarada', () => {
    expect(
      unidadeTemAcessibilidadeDeclarada({
        acessibilidade: [{ id: 'sem-degraus', possui: false }],
      }),
    ).toBe(true);
    expect(
      unidadeTemAcessibilidadeDeclarada({
        acessibilidade: [
          {
            id: 'entrada-larga',
            possui: true,
            fotos: [{ url: 'https://x', status: 'pendente' }],
          },
        ],
      }),
    ).toBe(false);
    expect(
      unidadeTemAcessibilidadeDeclarada({
        acessibilidade: [
          {
            id: 'entrada-larga',
            possui: true,
            fotos: [{ url: 'https://x', status: 'publicado' }],
          },
        ],
      }),
    ).toBe(true);
  });
});
