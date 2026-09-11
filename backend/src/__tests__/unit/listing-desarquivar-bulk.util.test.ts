import {
  BULK_DESARQUIVAR_MAX,
  parseBulkIds,
} from '../../../../server/modules/acomodacoes/services/listing-desarquivar-bulk.util';

describe('listing-desarquivar-bulk.util', () => {
  it('parseBulkIds deduplicates positive integers', () => {
    expect(parseBulkIds([10, 10, 20])).toEqual([10, 20]);
  });

  it('parseBulkIds rejects non-array', () => {
    expect(parseBulkIds(undefined)).toEqual({ error: 'ids é obrigatório (array de inteiros)' });
    expect(parseBulkIds('1,2')).toEqual({ error: 'ids é obrigatório (array de inteiros)' });
  });

  it('parseBulkIds rejects empty array', () => {
    expect(parseBulkIds([])).toEqual({ error: 'ids é obrigatório (array de inteiros)' });
  });

  it('parseBulkIds rejects over cap', () => {
    const ids = Array.from({ length: BULK_DESARQUIVAR_MAX + 1 }, (_, i) => i + 1);
    expect(parseBulkIds(ids)).toEqual({
      error: `Máximo ${BULK_DESARQUIVAR_MAX} ids por requisição`,
    });
  });

  it('parseBulkIds rejects non-integer ids', () => {
    expect(parseBulkIds([1, 2.5])).toEqual({ error: 'Cada id deve ser um inteiro positivo' });
    expect(parseBulkIds([1, '2'])).toEqual({ error: 'Cada id deve ser um inteiro positivo' });
    expect(parseBulkIds([0])).toEqual({ error: 'Cada id deve ser um inteiro positivo' });
  });
});
