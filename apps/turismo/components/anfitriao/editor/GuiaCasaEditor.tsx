'use client';

import type { EditorMeta } from './editor-types';

export type GuiaChegadaValue = NonNullable<EditorMeta['guiaChegada']>;

export function summarizeGuiaCasaClient(guia: GuiaChegadaValue): string {
  const text = typeof guia.guiaCasa === 'string' ? guia.guiaCasa.trim() : '';
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

type GuiaCasaEditorProps = {
  guia: GuiaChegadaValue;
  setGuia: (v: GuiaChegadaValue) => void;
};

export function GuiaCasaEditor({ guia, setGuia }: GuiaCasaEditorProps) {
  return (
    <div>
      <PanelTitle
        title="Guia da Casa"
        hint="Compartilhado 24 a 48 horas antes do check-in."
      />
      <textarea
        className="h-48 w-full rounded-xl border px-3 py-2 text-sm"
        value={guia.guiaCasa ?? ''}
        onChange={(e) => setGuia({ ...guia, guiaCasa: e.target.value })}
        placeholder="Dicas sobre internet, TV, equipamentos…"
      />
    </div>
  );
}
