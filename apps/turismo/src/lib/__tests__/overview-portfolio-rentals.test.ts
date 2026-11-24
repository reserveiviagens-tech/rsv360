import { repairUtf8Mojibake, unidadesToRentalPortfolio } from '../overview-portfolio';

describe('unidadesToRentalPortfolio', () => {
  it('maps publicado unit to for_rent with stable id', () => {
    const [row] = unidadesToRentalPortfolio([
      {
        id: 42,
        titulo: 'Suíte Master',
        statusPublicacao: 'publicado',
        precoDiaria: 320,
        hotelId: 'hotel-abc',
        quartos: 2,
      },
    ]);
    expect(row.id).toBe('unit-42');
    expect(row.listingStatus).toBe('for_rent');
    expect(row.name).toBe('Suíte Master');
    expect(row.rentAmount).toBe(320);
    expect(row.vacantUnits).toBe(1);
    expect(row.address).toBe('hotel-abc');
  });

  it('maps em_aprovacao to application', () => {
    const [row] = unidadesToRentalPortfolio([
      { id: 1, titulo: 'Flat', statusPublicacao: 'em_aprovacao', precoDiaria: null },
    ]);
    expect(row.listingStatus).toBe('application');
    expect(row.rent).toBe('Consultar');
  });

  it('returns empty array for no units', () => {
    expect(unidadesToRentalPortfolio([])).toEqual([]);
  });

  it('repairUtf8Mojibake fixes common mojibake in titles', () => {
    expect(repairUtf8Mojibake('SuÃ­te')).toBe('Suíte');
  });
});