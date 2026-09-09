'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CalendarioDiaView } from './AnfitriaoMonthCalendar';
import {
  expandNightRanges,
  nightsInRangeLabel,
  type NightRange,
} from './date-range-utils';

type Props = {
  open: boolean;
  dias: CalendarioDiaView[];
  initialRanges?: NightRange[];
  onClose: () => void;
  onConfirm: (dates: string[]) => void;
};

function formatRangeDate(iso: string): string {
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'MMM d, yyyy', { locale: ptBR });
  } catch {
    return iso;
  }
}

function defaultRanges(): NightRange[] {
  return [{ inicio: format(new Date(), 'yyyy-MM-dd'), termino: '' }];
}

export function SelecioneNoitesModal({
  open,
  dias,
  initialRanges,
  onClose,
  onConfirm,
}: Props) {
  const [ranges, setRanges] = useState<NightRange[]>(defaultRanges);

  useEffect(() => {
    if (!open) return;
    setRanges(
      initialRanges?.length
        ? initialRanges.map((r) => ({ ...r }))
        : defaultRanges(),
    );
  }, [open, initialRanges]);

  const editableDates = useMemo(() => expandNightRanges(ranges, dias), [ranges, dias]);
  const total = editableDates.length;

  if (!open) return null;


  function updateRange(idx: number, patch: Partial<NightRange>) {
    setRanges((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeRange(idx: number) {
    setRanges((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="selecione-noites-title"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-3xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <button
            type="button"
            aria-label="Fechar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-slate-600 hover:bg-slate-100"
            onClick={onClose}
          >
            ×
          </button>
          <div>
            <h2 id="selecione-noites-title" className="text-2xl font-bold text-slate-900">
              Selecione as noites
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Selecione noites únicas ou intervalos de datas para editar. Excluiremos automaticamente
              as noites com reservas.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {ranges.map((r, idx) => {
            const n = nightsInRangeLabel(r.inicio, r.termino);
            return (
              <div key={idx} className="rounded-2xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">
                    {r.inicio ? formatRangeDate(r.inicio) : 'Início'}
                    {r.termino ? ` — ${formatRangeDate(r.termino)}` : ''}
                  </p>
                  {idx > 0 && (
                    <button
                      type="button"
                      className="text-sm font-medium text-slate-700 underline"
                      onClick={() => removeRange(idx)}
                    >
                      Remover
                    </button>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="text-xs text-slate-500">
                    Início
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900"
                      value={r.inicio}
                      onChange={(e) => updateRange(idx, { inicio: e.target.value })}
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    Término (opcional)
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900"
                      value={r.termino}
                      onChange={(e) => updateRange(idx, { termino: e.target.value })}
                    />
                  </label>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {n} noite{n === 1 ? '' : 's'} selecionada{n === 1 ? '' : 's'}
                </p>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="mt-4 w-full rounded-2xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          onClick={() => setRanges((prev) => [...prev, { inicio: '', termino: '' }])}
        >
          + Adicionar mais noites
        </button>

        <button
          type="button"
          disabled={total === 0}
          className="mt-3 w-full rounded-full bg-slate-900 py-3.5 text-sm font-semibold text-white disabled:opacity-40"
          onClick={() => onConfirm(editableDates)}
        >
          Editar {total} noite{total === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  );
}
