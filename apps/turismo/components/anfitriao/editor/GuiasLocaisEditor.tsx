'use client';

import type { EditorMeta } from './editor-types';

export type GuiaLocalItem = NonNullable<EditorMeta['guiasLocais']>[number];

export const GUIA_LOCAL_TITULO_MAX = 80;
export const GUIA_LOCAL_CONTEUDO_MAX = 2000;
export const GUIAS_LOCAIS_MAX = 10;

/** Card preview — mirrors server summarizeGuiasLocais. */
export function summarizeGuiasLocaisClient(
  guias: GuiaLocalItem[] | null | undefined,
): string {
  if (!Array.isArray(guias) || guias.length === 0) {
    return 'Adicionar informações';
  }
  const n = guias.length;
  return n === 1 ? '1 guia' : `${n} guias`;
}

function PanelTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

type GuiasLocaisEditorProps = {
  guias: GuiaLocalItem[];
  setGuias: (v: GuiaLocalItem[]) => void;
};

export function GuiasLocaisEditor({ guias, setGuias }: GuiasLocaisEditorProps) {
  const items = guias;
  const atMax = items.length >= GUIAS_LOCAIS_MAX;

  function updateItems(next: GuiaLocalItem[]) {
    setGuias(next);
  }

  return (
    <div>
      <PanelTitle
        title="Guias"
        hint="Crie um guia para compartilhar dicas locais com os hóspedes."
      />
      <ul className="space-y-2">
        {items.map((it, idx) => (
          <li key={it.id} className="rounded-xl border px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <input
                className="min-w-0 flex-1 font-medium outline-none"
                value={it.titulo}
                maxLength={GUIA_LOCAL_TITULO_MAX}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...it, titulo: e.target.value };
                  updateItems(next);
                }}
              />
              <button
                type="button"
                className="shrink-0 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                onClick={() => updateItems(items.filter((_, i) => i !== idx))}
                aria-label={`Remover guia ${it.titulo || idx + 1}`}
              >
                Remover
              </button>
            </div>
            <textarea
              className="mt-1 w-full text-sm outline-none"
              value={it.conteudo}
              maxLength={GUIA_LOCAL_CONTEUDO_MAX}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...it, conteudo: e.target.value };
                updateItems(next);
              }}
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={atMax}
        className="mt-3 rounded-full border border-slate-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() =>
          updateItems([
            ...items,
            { id: `gl-${Date.now()}`, titulo: 'Novo guia', conteudo: '' },
          ])
        }
      >
        + Adicionar guia
      </button>
    </div>
  );
}
