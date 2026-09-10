'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export const ANTECEDENCIA_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'Mesmo dia' },
  { value: 1, label: '1 dia' },
  { value: 2, label: '2 dias' },
  { value: 3, label: '3 dias' },
  { value: 7, label: '7 dias' },
  { value: 14, label: '14 dias' },
  { value: 30, label: '30 dias' },
];

export const CUTOFF_HOURS: string[] = Array.from({ length: 24 }, (_, h) =>
  `${String(h).padStart(2, '0')}:00`,
);

export const WEEKDAY_LABELS = [
  { d: 0, short: 'Dom', full: 'Domingo' },
  { d: 1, short: 'Seg', full: 'Segunda' },
  { d: 2, short: 'Ter', full: 'Terça' },
  { d: 3, short: 'Qua', full: 'Quarta' },
  { d: 4, short: 'Qui', full: 'Quinta' },
  { d: 5, short: 'Sex', full: 'Sexta' },
  { d: 6, short: 'Sáb', full: 'Sábado' },
] as const;

export type MinNoitesPorCheckinClient = Record<string, number>;

type Props = {
  unitId: number;
  minNoites: number;
  setMinNoites: (v: number) => void;
  maxNoites: number;
  setMaxNoites: (v: number) => void;
  antecedenciaDias: number;
  setAntecedenciaDias: (v: number) => void;
  avisoPrevioMesmoDia: string;
  setAvisoPrevioMesmoDia: (v: string) => void;
  minNoitesPorCheckin: MinNoitesPorCheckinClient | null;
  setMinNoitesPorCheckin: (v: MinNoitesPorCheckinClient | null) => void;
};

export function summarizeDisponibilidadeClient(
  minNoites: number,
  maxNoites: number;
  antecedenciaDias: number,
): string {
  const min = Math.max(1, Math.floor(minNoites) || 1);
  const max = Math.max(min, Math.floor(maxNoites) || 30);
  const lead = Math.max(0, Math.floor(antecedenciaDias) || 0);
  const leadLabel = lead <= 0 ? 'Mesmo dia' : lead === 1 ? '1 dia' : `${lead} dias`;
  return `Estadia de ${min} a ${max} noites, ${leadLabel}`;
}

export function defaultMinPorCheckinMap(globalMin: number): MinNoitesPorCheckinClient {
  const v = Math.max(1, Math.floor(globalMin) || 1);
  const out: MinNoitesPorCheckinClient = {};
  for (let d = 0; d <= 6; d += 1) out[String(d)] = v;
  return out;
}

export function normalizeMinPorCheckinClient(
  raw: unknown,
  fallbackMin: number,
): MinNoitesPorCheckinClient | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const fb = Math.max(1, Math.floor(fallbackMin) || 1);
  const out: MinNoitesPorCheckinClient = {};
  let anyCustom = false;
  for (let d = 0; d <= 6; d += 1) {
    const key = String(d);
    const n = Number((raw as Record<string, unknown>)[key]);
    if (Number.isFinite(n) && n >= 1) {
      const v = Math.min(365, Math.floor(n));
      out[key] = v;
      if (v !== fb) anyCustom = true;
    } else {
      out[key] = fb;
    }
  }
  return anyCustom ? out : null;
}

function MinPorDiaModal({
  open,
  globalMin,
  value,
  onClose,
  onSave,
}: {
  open: boolean;
  globalMin: number;
  value: MinNoitesPorCheckinClient | null;
  onClose: () => void;
  onSave: (next: MinNoitesPorCheckinClient) => void;
}) {
  const [draft, setDraft] = useState<MinNoitesPorCheckinClient>(() =>
    value ?? defaultMinPorCheckinMap(globalMin),
  );

  useEffect(() => {
    if (open) {
      setDraft(value ?? defaultMinPorCheckinMap(globalMin));
    }
  }, [open, value, globalMin]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="min-por-dia-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="min-por-dia-title" className="text-lg font-bold text-slate-900">
          Personalizar por dia de check-in
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Defina a estadia mínima conforme o dia da semana do check-in (Dom–Sáb).
        </p>
        <div className="mt-4 space-y-3">
          {WEEKDAY_LABELS.map((w) => (
            <label key={w.d} className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-800">{w.full}</span>
              <input
                type="number"
                min={1}
                max={365}
                className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-center text-base font-semibold outline-none ring-slate-900 focus:ring-2"
                value={draft[String(w.d)] ?? globalMin}
                onChange={(e) => {
                  const n = Math.max(1, Math.min(365, Math.floor(Number(e.target.value) || 1)));
                  setDraft((prev) => ({ ...prev, [String(w.d)]: n }));
                }}
                aria-label={`Mínimo de noites para ${w.full}`}
              />
            </label>
          ))}
        </div>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-800"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

export function DisponibilidadeEditor({
  unitId,
  minNoites,
  setMinNoites,
  maxNoites,
  setMaxNoites,
  antecedenciaDias,
  setAntecedenciaDias,
  avisoPrevioMesmoDia,
  setAvisoPrevioMesmoDia,
  minNoitesPorCheckin,
  setMinNoitesPorCheckin,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const customCount =
    minNoitesPorCheckin == null
      ? 0
      : WEEKDAY_LABELS.filter((w) => (minNoitesPorCheckin[String(w.d)] ?? minNoites) !== minNoites)
          .length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Disponibilidade</h2>
        <p className="mt-1 text-sm text-slate-500">
          Estas configurações se aplicam a todas as noites, a menos que você as personalize por data
          no calendário.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-900">Mínimo de noites</span>
          <input
            type="number"
            min={1}
            max={365}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base outline-none ring-slate-900 focus:ring-2"
            value={minNoites}
            onChange={(e) => setMinNoites(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-900">Máximo de noites</span>
          <input
            type="number"
            min={1}
            max={1125}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base outline-none ring-slate-900 focus:ring-2"
            value={maxNoites}
            onChange={(e) => setMaxNoites(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          />
        </label>
      </div>

      {maxNoites < minNoites ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          O máximo de noites deve ser maior ou igual ao mínimo.
        </p>
      ) : null}

      <button
        type="button"
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50"
        onClick={() => setModalOpen(true)}
      >
        <span>
          Personalizar por dia de check-in
          {customCount > 0 ? (
            <span className="mt-0.5 block text-xs font-normal text-slate-500">
              {customCount} dia(s) com mínimo diferente
            </span>
          ) : (
            <span className="mt-0.5 block text-xs font-normal text-slate-500">
              Dom–Sáb · opcional
            </span>
          )}
        </span>
        <span className="text-slate-400" aria-hidden>
          ›
        </span>
      </button>

      <div>
        <p className="text-sm font-medium text-slate-900">Tempo de antecedência</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Quanto tempo entre a reserva e a chegada do hóspede.
        </p>
        <div className="mt-3 max-h-56 overflow-y-auto rounded-2xl border border-slate-200">
          {ANTECEDENCIA_OPTIONS.map((o) => {
            const on = antecedenciaDias === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setAntecedenciaDias(o.value)}
                className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left text-sm last:border-b-0"
              >
                <span className={on ? 'font-semibold text-slate-900' : 'text-slate-700'}>
                  {o.label}
                </span>
                {on ? <span className="text-slate-900">✓</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {antecedenciaDias === 0 ? (
        <div>
          <p className="text-sm font-medium text-slate-900">Aviso prévio para o mesmo dia</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Hóspedes podem reservar no dia do check-in até esta hora.
          </p>
          <div className="mt-3 max-h-48 overflow-y-auto rounded-2xl border border-slate-200">
            {CUTOFF_HOURS.map((h) => {
              const on = (avisoPrevioMesmoDia || '09:00') === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => setAvisoPrevioMesmoDia(h)}
                  className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-2.5 text-left text-sm last:border-b-0"
                >
                  <span className={on ? 'font-semibold text-slate-900' : 'text-slate-700'}>{h}</span>
                  {on ? <span className="text-slate-900">✓</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <Link
        href={`/anfitriao/unidades/${unitId}/disponibilidade`}
        className="inline-flex text-sm font-medium text-slate-800 underline underline-offset-2"
        prefetch={false}
      >
        Abrir calendário de tarifas →
      </Link>

      <MinPorDiaModal
        open={modalOpen}
        globalMin={minNoites}
        value={minNoitesPorCheckin}
        onClose={() => setModalOpen(false)}
        onSave={(next) => {
          const allSame = WEEKDAY_LABELS.every(
            (w) => (next[String(w.d)] ?? minNoites) === minNoites,
          );
          if (allSame) {
            setMinNoitesPorCheckin(null);
            return;
          }
          const lowest = Math.min(...WEEKDAY_LABELS.map((w) => next[String(w.d)] ?? minNoites));
          setMinNoites(lowest);
          setMinNoitesPorCheckin(next);
        }}
      />
    </div>
  );
}
