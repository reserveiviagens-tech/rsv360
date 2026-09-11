import {
  ativoFilterWhere,
  parseAtivoFilter,
  resolveAtivoFilter,
} from '../../../../server/modules/acomodacoes/services/listing-ativo-filter.util';

describe('listing-ativo-filter.util', () => {
  describe('parseAtivoFilter', () => {
    it('defaults to true when omitted or empty', () => {
      expect(parseAtivoFilter(undefined)).toBe('true');
      expect(parseAtivoFilter(null)).toBe('true');
      expect(parseAtivoFilter('')).toBe('true');
    });

    it('accepts whitelist values case-insensitively', () => {
      expect(parseAtivoFilter('true')).toBe('true');
      expect(parseAtivoFilter('FALSE')).toBe('false');
      expect(parseAtivoFilter(' All ')).toBe('all');
    });

    it('rejects invalid values', () => {
      expect(parseAtivoFilter('yes')).toBeNull();
      expect(parseAtivoFilter('1')).toBeNull();
      expect(parseAtivoFilter(0)).toBeNull();
    });
  });

  describe('resolveAtivoFilter', () => {
    it('defaults to true when opts omitted', () => {
      expect(resolveAtivoFilter()).toBe('true');
      expect(resolveAtivoFilter(undefined)).toBe('true');
    });

    it('passes through explicit filter', () => {
      expect(resolveAtivoFilter('all')).toBe('all');
      expect(resolveAtivoFilter('false')).toBe('false');
    });
  });

  describe('ativoFilterWhere', () => {
    it('returns clause for true and false, undefined for all', () => {
      expect(ativoFilterWhere('true')).toBeDefined();
      expect(ativoFilterWhere('false')).toBeDefined();
      expect(ativoFilterWhere('all')).toBeUndefined();
    });
  });
});
