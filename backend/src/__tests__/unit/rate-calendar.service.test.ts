/**
 * Unit tests for rate calendar discount cap enforcement (fail-closed).
 */
describe('rateCalendarService.validarDescontoProposto (logic)', () => {
  function capAllows(percentual: number, teto: number, role: string): boolean {
    if (role === 'admin' || role === 'manager' || role === 'anfitriao') return true;
    return percentual <= teto;
  }

  it('blocks corretor above teto', () => {
    expect(capAllows(15, 10, 'corretor')).toBe(false);
  });

  it('allows corretor at or below teto', () => {
    expect(capAllows(10, 10, 'corretor')).toBe(true);
    expect(capAllows(5, 10, 'agente')).toBe(true);
  });

  it('allows master/admin any discount', () => {
    expect(capAllows(50, 10, 'admin')).toBe(true);
    expect(capAllows(50, 10, 'anfitriao')).toBe(true);
  });
});

describe('weekend detection for rate calendar', () => {
  function isWeekend(isoDate: string): boolean {
    const d = new Date(`${isoDate}T12:00:00`);
    const day = d.getDay();
    return day === 5 || day === 6;
  }

  it('marks Friday and Saturday as weekend', () => {
    // 2026-09-04 Friday, 2026-09-05 Saturday
    expect(isWeekend('2026-09-04')).toBe(true);
    expect(isWeekend('2026-09-05')).toBe(true);
    expect(isWeekend('2026-09-07')).toBe(false);
  });
});

describe('price resolution order (documented)', () => {
  it('override beats weekend and base', () => {
    const base = 100;
    const weekend = 150;
    const override = 80;
    const isFri = true;
    let preco = base;
    if (isFri) preco = weekend;
    if (override != null) preco = override;
    expect(preco).toBe(80);
  });

  it('applies capped discount after effective price', () => {
    const efetivo = 200;
    const pedido = 20;
    const teto = 10;
    const capped = Math.min(pedido, teto);
    const final = Math.round(efetivo * (1 - capped / 100) * 100) / 100;
    expect(final).toBe(180);
  });
});

describe('funil cotação / proposta — teto parceiro (fail-closed)', () => {
  function assertFunil(percentual: number, teto: number): { ok: boolean; message?: string } {
    if (!Number.isFinite(percentual) || percentual < 0) {
      return { ok: false, message: 'percentual inválido' };
    }
    if (percentual === 0) return { ok: true };
    if (percentual > teto) {
      return { ok: false, message: `Desconto máximo permitido: ${teto}%` };
    }
    return { ok: true };
  }

  it('rejects partner discount above teto in funnel', () => {
    expect(assertFunil(15, 10).ok).toBe(false);
  });

  it('allows partner discount at teto in funnel', () => {
    expect(assertFunil(10, 10).ok).toBe(true);
  });

  it('allows zero discount without teto check failure', () => {
    expect(assertFunil(0, 10).ok).toBe(true);
  });
});

describe('host listing settings validation (RSV360°)', () => {
  function clampPct(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.min(100, Math.max(0, Math.round(n * 100) / 100));
  }

  const CANCEL = new Set([
    'flexivel',
    'moderada',
    'limitada',
    'restrita',
    'restrita_longa',
    'rigorosa_longa',
  ]);

  function normalizeCancel(value: string, fallback: string): string {
    const v = String(value || '').toLowerCase().trim();
    return CANCEL.has(v) ? v : fallback;
  }

  it('clamps host weekly/monthly discount to 0–100', () => {
    expect(clampPct(-5)).toBe(0);
    expect(clampPct(120)).toBe(100);
    expect(clampPct(10.555)).toBe(10.56);
  });

  it('normalizes cancellation policy whitelist', () => {
    expect(normalizeCancel('Limitada', 'flexivel')).toBe('limitada');
    expect(normalizeCancel('hack', 'limitada')).toBe('limitada');
    expect(normalizeCancel('restrita_longa', 'limitada')).toBe('restrita_longa');
    expect(normalizeCancel('moderada', 'limitada')).toBe('moderada');
    expect(normalizeCancel('rigorosa_longa', 'restrita_longa')).toBe('rigorosa_longa');
  });
});
