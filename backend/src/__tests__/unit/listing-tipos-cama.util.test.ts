import {
  summarizeTiposCama,
  totalCamas,
  validateTiposCama,
} from '../../../../server/modules/acomodacoes/services/listing-tipos-cama.util';

describe('listing-tipos-cama.util', () => {
  it('accepts canonical ids', () => {
    const r = validateTiposCama({ casal: 1, sofa_cama: 1, solteiro: 2 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ casal: 1, sofa_cama: 1, solteiro: 2 });
    }
  });

  it('maps legacy Portuguese labels', () => {
    const r = validateTiposCama({ Casal: 1, 'Sofá-cama': 1, Berço: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ casal: 1, sofa_cama: 1, berco: 1 });
    }
  });

  it('rejects unknown bed type', () => {
    const r = validateTiposCama({ foguete: 1 });
    expect(r.ok).toBe(false);
  });

  it('rejects over max count', () => {
    const r = validateTiposCama({ casal: 99 });
    expect(r.ok).toBe(false);
  });

  it('summarizes like the plan card', () => {
    expect(summarizeTiposCama({ casal: 1, sofa_cama: 1 })).toBe('1 cama de casal, 1 sofá-cama');
  });

  it('totals beds', () => {
    expect(totalCamas({ casal: 1, solteiro: 2 })).toBe(3);
  });

  it('drops zero counts', () => {
    const r = validateTiposCama({ casal: 0, king: 2 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ king: 2 });
  });
});
