'use client';

import { CAPACIDADE_MAX, CAPACIDADE_MIN } from './hospedes-limits';

type Props = {
  capacidade: number;
  setCapacidade: (v: number) => void;
};

export function summarizeCapacidadeClient(capacidade: number): string | null {
  const n = Math.floor(Number(capacidade));
  if (!Number.isFinite(n) || n < CAPACIDADE_MIN) return null;
  const v = Math.min(CAPACIDADE_MAX, Math.max(CAPACIDADE_MIN, n));
  return v === 1 ? 'Máximo de 1 hóspede' : `Máximo de ${v} hóspedes`;
}

export function clampCapacidadeClient(raw: number): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return CAPACIDADE_MIN;
  return Math.min(CAPACIDADE_MAX, Math.max(CAPACIDADE_MIN, n));
}

export function HospedesEditor({ capacidade, setCapacidade }: Props) {
  const value = clampCapacidadeClient(capacidade);
  const atMin = value <= CAPACIDADE_MIN;
  const atMax = value >= CAPACIDADE_MAX;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Número de hóspedes</h2>
        <p className="mt-1 text-sm text-slate-500">
          Quantos hóspedes seu espaço acomoda com conforto?
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 rounded-2xl border border-slate-200 px-6 py-10">
        <p className="text-sm font-medium text-slate-600">Capacidade máxima</p>
        <div className="flex items-center gap-6">
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 text-2xl text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={atMin}
            onClick={() => setCapacidade(clampCapacidadeClient(value - 1))}
            aria-label="Diminuir número de hóspedes"
          >
            −
          </button>
          <span className="min-w-[3ch] text-center text-5xl font-bold tabular-nums text-slate-900">
            {value}
          </span>
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 text-2xl text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={atMax}
            onClick={() => setCapacidade(clampCapacidadeClient(value + 1))}
            aria-label="Aumentar número de hóspedes"
          >
            +
          </button>
        </div>
        <p className="text-center text-sm text-slate-500">
          {value === 1 ? '1 hóspede' : `${value} hóspedes`}
          <span className="block text-xs text-slate-400">
            Limite {CAPACIDADE_MIN}–{CAPACIDADE_MAX}
          </span>
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dica</p>
        <p className="mt-2 text-xs text-slate-600">
          Informe a capacidade real com conforto. Exceder o limite pode gerar avaliações ruins e
          cancelamentos.
        </p>
      </div>
    </div>
  );
}
