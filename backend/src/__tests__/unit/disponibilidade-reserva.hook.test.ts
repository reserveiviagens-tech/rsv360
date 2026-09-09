const mockSelectLimit = jest.fn();
const mockSelectWhere = jest.fn(() => ({ limit: mockSelectLimit }));
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
const mockSelect = jest.fn((..._args: unknown[]) => ({ from: mockSelectFrom }));

const mockUpdateWhere = jest.fn().mockResolvedValue(undefined);
const mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn((..._args: unknown[]) => ({ set: mockUpdateSet }));

const mockInsertValues = jest.fn().mockResolvedValue(undefined);
const mockInsert = jest.fn((..._args: unknown[]) => ({ values: mockInsertValues }));

jest.mock('../../../../server/lib/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

jest.mock('../../../../backend/src/db/schema/disponibilidade-acomodacao', () => ({
  disponibilidadeAcomodacao: {
    id: 'id',
    acomodacaoId: 'acomodacao_id',
    data: 'data',
    disponivel: 'disponivel',
  },
}));

jest.mock('../../../../backend/src/db/schema/acomodacoes', () => ({
  acomodacoes: {
    id: 'id',
    minNoites: 'min_noites',
    maxNoites: 'max_noites',
    minNoitesPorCheckin: 'min_noites_por_checkin',
    antecedenciaDias: 'antecedencia_dias',
    avisoPrevioMesmoDia: 'aviso_previo_mesmo_dia',
    periodoDisponibilidadeMeses: 'periodo_disponibilidade_meses',
    checkinDiasPermitidos: 'checkin_dias_permitidos',
    checkoutDiasPermitidos: 'checkout_dias_permitidos',
    metadata: 'metadata',
  },
}));

jest.mock('drizzle-orm', () => ({
  and: (...args: unknown[]) => args,
  eq: (...args: unknown[]) => args,
  sql: (_strings: TemplateStringsArray, ...values: unknown[]) => ({
    queryChunks: values.map((value) => ({ value })),
  }),
}));

import {
  assertDisponibilidadeReserva,
  comHoldReservaAtomico,
  DisponibilidadeReservaConflictError,
  isDataBloqueada,
  listDiariasEstadia,
  marcarDiariasReservadas,
  verificarDisponibilidadeReserva,
} from '../../../../server/modules/acomodacoes/services/disponibilidade-reserva.hook';

const DEFAULT_UNIT = {
  minNoites: 1,
  maxNoites: 30,
  minNoitesPorCheckin: null,
  antecedenciaDias: 0,
  avisoPrevioMesmoDia: null,
  periodoDisponibilidadeMeses: 24,
  checkinDiasPermitidos: null,
  checkoutDiasPermitidos: null,
  metadata: { permitirPedidosMesmoDia: true },
};

function isUnitSelect(cols: unknown): boolean {
  return Boolean(cols && typeof cols === 'object' && cols !== null && 'minNoites' in cols);
}

function sqlParams(query: unknown): unknown[] {
  const chunks = (query as { queryChunks?: Array<{ value?: unknown }> }).queryChunks ?? [];
  return chunks
    .filter((chunk) => chunk && Object.prototype.hasOwnProperty.call(chunk, 'value'))
    .map((chunk) => chunk.value);
}

function createFakeHoldDb(initiallyBlocked: string[] = []) {
  const blocked = new Set(initiallyBlocked);
  const lockTails = new Map<string, Promise<void>>();

  const runInTransaction = async <T>(
    fn: (tx: { execute: (query: unknown) => Promise<{ rows: unknown[] }> }) => Promise<T>,
  ): Promise<T> => {
    const releases: Array<() => void> = [];
    const claimedHere: string[] = [];
    const tx = {
      async execute(query: unknown) {
        const params = sqlParams(query);
        const lockKey = params.find(
          (value) => typeof value === 'string' && value.startsWith('rsv360:proposta-hold:'),
        );
        if (typeof lockKey === 'string') {
          const previous = lockTails.get(lockKey) ?? Promise.resolve();
          let release!: () => void;
          const gate = new Promise<void>((resolve) => {
            release = resolve;
          });
          lockTails.set(lockKey, previous.then(() => gate));
          await previous;
          releases.push(release);
          return { rows: [{ locked: true }] };
        }

        const date = params.find(
          (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value),
        );
        const acomodacaoId = params.find((value) => typeof value === 'number');
        if (typeof date === 'string' && typeof acomodacaoId === 'number') {
          const key = `${acomodacaoId}:${date}`;
          if (blocked.has(key)) {
            return { rows: [] };
          }
          blocked.add(key);
          claimedHere.push(key);
          return { rows: [{ data: date }] };
        }
        return { rows: [] };
      },
    };

    try {
      return await fn(tx);
    } catch (error) {
      for (const key of claimedHere) blocked.delete(key);
      throw error;
    } finally {
      for (const release of releases.reverse()) release();
    }
  };

  return { blocked, runInTransaction };
}

describe('disponibilidade-reserva.hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelect.mockImplementation((cols: unknown) => {
      mockSelectLimit.mockImplementation(async () => {
        if (isUnitSelect(cols)) return [DEFAULT_UNIT];
        return [];
      });
      return { from: mockSelectFrom };
    });
  });

  it('listDiariasEstadia retorna noites entre check-in e check-out', () => {
    expect(listDiariasEstadia('2026-10-01', '2026-10-04')).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
    ]);
  });

  it('tabela vazia: verificarDisponibilidadeReserva passa', async () => {
    await expect(assertDisponibilidadeReserva(10, '2026-10-01', '2026-10-03')).resolves.toBeUndefined();
  });

  it('data bloqueada retorna 409 com datasIndisponiveis', async () => {
    mockSelect.mockImplementation((cols: unknown) => {
      mockSelectLimit.mockImplementation(async () => {
        if (isUnitSelect(cols)) return [DEFAULT_UNIT];
        return [];
      });
      return { from: mockSelectFrom };
    });

    // Override day lookups: first night free, second blocked
    let dayCall = 0;
    mockSelect.mockImplementation((cols: unknown) => {
      mockSelectLimit.mockImplementation(async () => {
        if (isUnitSelect(cols)) return [DEFAULT_UNIT];
        dayCall += 1;
        if (dayCall === 2) return [{ disponivel: false }];
        return [];
      });
      return { from: mockSelectFrom };
    });

    const result = await verificarDisponibilidadeReserva(10, '2026-10-01', '2026-10-03');
    expect(result).toEqual({ ok: false, datasIndisponiveis: ['2026-10-02'] });

    dayCall = 0;
    await expect(assertDisponibilidadeReserva(10, '2026-10-01', '2026-10-03')).rejects.toMatchObject({
      acomodacaoId: 10,
      datasIndisponiveis: ['2026-10-02'],
      statusCode: 409,
    });
  });

  it('isDataBloqueada é false quando não há linha', async () => {
    await expect(isDataBloqueada(5, '2026-10-01')).resolves.toBe(false);
  });

  it('marcarDiariasReservadas grava disponivel=false (insert quando vazio)', async () => {
    await marcarDiariasReservadas(7, '2026-10-01', '2026-10-03');

    expect(mockInsert).toHaveBeenCalledTimes(2);
    expect(mockInsertValues).toHaveBeenNthCalledWith(1, {
      acomodacaoId: 7,
      data: '2026-10-01',
      disponivel: false,
      observacao: 'reservado',
    });
  });

  it('segunda reserva sobreposta falha quando diária já está indisponível', async () => {
    let dayCall = 0;
    mockSelect.mockImplementation((cols: unknown) => {
      mockSelectLimit.mockImplementation(async () => {
        if (isUnitSelect(cols)) return [DEFAULT_UNIT];
        dayCall += 1;
        if (dayCall === 1) return [{ disponivel: false }];
        return [];
      });
      return { from: mockSelectFrom };
    });
    const result = await verificarDisponibilidadeReserva(7, '2026-10-02', '2026-10-05');
    expect(result).toEqual({ ok: false, datasIndisponiveis: ['2026-10-02'] });
  });

  it('datas disjuntas: segunda verificação passa', async () => {
    await expect(
      assertDisponibilidadeReserva(9, '2026-10-01', '2026-10-03'),
    ).resolves.toBeUndefined();
    await expect(
      assertDisponibilidadeReserva(9, '2026-10-10', '2026-10-12'),
    ).resolves.toBeUndefined();
  });

  it('rejeita estadia abaixo do mínimo por dia de check-in', async () => {
    mockSelect.mockImplementation((cols: unknown) => {
      mockSelectLimit.mockImplementation(async () => {
        if (isUnitSelect(cols)) {
          return [
            {
              ...DEFAULT_UNIT,
              minNoites: 1,
              // 2026-10-02 is Friday → require 3
              minNoitesPorCheckin: { '0': 1, '1': 1, '2': 1, '3': 1, '4': 1, '5': 3, '6': 2 },
            },
          ];
        }
        return [];
      });
      return { from: mockSelectFrom };
    });

    await expect(assertDisponibilidadeReserva(10, '2026-10-02', '2026-10-03')).rejects.toMatchObject({
      statusCode: 400,
      code: 'min_noites',
    });
  });

  it('PR-11d: 2 aceites concorrentes na mesma diária → só 1 hard-hold vence', async () => {
    const fake = createFakeHoldDb();
    const accept = (propostaId: number) =>
      comHoldReservaAtomico(
        15,
        '2026-10-01',
        '2026-10-02',
        async () => propostaId,
        fake.runInTransaction as never,
      );

    const results = await Promise.allSettled([accept(101), accept(102)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({
      status: 'rejected',
      reason: expect.objectContaining({
        statusCode: 409,
        datasIndisponiveis: ['2026-10-01'],
      }),
    });
  });

  it('PR-11d: unidades distintas não compartilham lock', async () => {
    const fake = createFakeHoldDb();
    const [a, b] = await Promise.all([
      comHoldReservaAtomico(
        21,
        '2026-10-01',
        '2026-10-02',
        async () => 'a',
        fake.runInTransaction as never,
      ),
      comHoldReservaAtomico(
        22,
        '2026-10-01',
        '2026-10-02',
        async () => 'b',
        fake.runInTransaction as never,
      ),
    ]);
    expect([a, b]).toEqual(['a', 'b']);
  });

  it('PR-11d: conflito em uma noite faz rollback das noites já claimed', async () => {
    const fake = createFakeHoldDb(['30:2026-10-02']);
    await expect(
      comHoldReservaAtomico(
        30,
        '2026-10-01',
        '2026-10-03',
        async () => 'never',
        fake.runInTransaction as never,
      ),
    ).rejects.toBeInstanceOf(DisponibilidadeReservaConflictError);
    expect(fake.blocked.has('30:2026-10-01')).toBe(false);
  });

  it('PR-11d: falha no CAS da proposta também desfaz o hard-hold', async () => {
    const fake = createFakeHoldDb();
    await expect(
      comHoldReservaAtomico(
        31,
        '2026-10-01',
        '2026-10-02',
        async () => {
          throw new Error('Proposta já foi respondida');
        },
        fake.runInTransaction as never,
      ),
    ).rejects.toThrow('Proposta já foi respondida');
    expect(fake.blocked.has('31:2026-10-01')).toBe(false);
  });
});
