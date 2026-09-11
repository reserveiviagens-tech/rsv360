'use client';

import type { EditorMeta } from './editor-types';

export type GuiaChegadaValue = NonNullable<EditorMeta['guiaChegada']>;

export function summarizeComoChegarClient(guia: GuiaChegadaValue): string {
  const text = typeof guia.comoChegar === 'string' ? guia.comoChegar.trim() : '';
  if (!text) return 'Adicionar informações';
  const collapsed = text.replace(/\s+/g, ' ');
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

type ComoChegarEditorProps = {
  guia: GuiaChegadaValue;
  setGuia: (v: GuiaChegadaValue) => void;
};

export function ComoChegarEditor({ guia, setGuia }: ComoChegarEditorProps) {
  return (
    <div>
      <PanelTitle
        title="Como chegar"
        hint="Compartilhado depois que a reserva é confirmada."
      />
      <textarea
        className="h-40 w-full rounded-xl border px-3 py-2 text-sm"
        value={guia.comoChegar ?? ''}
        onChange={(e) => setGuia({ ...guia, comoChegar: e.target.value })}
        placeholder="Link do mapa ou instruções"
      />
    </div>
  );
}
