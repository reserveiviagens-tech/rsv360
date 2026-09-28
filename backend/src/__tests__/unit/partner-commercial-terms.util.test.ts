import {
  computeEarningCents,
  isCommercialTermsEffectiveAt,
  resolveExclusiveCommercialOwner,
} from '../../../../server/modules/partners/services/partner-commercial-terms.util';

describe('partner-commercial-terms.util (C36-CJ)', () => {
  describe('vigência [from, to)', () => {
    const tPay = new Date('2026-06-15T12:00:00.000Z');

    it('active sem janela é elegível', () => {
      expect(
        isCommercialTermsEffectiveAt(
          { status: 'active', effectiveFrom: null, effectiveTo: null },
          tPay,
        ),
      ).toBe(true);
    });

    it('draft nunca é elegível', () => {
      expect(
        isCommercialTermsEffectiveAt(
          { status: 'draft', effectiveFrom: null, effectiveTo: null },
          tPay,
        ),
      ).toBe(false);
    });

    it('superseded nunca é elegível', () => {
      expect(
        isCommercialTermsEffectiveAt(
          { status: 'superseded', effectiveFrom: null, effectiveTo: null },
          tPay,
        ),
      ).toBe(false);
    });

    it('T_pay === effective_from (incluso) é elegível', () => {
      expect(
        isCommercialTermsEffectiveAt(
          {
            status: 'active',
            effectiveFrom: '2026-06-15T12:00:00.000Z',
            effectiveTo: null,
          },
          tPay,
        ),
      ).toBe(true);
    });

    it('antes de effective_from é inelegível', () => {
      expect(
        isCommercialTermsEffectiveAt(
          {
            status: 'active',
            effectiveFrom: '2026-07-01T00:00:00.000Z',
            effectiveTo: null,
          },
          tPay,
        ),
      ).toBe(false);
    });

    it('em T_pay === effective_to (half-open) é inelegível', () => {
      expect(
        isCommercialTermsEffectiveAt(
          {
            status: 'active',
            effectiveFrom: '2026-01-01T00:00:00.000Z',
            effectiveTo: '2026-06-15T12:00:00.000Z',
          },
          tPay,
        ),
      ).toBe(false);
    });

    it('um instante antes de effective_to é elegível', () => {
      expect(
        isCommercialTermsEffectiveAt(
          {
            status: 'active',
            effectiveFrom: '2026-01-01T00:00:00.000Z',
            effectiveTo: '2026-06-15T12:00:00.001Z',
          },
          tPay,
        ),
      ).toBe(true);
    });

    it('expirado (após to) é inelegível', () => {
      expect(
        isCommercialTermsEffectiveAt(
          {
            status: 'active',
            effectiveFrom: '2026-01-01T00:00:00.000Z',
            effectiveTo: '2026-06-01T00:00:00.000Z',
          },
          tPay,
        ),
      ).toBe(false);
    });

    it('dentro da janela é elegível', () => {
      expect(
        isCommercialTermsEffectiveAt(
          {
            status: 'active',
            effectiveFrom: '2026-01-01T00:00:00.000Z',
            effectiveTo: '2026-12-31T00:00:00.000Z',
          },
          tPay,
        ),
      ).toBe(true);
    });

    it('tPay inválido é inelegível', () => {
      expect(
        isCommercialTermsEffectiveAt(
          { status: 'active', effectiveFrom: null, effectiveTo: null },
          'not-a-date',
        ),
      ).toBe(false);
    });
  });

  describe('rate_bps → amount_cents', () => {
    it('mínimo 0 bps → 0', () => {
      expect(computeEarningCents(100_000, 0)).toBe(0);
    });

    it('máximo 10000 bps = 100%', () => {
      expect(computeEarningCents(100_000, 10_000)).toBe(100_000);
    });

    it('1500 bps de 100000 = 15000', () => {
      expect(computeEarningCents(100_000, 1500)).toBe(15_000);
    });

    it('usa floor (sem float)', () => {
      expect(computeEarningCents(100, 1)).toBe(0);
      expect(computeEarningCents(10_000, 1)).toBe(1);
    });

    it('rejeita rate_bps fora de [0,10000]', () => {
      expect(() => computeEarningCents(100, 10001)).toThrow(/rateBps/);
      expect(() => computeEarningCents(100, -1)).toThrow(/rateBps/);
    });

    it('rejeita rate_bps não-inteiro', () => {
      expect(() => computeEarningCents(100, 1.5)).toThrow(/rateBps/);
    });

    it('rejeita baseCents inválido', () => {
      expect(() => computeEarningCents(-1, 100)).toThrow(/baseCents/);
      expect(() => computeEarningCents(1.2, 100)).toThrow(/baseCents/);
    });
  });

  describe('concorrência multi-PEA (atribuição)', () => {
    it('0 → skip', () => {
      expect(resolveExclusiveCommercialOwner([])).toEqual({
        kind: 'skip',
        reason: 'ATTR_NO_OWNER',
      });
    });

    it('1 → single', () => {
      expect(
        resolveExclusiveCommercialOwner([{ peaId: 'p1', partnerId: 'a' }]),
      ).toEqual({ kind: 'single', peaId: 'p1', partnerId: 'a' });
    });

    it('>1 → fail-closed ambiguous (nunca first-row)', () => {
      expect(
        resolveExclusiveCommercialOwner([
          { peaId: 'p1', partnerId: 'a' },
          { peaId: 'p2', partnerId: 'b' },
        ]),
      ).toEqual({
        kind: 'ambiguous',
        reason: 'ATTR_AMBIGUOUS_OWNERS',
        count: 2,
      });
    });
  });
});
