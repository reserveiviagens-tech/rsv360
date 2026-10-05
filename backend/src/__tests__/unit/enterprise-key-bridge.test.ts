/**
 * WS-04 / S2 — bridge puro external -> internal (unit).
 *
 * WHAT IS REAL: `translateExternalToInternal` + allowlist de formato + lookup estatico.
 * WHAT IS SUBSTITUTED: nenhum DB, nenhuma migration, nenhum gateway — o lookup e um mapa
 * em memoria injetado. Estes testes provam a DECISAO de traducao, nao persistencia.
 *
 * Cobre plano §8.4 itens 5? NAO — cobre Anexo A S2: 100% branches; N-08..N-11, N-16, N-17.
 */
import {
  createStaticEnterpriseKeyLookup,
  isWellFormedExternalKey,
  translateExternalToInternal,
  type EnterpriseKeyLookup,
} from '../../../../server/modules/multi-property/context/enterprise-key-bridge';

const UUID_A = '123e4567-e89b-12d3-a456-426614174000';
const UUID_B = '123e4567-e89b-12d3-a456-426614174001';

function buildLookup(): EnterpriseKeyLookup {
  return createStaticEnterpriseKeyLookup({ ent_1: 1, ent_42: 42, [UUID_A]: 7 });
}

describe('S2 bridge — traducao deterministica (externo valido -> interno)', () => {
  it("traduz 'ent_42' -> 42 de forma deterministica", () => {
    const lookup = buildLookup();
    expect(translateExternalToInternal('ent_42', lookup)).toBe(42);
    expect(translateExternalToInternal('ent_42', lookup)).toBe(42);
  });

  it('traduz UUID externo valido -> id interno', () => {
    expect(translateExternalToInternal(UUID_A, buildLookup())).toBe(7);
  });
});

describe('S2 bridge — rejeicao (N-09/N-10/N-11)', () => {
  it.each(['ent_999', UUID_B, '', '   ', 'ent_1 ', ' ent_1', 'ENT_1', 'foo', '1', 1, null, undefined, {}, []])(
    'rejeita %p com null (sem fallback, sem throw)',
    (bad) => {
      expect(translateExternalToInternal(bad, buildLookup())).toBeNull();
    },
  );

  it('N-08: formato numerico legado nunca vira traducao implicita (number => null)', () => {
    expect(translateExternalToInternal(1, buildLookup())).toBeNull();
  });

  it('N-11: nenhum literal ent_1/1 deriva autorizacao — chave ausente do lookup => null', () => {
    const empty = createStaticEnterpriseKeyLookup({});
    expect(translateExternalToInternal('ent_1', empty)).toBeNull();
  });
});

describe('S2 bridge — lookup nao confere autoridade (nao autoriza, nao membership, nao DB)', () => {
  it('id interno invalido no lookup (0, negativo, NaN, string) => null', () => {
    const poisoned = createStaticEnterpriseKeyLookup({
      ent_1: 0,
      ent_2: -5,
      ent_3: Number.NaN,
      ent_4: '7' as unknown as number,
    });
    expect(translateExternalToInternal('ent_1', poisoned)).toBeNull();
    expect(translateExternalToInternal('ent_2', poisoned)).toBeNull();
    expect(translateExternalToInternal('ent_3', poisoned)).toBeNull();
    expect(translateExternalToInternal('ent_4', poisoned)).toBeNull();
  });

  it('lookup que lanca (indisponivel) => null, fail-closed (N-12 analogo)', () => {
    const broken: EnterpriseKeyLookup = {
      findInternalId: () => {
        throw new Error('lookup indisponivel');
      },
    };
    expect(translateExternalToInternal('ent_1', broken)).toBeNull();
  });

  it('snapshot: mutacao posterior do mapa original nao altera o lookup', () => {
    const entries: Record<string, number> = { ent_9: 9 };
    const lookup = createStaticEnterpriseKeyLookup(entries);
    entries.ent_9 = 99;
    entries.ent_x = 1;
    expect(translateExternalToInternal('ent_9', lookup)).toBe(9);
    expect(translateExternalToInternal('ent_x', lookup)).toBeNull();
  });

  it('prototype pollution nao vira hit (constructor/toString => null)', () => {
    const lookup = buildLookup();
    expect(translateExternalToInternal('constructor', lookup)).toBeNull();
    expect(translateExternalToInternal('toString', lookup)).toBeNull();
    expect(translateExternalToInternal('__proto__', lookup)).toBeNull();
  });
});

describe('S2 bridge — N-16/N-17: sem coercao, sem fallback literal', () => {
  it("isWellFormedExternalKey rejeita number, '' e espacos", () => {
    expect(isWellFormedExternalKey(1)).toBe(false);
    expect(isWellFormedExternalKey('')).toBe(false);
    expect(isWellFormedExternalKey(' ent_1')).toBe(false);
    expect(isWellFormedExternalKey('ent_1')).toBe(true);
    expect(isWellFormedExternalKey(UUID_A)).toBe(true);
  });

  it('bridge nunca retorna 1 por omissao: entradas vazias => sempre null', () => {
    const empty = createStaticEnterpriseKeyLookup({});
    for (const k of ['ent_1', 'ent_2', UUID_A]) {
      expect(translateExternalToInternal(k, empty)).not.toBe(1);
      expect(translateExternalToInternal(k, empty)).toBeNull();
    }
  });
});
