import {
  annotateAcessoComo,
  combineOwnerAndCoanfitriaoScope,
} from '../../../../server/modules/acomodacoes/services/anfitriao-listar-escopo.util';
import { sql } from 'drizzle-orm';

describe('anfitriao-listar-escopo.util', () => {
  describe('annotateAcessoComo', () => {
    const rows = [
      { id: 1, titulo: 'Owned' },
      { id: 2, titulo: 'Co-host only' },
      { id: 3, titulo: 'Both (owner wins)' },
    ];

    it('marks owned ids as proprietario and others as coanfitriao', () => {
      const ownedIds = new Set([1, 3]);
      const out = annotateAcessoComo(rows, ownedIds);
      expect(out).toEqual([
        { id: 1, titulo: 'Owned', acessoComo: 'proprietario' },
        { id: 2, titulo: 'Co-host only', acessoComo: 'coanfitriao' },
        { id: 3, titulo: 'Both (owner wins)', acessoComo: 'proprietario' },
      ]);
    });

    it('treats all rows as proprietario when staff flag is set', () => {
      const out = annotateAcessoComo(rows, new Set([2]), true);
      expect(out.every((r) => r.acessoComo === 'proprietario')).toBe(true);
    });

    it('returns empty array unchanged shape for no rows', () => {
      expect(annotateAcessoComo([], new Set())).toEqual([]);
    });
  });

  describe('combineOwnerAndCoanfitriaoScope', () => {
    const ownerScope = sql`false`;

    it('returns owner scope when co-host scope is absent', () => {
      expect(combineOwnerAndCoanfitriaoScope(ownerScope, null)).toBe(ownerScope);
      expect(combineOwnerAndCoanfitriaoScope(ownerScope, undefined)).toBe(ownerScope);
    });

    it('combines owner and co-host scopes with OR', () => {
      const cohostScope = sql`true`;
      const combined = combineOwnerAndCoanfitriaoScope(ownerScope, cohostScope);
      expect(combined).not.toBe(ownerScope);
      expect(combined).not.toBe(cohostScope);
    });
  });
});
