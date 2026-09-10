import {
  ANTECEDENCIA_MAX_DIAS,
  MAX_NOITES_MAX,
  parseAvisoPrevioMesmoDia,
  summarizeDisponibilidade,
  validateListingDisponibilidadePatch,
} from '../../../../server/modules/acomodacoes/services/listing-disponibilidade.util';

describe('listing-disponibilidade.util', () => {
  it('parses cutoff HH:MM', () => {
    expect(parseAvisoPrevioMesmoDia('9:00')).toBe('09:00');
    expect(parseAvisoPrevioMesmoDia('23:30')).toBe('23:30');
    expect(parseAvisoPrevioMesmoDia('25:00')).toBeNull();
    expect(parseAvisoPrevioMesmoDia('')).toBeNull();
  });

  it('validates min/max nights and order', () => {
    expect(validateListingDisponibilidadePatch({ minNoites: 2, maxNoites: 30 })).toEqual({
      ok: true,
      value: { minNoites: 2, maxNoites: 30 },
    });
    const bad = validateListingDisponibilidadePatch({ minNoites: 10, maxNoites: 5 });
    expect(bad.ok).toBe(false);
    expect(validateListingDisponibilidadePatch({ maxNoites: MAX_NOITES_MAX + 1 }).ok).toBe(false);
  });

  it('validates antecedencia range', () => {
    expect(validateListingDisponibilidadePatch({ antecedenciaDias: 0 }).ok).toBe(true);
    expect(
      validateListingDisponibilidadePatch({ antecedenciaDias: ANTECEDENCIA_MAX_DIAS + 1 }).ok,
    ).toBe(false);
  });

  it('validates and clears same-day cutoff', () => {
    expect(
      validateListingDisponibilidadePatch({ avisoPrevioMesmoDia: '09:00' }),
    ).toEqual({ ok: true, value: { avisoPrevioMesmoDia: '09:00' } });
    expect(validateListingDisponibilidadePatch({ avisoPrevioMesmoDia: null })).toEqual({
      ok: true,
      value: { avisoPrevioMesmoDia: null },
    });
    expect(validateListingDisponibilidadePatch({ avisoPrevioMesmoDia: 'noon' }).ok).toBe(false);
  });

  it('normalizes per-check-in map', () => {
    const r = validateListingDisponibilidadePatch({
      minNoites: 2,
      minNoitesPorCheckin: { '5': 3, '6': 2 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.minNoitesPorCheckin?.['5']).toBe(3);
      expect(r.value.minNoitesPorCheckin?.['0']).toBe(2);
    }
  });

  it('summarizes like the plan card', () => {
    expect(
      summarizeDisponibilidade({ minNoites: 2, maxNoites: 30, antecedenciaDias: 0 }),
    ).toBe('Estadia de 2 a 30 noites, Mesmo dia');
    expect(
      summarizeDisponibilidade({ minNoites: 1, maxNoites: 14, antecedenciaDias: 3 }),
    ).toBe('Estadia de 1 a 14 noites, 3 dias');
  });
});
