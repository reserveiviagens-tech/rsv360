'use client';

import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export type CalendarioDiaEstado = 'livre' | 'bloqueado' | 'reservado';

export type DiaContexto = {
  fimDeSemana: boolean;
  feriado: {
    data: string;
    nome: string;
    tipo?: 'nacional' | 'estadual' | 'municipal';
    uf?: string;
    municipio?: string;
  } | null;
  temporada: {
    id: number;
    slug: string;
    nome: string;
    tipo: 'alta' | 'media' | 'baixa' | 'feriado';
  } | null;
  alerta: {
    nivel: 'ok' | 'abaixo' | 'acima';
    mensagem: string;
    faixa: { minSugerido: number; referencia: number; maxSugerido: number };
    tags: string[];
  };
};

export interface CalendarioDiaView {
  data: string;
  estado: CalendarioDiaEstado;
  disponivel: boolean;
  readOnly: boolean;
  precoOverride?: string | null;
  /** Preço efetivo resolvido (base + regras + override) */
  precoEfetivo?: number | null;
  /** Preço base antes de override/desconto de dia */
  precoBase?: number | null;
  /** Nota do anfitrião / marcador de sistema */
  observacao?: string | null;
  contexto?: DiaContexto | null;
}

const ESTADO_STYLES: Record<CalendarioDiaEstado, string> = {
  livre: 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100',
  bloqueado: 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100',
  reservado: 'bg-amber-50 text-amber-900 border-amber-200 cursor-not-allowed opacity-90',
};

interface Props {
  dias: CalendarioDiaView[];
  onToggleDia?: (data: string, estadoAtual: CalendarioDiaEstado) => void;
  selectedDates?: string[];
  onSelectDia?: (data: string, estadoAtual: CalendarioDiaEstado) => void;
  readOnly?: boolean;
}

export function AnfitriaoMonthCalendar({
  dias,
  onToggleDia,
  selectedDates = [],
  onSelectDia,
  readOnly = false,
}: Props) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);

  const diaMap = useMemo(() => new Map(dias.map((d) => [d.data, d])), [dias]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);

  const leadingBlanks = startOfMonth(month).getDay();
  const selectionMode = Boolean(onSelectDia);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          className="rounded border px-2 py-1 text-sm"
          onClick={() => setMonth((m) => subMonths(m, 1))}
        >
          ←
        </button>
        <h2 className="text-lg font-semibold capitalize">
          {format(month, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <button
          type="button"
          className="rounded border px-2 py-1 text-sm"
          onClick={() => setMonth((m) => addMonths(m, 1))}
        >
          →
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {monthDays.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const info = diaMap.get(key);
          const estado: CalendarioDiaEstado = info?.estado ?? 'livre';
          const inMonth = isSameMonth(day, month);
          const selected = selectedSet.has(key);
          const preco =
            info?.precoEfetivo != null
              ? String(info.precoEfetivo)
              : info?.precoOverride;
          const dayReadOnly =
            readOnly || info?.readOnly || estado === 'reservado';
          // Masters may open blocked days to unblock; reserved stays locked.
          const clickable =
            inMonth &&
            (selectionMode
              ? !readOnly && estado !== 'reservado'
              : !dayReadOnly && Boolean(onToggleDia));

          return (
            <button
              key={key}
              type="button"
              disabled={!clickable}
              onClick={() => {
                if (selectionMode) onSelectDia?.(key, estado);
                else onToggleDia?.(key, estado);
              }}
              className={cn(
                'min-h-[72px] rounded-2xl border p-2 text-left text-xs transition',
                !selected && ESTADO_STYLES[estado],
                !inMonth && 'opacity-40',
                isToday(day) && !selected && 'ring-2 ring-rose-400',
                selected &&
                  'border-transparent bg-slate-900 text-white shadow-md ring-0 hover:bg-slate-900',
              )}
              title={
                info?.contexto
                  ? info.contexto.alerta.tags.join(' · ')
                  : estado
              }
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold',
                  selected && 'bg-white/15',
                  isToday(day) && !selected && 'ring-2 ring-rose-500',
                  estado === 'bloqueado' && selected && 'line-through decoration-white/80',
                )}
              >
                {format(day, 'd')}
              </span>
              {preco && (
                <span
                  className={cn(
                    'mt-1 block text-[11px] font-semibold',
                    selected ? 'text-white' : 'text-slate-800',
                  )}
                >
                  R${Number(preco).toFixed(0)}
                </span>
              )}
              {info?.contexto && (
                <span
                  className={cn(
                    'mt-1 flex flex-wrap gap-0.5',
                    selected ? 'opacity-90' : '',
                  )}
                >
                  {info.contexto.fimDeSemana && (
                    <span
                      className={cn(
                        'rounded px-1 text-[9px] font-bold uppercase',
                        selected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800',
                      )}
                    >
                      FDS
                    </span>
                  )}
                  {info.contexto.feriado && (
                    <span
                      className={cn(
                        'rounded px-1 text-[9px] font-bold uppercase',
                        selected ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800',
                      )}
                    >
                      Fer
                    </span>
                  )}
                  {(info.contexto.temporada?.tipo === 'alta' ||
                    info.contexto.temporada?.tipo === 'feriado') && (
                    <span
                      className={cn(
                        'rounded px-1 text-[9px] font-bold uppercase',
                        selected ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-900',
                      )}
                    >
                      Alta
                    </span>
                  )}
                  {info.contexto.temporada?.tipo === 'media' && !info.contexto.feriado && (
                    <span
                      className={cn(
                        'rounded px-1 text-[9px] font-bold uppercase',
                        selected ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-900',
                      )}
                    >
                      Méd
                    </span>
                  )}
                  {info.contexto.temporada?.tipo === 'baixa' && (
                    <span
                      className={cn(
                        'rounded px-1 text-[9px] font-bold uppercase',
                        selected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700',
                      )}
                    >
                      Baixa
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-emerald-200" /> Livre
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-red-200" /> Bloqueado
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-amber-200" /> Reservado
        </span>
        <span className="flex items-center gap-1">
          <span className="rounded bg-indigo-100 px-1 text-[9px] font-bold text-indigo-800">FDS</span>{' '}
          Fim de semana
        </span>
        <span className="flex items-center gap-1">
          <span className="rounded bg-rose-100 px-1 text-[9px] font-bold text-rose-800">Fer</span>{' '}
          Feriado
        </span>
        <span className="flex items-center gap-1">
          <span className="rounded bg-orange-100 px-1 text-[9px] font-bold text-orange-900">Alta</span>{' '}
          Alta temporada
        </span>
      </div>
    </div>
  );
}
