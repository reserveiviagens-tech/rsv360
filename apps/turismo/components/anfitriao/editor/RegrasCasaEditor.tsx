'use client';

import type { EditorMeta } from './editor-types';

export type RegrasCasaValue = NonNullable<EditorMeta['regrasCasa']>;

export function summarizeRegrasCasaClient(regras: RegrasCasaValue): string {
  return `Check-in ${regras.checkInDe ?? '14:00'} · Checkout ${regras.checkOutAte ?? '11:00'}`;
}

function PanelTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

type RegrasCasaEditorProps = {
  regras: RegrasCasaValue;
  setRegras: (v: RegrasCasaValue) => void;
  capacidade: number;
  setCapacidade: (v: number) => void;
};

export function RegrasCasaEditor({
  regras,
  setRegras,
  capacidade,
  setCapacidade,
}: RegrasCasaEditorProps) {
  const toggles: Array<[keyof RegrasCasaValue, string]> = [
    ['pets', 'Permitido animais de estimação'],
    ['eventos', 'Permitido eventos'],
    ['fumar', 'Permitido fumar e cigarros eletrônicos'],
    ['silencio', 'Horários de silêncio'],
    ['filmagem', 'Permitido fotografia comercial e filmagem'],
  ];

  return (
    <div>
      <PanelTitle title="Regras da Casa" hint="Os hóspedes devem respeitar estas regras." />
      <ul className="space-y-3">
        {toggles.map(([key, label]) => (
          <li key={key} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2">
            <span className="text-sm font-medium">{label}</span>
            <div className="flex gap-2">
              <button
                type="button"
                className={`h-9 w-9 rounded-full border ${!regras[key] ? 'bg-slate-900 text-white' : ''}`}
                onClick={() => setRegras({ ...regras, [key]: false })}
              >
                ✕
              </button>
              <button
                type="button"
                className={`h-9 w-9 rounded-full border ${regras[key] ? 'bg-slate-900 text-white' : ''}`}
                onClick={() => setRegras({ ...regras, [key]: true })}
              >
                ✓
              </button>
            </div>
          </li>
        ))}
      </ul>
      {regras.silencio && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm">
            Início
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={regras.silencioInicio ?? '22:00'}
              onChange={(e) => setRegras({ ...regras, silencioInicio: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Término
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={regras.silencioFim ?? '07:00'}
              onChange={(e) => setRegras({ ...regras, silencioFim: e.target.value })}
            />
          </label>
        </div>
      )}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm font-medium">Número de hóspedes</span>
        <button
          type="button"
          className="h-8 w-8 rounded-full border"
          onClick={() => setCapacidade(Math.max(1, capacidade - 1))}
        >
          −
        </button>
        <span className="font-bold">{capacidade}</span>
        <button
          type="button"
          className="h-8 w-8 rounded-full border"
          onClick={() => setCapacidade(capacidade + 1)}
        >
          +
        </button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <label className="text-xs">
          Check-in de
          <input
            className="mt-1 w-full rounded-lg border px-2 py-1.5"
            value={regras.checkInDe ?? '14:00'}
            onChange={(e) => setRegras({ ...regras, checkInDe: e.target.value })}
          />
        </label>
        <label className="text-xs">
          Check-in até
          <input
            className="mt-1 w-full rounded-lg border px-2 py-1.5"
            value={regras.checkInAte ?? 'Flexível'}
            onChange={(e) => setRegras({ ...regras, checkInAte: e.target.value })}
          />
        </label>
        <label className="text-xs">
          Checkout
          <input
            className="mt-1 w-full rounded-lg border px-2 py-1.5"
            value={regras.checkOutAte ?? '11:00'}
            onChange={(e) => setRegras({ ...regras, checkOutAte: e.target.value })}
          />
        </label>
      </div>
      <label className="mt-4 block text-sm">
        Regras adicionais
        <textarea
          className="mt-1 h-32 w-full rounded-xl border px-3 py-2"
          value={regras.regrasAdicionais ?? ''}
          onChange={(e) => setRegras({ ...regras, regrasAdicionais: e.target.value })}
        />
      </label>
    </div>
  );
}
