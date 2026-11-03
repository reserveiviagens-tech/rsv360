const mockGerarLancamentos = jest.fn();

jest.mock('../../../../server/modules/comissoes/services/comissoes.service', () => ({
  comissoesService: {
    gerarLancamentos: (...args: unknown[]) => mockGerarLancamentos(...args),
  },
}));

const mockUpdateReturning = jest.fn();
const mockUpdateWhere = jest.fn(() => ({ returning: mockUpdateReturning }));
const mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockUpdateSet }));

const mockInsertReturning = jest.fn().mockResolvedValue([]);
const mockInsertValues = jest.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = jest.fn(() => ({ values: mockInsertValues }));

const mockSelectOrderBy = jest.fn().mockResolvedValue([]);
const mockSelectWhere = jest.fn(() => ({ orderBy: mockSelectOrderBy }));
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
const mockSelect = jest.fn(() => ({ from: mockSelectFrom }));

jest.mock('../../../../server/lib/db', () => ({
  db: {
    update: () => mockUpdate(),
    insert: () => mockInsert(),
    select: () => mockSelect(),
  },
}));

jest.mock('../../../../server/modules/configuracoes/config.service', () => ({
  ConfigService: { obterRegrasCotacao: jest.fn().mockResolvedValue({ delayDisparoMinutos: 0 }) },
}));
jest.mock('../../../../server/modules/propostas/propostas.queue', () => ({
  agendarEntregaRoteiro: jest.fn().mockResolvedValue(undefined),
  agendarAvaliarObjecao: jest.fn(),
}));
jest.mock('../../../../server/modules/propostas/metrics', () => ({
  recordPropostaAceita: jest.fn(),
  recordPropostaGerada: jest.fn(),
}));

import { propostasService } from '../../../../server/modules/propostas/services/propostas.service';

describe('propostasService.changeStatus paid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateReturning.mockResolvedValue([{ id: 7, status: 'paid' }]);
    mockGerarLancamentos.mockResolvedValue({ generated: true, insertedIds: [1] });
  });

  it('chama gerarLancamentos ao marcar paid', async () => {
    await propostasService.changeStatus(7, 'paid', 99);
    expect(mockGerarLancamentos).toHaveBeenCalledWith(7);
  });

  it('não chama gerarLancamentos para accepted', async () => {
    mockUpdateReturning.mockResolvedValue([{ id: 7, status: 'accepted' }]);
    await propostasService.changeStatus(7, 'accepted', 99);
    expect(mockGerarLancamentos).not.toHaveBeenCalled();
  });
});
