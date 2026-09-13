import {
  NFSE_DRAFTS_MAX,
  appendNfseDraft,
  buildNfseDraft,
  isValidNfseMes,
  mergeNfseDraftIntoMetadata,
  readNfseDraftsFromMetadata,
  type NfseDraft,
} from '../../../../server/modules/acomodacoes/services/listing-nfse-draft.util';

describe('listing-nfse-draft.util', () => {
  it('buildNfseDraft sets imposto 0 when isento', () => {
    const d = buildNfseDraft({
      mes: '2026-03',
      receita: 2000,
      impostos: { isento: true, aliquotaPct: 5 },
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      criadoEm: '2026-03-15T12:00:00.000Z',
    });
    expect(d.isento).toBe(true);
    expect(d.aliquotaPct).toBeNull();
    expect(d.impostoEstimado).toBe(0);
    expect(d.status).toBe('nfse_pending');
  });

  it('buildNfseDraft leaves impostoEstimado null when aliquota missing', () => {
    const d = buildNfseDraft({
      mes: '2026-03',
      receita: 1500,
      impostos: { inscricaoMunicipal: 'IM-1' },
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      criadoEm: '2026-03-15T12:00:00.000Z',
    });
    expect(d.isento).toBe(false);
    expect(d.aliquotaPct).toBeNull();
    expect(d.impostoEstimado).toBeNull();
    expect(d.receita).toBe(1500);
  });

  it('buildNfseDraft applies aliquotaPct', () => {
    const d = buildNfseDraft({
      mes: '2026-04',
      receita: 1000,
      impostos: { aliquotaPct: 5 },
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      criadoEm: '2026-04-01T00:00:00.000Z',
    });
    expect(d.aliquotaPct).toBe(5);
    expect(d.impostoEstimado).toBe(50);
  });

  it('appendNfseDraft caps at NFSE_DRAFTS_MAX (newest first)', () => {
    const existing: NfseDraft[] = Array.from({ length: NFSE_DRAFTS_MAX }, (_, i) =>
      buildNfseDraft({
        mes: `2020-${String((i % 12) + 1).padStart(2, '0')}`,
        receita: i,
        impostos: { aliquotaPct: 1 },
        id: `${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`,
        criadoEm: `2020-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
      }),
    );
    const newest = buildNfseDraft({
      mes: '2026-09',
      receita: 999,
      impostos: { aliquotaPct: 2 },
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      criadoEm: '2026-09-12T00:00:00.000Z',
    });
    const next = appendNfseDraft(existing, newest);
    expect(next).toHaveLength(NFSE_DRAFTS_MAX);
    expect(next[0]?.id).toBe(newest.id);
    expect(next.some((d) => d.id === existing[NFSE_DRAFTS_MAX - 1]?.id)).toBe(false);
  });

  it('mergeNfseDraftIntoMetadata replaces same-mes pending and preserves others', () => {
    const prev = buildNfseDraft({
      mes: '2026-03',
      receita: 100,
      impostos: { aliquotaPct: 5 },
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      criadoEm: '2026-03-01T00:00:00.000Z',
    });
    const other = buildNfseDraft({
      mes: '2026-02',
      receita: 50,
      impostos: { isento: true },
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      criadoEm: '2026-02-01T00:00:00.000Z',
    });
    const { metadata, draft } = mergeNfseDraftIntoMetadata(
      { impostos: { aliquotaPct: 5 }, nfseDrafts: [prev, other] },
      { mes: '2026-03', receita: 500, impostos: { aliquotaPct: 5 } },
    );
    const drafts = readNfseDraftsFromMetadata(metadata);
    expect(drafts).toHaveLength(2);
    expect(drafts[0]?.mes).toBe('2026-03');
    expect(drafts[0]?.receita).toBe(500);
    expect(drafts[0]?.id).toBe(draft.id);
    expect(drafts.some((d) => d.id === other.id)).toBe(true);
    expect(drafts.some((d) => d.id === prev.id)).toBe(false);
  });

  it('isValidNfseMes accepts YYYY-MM', () => {
    expect(isValidNfseMes('2026-09')).toBe(true);
    expect(isValidNfseMes('2026-13')).toBe(false);
    expect(isValidNfseMes('09-2026')).toBe(false);
  });
});
