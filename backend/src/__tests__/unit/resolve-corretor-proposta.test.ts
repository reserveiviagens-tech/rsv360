import { resolveCorretorIdForAcomodacao } from '../../../../server/modules/comissoes/services/resolve-corretor-proposta';

const mockSelectLimit = jest.fn();
const mockSelectOrderBy = jest.fn(() => ({ limit: mockSelectLimit }));
const mockSelectWhere = jest.fn(() => ({ orderBy: mockSelectOrderBy, limit: mockSelectLimit }));
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
const mockSelect = jest.fn(() => ({ from: mockSelectFrom }));

jest.mock('../../../../server/lib/db', () => ({
  db: { select: () => mockSelect() },
}));

jest.mock('../../../../backend/src/db/schema/acomodacoes', () => ({
  acomodacoes: { id: 'id', proprietarioId: 'proprietario_id' },
}));
jest.mock('../../../../backend/src/db/schema/carteira-corretor', () => ({
  carteiraCorretor: {
    corretorId: 'corretor_id',
    proprietarioId: 'proprietario_id',
    status: 'status',
    criadoEm: 'criado_em',
  },
}));

jest.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => args,
  eq: (...args: unknown[]) => args,
  asc: (x: unknown) => x,
}));

describe('resolveCorretorIdForAcomodacao', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna null para id inválido', async () => {
    await expect(resolveCorretorIdForAcomodacao(0)).resolves.toBeNull();
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('retorna null sem proprietário na acomodação', async () => {
    mockSelectLimit.mockResolvedValueOnce([{ proprietarioId: null }]);
    await expect(resolveCorretorIdForAcomodacao(10)).resolves.toBeNull();
  });

  it('retorna corretor da carteira ativa', async () => {
    mockSelectLimit
      .mockResolvedValueOnce([{ proprietarioId: 100 }])
      .mockResolvedValueOnce([{ corretorId: 42 }]);
    await expect(resolveCorretorIdForAcomodacao(10)).resolves.toBe(42);
  });
});
