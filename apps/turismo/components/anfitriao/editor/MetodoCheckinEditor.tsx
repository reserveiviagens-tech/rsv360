'use client';

import type { EditorMeta } from './editor-types';

export type GuiaChegadaValue = NonNullable<EditorMeta['guiaChegada']>;

export const METODO_CHECKIN_OPTIONS = [
  'Fechadura inteligente',
  'Teclado numérico',
  'Cofre de chaves',
  'Funcionários do prédio',
  'Recepção presencial',
  'Outro',
] as const;

export function summarizeMetodoCheckinClient(guia: GuiaChegadaValue): string {
  const method = typeof guia.metodoCheckIn === 'string' ? guia.metodoCheckIn.trim() : '';
  return method || 'Adicionar informações';
}

function PanelTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

type MetodoCheckinEditorProps = {
  guia: GuiaChegadaValue;
  setGuia: (v: GuiaChegadaValue) => void;
};

export function MetodoCheckinEditor({ guia, setGuia }: MetodoCheckinEditorProps) {
  return (
    <div>
      <PanelTitle
        title="Método de check-in"
        hint="Compartilhado 24 a 48 horas antes do check-in."
      />
      <div className="space-y-2">
        {METODO_CHECKIN_OPTIONS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setGuia({ ...guia, metodoCheckIn: m })}
            className={`w-full rounded-xl border px-3 py-3 text-left text-sm ${
              guia.metodoCheckIn === m ? 'border-slate-900' : 'border-slate-200'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <label className="mt-4 block text-sm">
        Detalhe (ex. Recepção do Hotel)
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={guia.metodoCheckInDetalhe ?? ''}
          onChange={(e) => setGuia({ ...guia, metodoCheckInDetalhe: e.target.value })}
        />
      </label>
      <label className="mt-3 block text-sm">
        Instruções de check-in
        <textarea
          className="mt-1 h-28 w-full rounded-xl border px-3 py-2"
          value={guia.instrucoesCheckIn ?? ''}
          onChange={(e) => setGuia({ ...guia, instrucoesCheckIn: e.target.value })}
        />
      </label>
    </div>
  );
}
