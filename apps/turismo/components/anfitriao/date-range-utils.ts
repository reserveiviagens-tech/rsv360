import { addDays, eachDayOfInterval, format, parseISO } from 'date-fns';
import type { CalendarioDiaView } from './AnfitriaoMonthCalendar';

export type NightRange = { inicio: string; termino: string };

/** Expand ranges to YYYY-MM-DD nights, skipping reserved days. */
export function expandNightRanges(
  ranges: NightRange[],
  dias: CalendarioDiaView[],
): string[] {
  const byDate = new Map(dias.map((d) => [d.data, d]));
  const out = new Set<string>();

  for (const r of ranges) {
    if (!r.inicio) continue;
    const start = parseISO(r.inicio);
    const end = r.termino ? parseISO(r.termino) : start;
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    const [a, b] = start <= end ? [start, end] : [end, start];
    for (const day of eachDayOfInterval({ start: a, end: b })) {
      const key = format(day, 'yyyy-MM-dd');
      const info = byDate.get(key);
      if (info?.estado === 'reservado') continue;
      out.add(key);
    }
  }

  return Array.from(out).sort();
}

export function summarizeSelection(dates: string[], dias: CalendarioDiaView[]) {
  const byDate = new Map(dias.map((d) => [d.data, d]));
  let disponiveis = 0;
  let bloqueadas = 0;
  let precoMin = Infinity;
  let precoMax = -Infinity;
  let baseMin = Infinity;
  let baseMax = -Infinity;

  for (const d of dates) {
    const info = byDate.get(d);
    if (!info) continue;
    if (info.estado === 'livre') disponiveis += 1;
    else if (info.estado === 'bloqueado') bloqueadas += 1;
    const ef = info.precoEfetivo != null ? Number(info.precoEfetivo) : null;
    const base = info.precoBase != null ? Number(info.precoBase) : null;
    if (ef != null && Number.isFinite(ef)) {
      precoMin = Math.min(precoMin, ef);
      precoMax = Math.max(precoMax, ef);
    }
    if (base != null && Number.isFinite(base)) {
      baseMin = Math.min(baseMin, base);
      baseMax = Math.max(baseMax, base);
    }
  }

  return {
    total: dates.length,
    disponiveis,
    bloqueadas,
    precoMin: Number.isFinite(precoMin) ? precoMin : null,
    precoMax: Number.isFinite(precoMax) ? precoMax : null,
    baseMin: Number.isFinite(baseMin) ? baseMin : null,
    baseMax: Number.isFinite(baseMax) ? baseMax : null,
  };
}

export function nightsInRangeLabel(inicio: string, termino: string): number {
  if (!inicio) return 0;
  const start = parseISO(inicio);
  const end = termino ? parseISO(termino) : start;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const [a, b] = start <= end ? [start, end] : [end, start];
  let n = 0;
  for (let d = a; d <= b; d = addDays(d, 1)) n += 1;
  return n;
}

export function moneyBr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Host service fee estimate (~16.5%), aligned with payout breakdown UI. */
export const HOST_SERVICE_FEE_RATE = 0.1647;

export function hostPayoutBreakdown(base: number): {
  taxa: number;
  recebe: number;
} {
  const taxa = Math.round(base * HOST_SERVICE_FEE_RATE);
  return { taxa, recebe: Math.max(0, Math.round(base) - taxa) };
}

export function smartPriceSuggestions(precoBase: number | null): { min: number; max: number } {
  const base = precoBase != null && precoBase > 0 ? precoBase : 510;
  return {
    min: Math.max(50, Math.round(base * 0.45)),
    max: Math.max(100, Math.round(base * 1.94)),
  };
}

/** Human note stored in observacao (not system markers). */
export function isCustomObservacao(obs: string | null | undefined): boolean {
  if (!obs || !obs.trim()) return false;
  const v = obs.trim().toLowerCase();
  return v !== 'bloqueado' && v !== 'reservado';
}

/** Heuristic similar-listing band for Compare modal (no external map API). */
export function similarListingsBand(precoSugerido: number): { min: number; max: number } {
  const mid = Math.max(80, precoSugerido);
  return {
    min: Math.round(mid * 1.6),
    max: Math.round(mid * 2.5),
  };
}
