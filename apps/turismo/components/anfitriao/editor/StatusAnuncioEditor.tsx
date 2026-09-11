'use client';

import type { EditorMeta } from './editor-types';

export type StatusAnuncioValue = NonNullable<EditorMeta['statusAnuncio']>;

const OPTIONS = [
  ['anunciado', 'Anunciado', 'Aparece nas buscas e pode ser reservado.'],
  ['nao_anunciado', 'Não anunciado', 'Fora da busca; você pode pausar datas.'],
] as const;

/** Card preview — mirrors server summarizeStatusAnuncio. */
export function summarizeStatusAnuncioClient(value: StatusAnuncioValue): string {
  return value === 'nao_anunciado' ? 'Não anunciado' : 'Anunciado';
}

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
    </div>
  );
}

type Props = {
  value: StatusAnuncioValue;
  onChange: (next: StatusAnuncioValue) => void;
  onEnviarAprovacao?: () => Promise<void>;
};

export function StatusAnuncioEditor({ value, onChange, onEnviarAprovacao }: Props) {
  return (
    <div>
      <PanelTitle title="Status do anúncio" />
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(([id, title, desc]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`rounded-2xl border p-4 text-left ${
              value === id ? 'border-slate-900' : 'border-slate-200'
            }`}
          >
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-sm text-slate-500">{desc}</p>
          </button>
        ))}
      </div>
      {onEnviarAprovacao && (
        <button
          type="button"
          className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm"
          onClick={() => void onEnviarAprovacao()}
        >
          Enviar para aprovação do staff
        </button>
      )}
    </div>
  );
}
