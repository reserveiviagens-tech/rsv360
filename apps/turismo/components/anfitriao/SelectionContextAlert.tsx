'use client';

import { useMemo } from 'react';
import type { CalendarioDiaView, DiaContexto } from './AnfitriaoMonthCalendar';
import { moneyBr } from './date-range-utils';

type Props = {
  dates: string[];
  dias: CalendarioDiaView[];
  lastSelected?: string | null;
};

function aggregate(dates: string[], dias: CalendarioDiaView[]) {
  const byDate = new Map(dias.map((d) => [d.data, d]));
  let fds = 0;
  let feriados = 0;
  let alta = 0;
  let media = 0;
  let baixa = 0;
  let abaixo = 0;
  let acima = 0;
  const feriadoNomes = new Set<string>();
  let minSug = Infinity;
  let maxSug = -Infinity;
  let refSum = 0;
  let refN = 0;

  for (const key of dates) {
    const d = byDate.get(key);
    const ctx = d?.contexto;
    if (!ctx) continue;
    if (ctx.fimDeSemana) fds += 1;
    if (ctx.feriado) {
      feriados += 1;
      feriadoNomes.add(ctx.feriado.nome);
    }
    const tipo = ctx.temporada?.tipo ?? (ctx.feriado ? 'feriado' : 'media');
    if (tipo === 'alta' || tipo === 'feriado') alta += 1;
    else if (tipo === 'baixa') baixa += 1;
    else media += 1;
    if (ctx.alerta.nivel === 'abaixo') abaixo += 1;
    if (ctx.alerta.nivel === 'acima') acima += 1;
    minSug = Math.min(minSug, ctx.alerta.faixa.minSugerido);
    maxSug = Math.max(maxSug, ctx.alerta.faixa.maxSugerido);
    refSum += ctx.alerta.faixa.referencia;
    refN += 1;
  }

  return {
    fds,
    feriados,
    alta,
    media,
    baixa,
    abaixo,
    acima,
    feriadoNomes: Array.from(feriadoNomes),
    minSug: Number.isFinite(minSug) ? minSug : null,
    maxSug: Number.isFinite(maxSug) ? maxSug : null,
    refMed: refN ? Math.round(refSum / refN) : null,
  };
}

export function SelectionContextAlert({ dates, dias, lastSelected }: Props) {
  const summary = useMemo(() => aggregate(dates, dias), [dates, dias]);
  const lastCtx: DiaContexto | null = useMemo(() => {
    if (!lastSelected) return null;
    return dias.find((d) => d.data === lastSelected)?.contexto ?? null;
  }, [lastSelected, dias]);

  if (dates.length === 0) return null;

  const risk =
    summary.abaixo > 0 || summary.acima > 0
      ? summary.abaixo >= summary.acima
        ? 'abaixo'
        : 'acima'
      : 'ok';

  return (
    <div
      className={`rounded-2xl border p-4 ${
        risk === 'abaixo'
          ? 'border-amber-300 bg-amber-50'
          : risk === 'acima'
            ? 'border-rose-300 bg-rose-50'
            : 'border-sky-200 bg-sky-50'
      }`}
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-bold text-slate-900">
        Alerta de precificação · {dates.length} noite{dates.length === 1 ? '' : 's'}
      </p>

      {lastCtx && (
        <p className="mt-2 text-sm text-slate-700">
          Última data: <span className="font-semibold">{lastCtx.alerta.tags.join(' · ')}</span>
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {summary.fds > 0 && (
          <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-900">
            {summary.fds} final de semana
          </span>
        )}
        {summary.feriados > 0 && (
          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-900">
            {summary.feriados} feriado
            {summary.feriadoNomes.length ? `: ${summary.feriadoNomes.join(', ')}` : ''}
          </span>
        )}
        {summary.alta > 0 && (
          <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-900">
            {summary.alta} alta / pico
          </span>
        )}
        {summary.media > 0 && (
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-900">
            {summary.media} média temporada
          </span>
        )}
        {summary.baixa > 0 && (
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-800">
            {summary.baixa} baixa temporada
          </span>
        )}
      </div>

      {summary.minSug != null && summary.maxSug != null && (
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          Faixa sugerida para a seleção:{' '}
          <strong>
            {moneyBr(summary.minSug)} – {moneyBr(summary.maxSug)}
          </strong>
          {summary.refMed != null && (
            <>
              {' '}
              · referência média <strong>{moneyBr(summary.refMed)}</strong>
            </>
          )}
          . Evite precificar muito abaixo (prejuízo) ou muito acima (baixa conversão).
        </p>
      )}

      {(summary.abaixo > 0 || summary.acima > 0) && (
        <p className="mt-2 text-sm font-medium text-slate-800">
          {summary.abaixo > 0 && (
            <span>
              {summary.abaixo} noite(s) com preço abaixo do sugerido.{' '}
            </span>
          )}
          {summary.acima > 0 && (
            <span>{summary.acima} noite(s) com preço acima do sugerido.</span>
          )}
        </p>
      )}
    </div>
  );
}
