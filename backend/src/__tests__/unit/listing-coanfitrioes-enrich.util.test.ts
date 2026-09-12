import {
  enrichMetadataWithCoanfitrioes,
  type ListingCoanfitriao,
} from '../../../../server/modules/acomodacoes/services/listing-coanfitrioes.util';

describe('listing-coanfitrioes enrich util', () => {
  const sampleList: ListingCoanfitriao[] = [
    {
      id: 'c1',
      nome: 'Maria',
      email: 'cohost@test.local',
      papel: 'tudo',
      status: 'pendente',
      expiresAt: '2026-09-26T12:00:00.000Z',
    },
  ];

  it('clears coanfitrioes when list is empty', () => {
    const metadata = { coanfitrioes: [{ id: 'stale', nome: 'Old', papel: 'tudo', status: 'ativo' }] };
    const enriched = enrichMetadataWithCoanfitrioes(metadata, []);
    expect(enriched.coanfitrioes).toBeUndefined();
  });

  it('merges into existing metadata without dropping other keys', () => {
    const metadata = {
      tituloPublico: 'Apartamento centro',
      coanfitrioes: [{ id: 'stale', nome: 'Old', papel: 'tudo', status: 'ativo' }],
    };
    expect(enrichMetadataWithCoanfitrioes(metadata, sampleList)).toEqual({
      tituloPublico: 'Apartamento centro',
      coanfitrioes: sampleList,
    });
  });

  it('preserves list fields without token', () => {
    const enriched = enrichMetadataWithCoanfitrioes(null, sampleList);
    expect(enriched.coanfitrioes).toEqual(sampleList);
    expect((enriched.coanfitrioes as ListingCoanfitriao[])[0]).not.toHaveProperty('token');
    expect((enriched.coanfitrioes as ListingCoanfitriao[])[0]).toMatchObject({
      id: 'c1',
      nome: 'Maria',
      email: 'cohost@test.local',
      papel: 'tudo',
      status: 'pendente',
      expiresAt: '2026-09-26T12:00:00.000Z',
    });
  });
});
