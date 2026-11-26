import { unidadesToSalesListings } from '../overview-portfolio';

describe('unidadesToSalesListings', () => {
  it('maps publicado unit to active sale with unit slug', () => {
    const [row] = unidadesToSalesListings([
      {
        id: 7,
        titulo: 'Casa Vista',
        statusPublicacao: 'publicado',
        precoDiaria: 450000,
        hotelId: 'Caldas Novas',
        quartos: 3,
      },
    ]);
    expect(row.id).toBe('unit-7');
    expect(row.slug).toBe('unit-7');
    expect(row.status).toBe('active');
    expect(row.beds).toBe(3);
    expect(row.address).toBe('Caldas Novas');
  });

  it('maps em_aprovacao to offer', () => {
    const [row] = unidadesToSalesListings([
      { id: 1, titulo: 'Flat', statusPublicacao: 'em_aprovacao' },
    ]);
    expect(row.status).toBe('offer');
  });

  it('returns empty array for no units', () => {
    expect(unidadesToSalesListings([])).toEqual([]);
  });
});