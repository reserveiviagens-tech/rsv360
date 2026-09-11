'use client';

import type { EditorMeta } from './editor-types';

export type GuiaChegadaValue = NonNullable<EditorMeta['guiaChegada']>;

export const PREFERENCIA_INTERACAO_OPTIONS = [
  'Não estarei disponível pessoalmente e prefiro me comunicar pelo aplicativo',
  'Gosto de cumprimentar pessoalmente, mas fora isso, prefiro ficar mais na minha',
  'Eu gosto de socializar e passar tempo com os hóspedes',
  'Não tenho preferência, me adapto às preferências dos hóspedes',
] as const;

const PREFERENCIA_INTERACAO_SHORT_LABELS: Record<
  (typeof PREFERENCIA_INTERACAO_OPTIONS)[number],
  string
> = {
  'Não estarei disponível pessoalmente e prefiro me comunicar pelo aplicativo':
    'Pelo aplicativo',
  'Gosto de cumprimentar pessoalmente, mas fora isso, prefiro ficar mais na minha': 'Discreto',
  'Eu gosto de socializar e passar tempo com os hóspedes': 'Gosta de socializar',
  'Não tenho preferência, me adapto às preferências dos hóspedes': 'Adaptável',
};

export function summarizeInteracaoClient(guia: GuiaChegadaValue): string {
  const raw =
    typeof guia.preferenciaInteracao === 'string' ? guia.preferenciaInteracao.trim() : '';
  if (!raw) return 'Adicionar informações';
  if (raw in PREFERENCIA_INTERACAO_SHORT_LABELS) {
    return PREFERENCIA_INTERACAO_SHORT_LABELS[
      raw as (typeof PREFERENCIA_INTERACAO_OPTIONS)[number]
    ];
  }
  const collapsed = raw.replace(/\s+/g, ' ');
  return collapsed.length <= 40 ? collapsed : `${collapsed.slice(0, 39)}…`;
}

function PanelTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

type InteracaoEditorProps = {
  guia: GuiaChegadaValue;
  setGuia: (v: GuiaChegadaValue) => void;
};

export function InteracaoEditor({ guia, setGuia }: InteracaoEditorProps) {
  return (
    <div>
      <PanelTitle title="Interação com os hóspedes" />
      <div className="space-y-2">
        {PREFERENCIA_INTERACAO_OPTIONS.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setGuia({ ...guia, preferenciaInteracao: o })}
            className={`w-full rounded-2xl border p-4 text-left text-sm ${
              guia.preferenciaInteracao === o ? 'border-slate-900' : 'border-slate-200'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
