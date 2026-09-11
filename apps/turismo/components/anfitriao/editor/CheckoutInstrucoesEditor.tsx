'use client';

import type { EditorMeta } from './editor-types';

export type GuiaChegadaValue = NonNullable<EditorMeta['guiaChegada']>;
export type InstrucaoCheckoutItem = NonNullable<
  GuiaChegadaValue['instrucoesCheckout']
>[number];

export const CHECKOUT_INSTRUCAO_TEXTO_MAX = 140;
export const CHECKOUT_INSTRUCOES_MAX = 20;

export function summarizeCheckoutInstrucoesClient(guia: GuiaChegadaValue): string {
  const list = guia.instrucoesCheckout;
  if (!Array.isArray(list) || list.length === 0) {
    return 'Adicionar informações';
  }
  const n = list.length;
  return n === 1 ? '1 instrução' : `${n} instruções`;
}

function PanelTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

type CheckoutInstrucoesEditorProps = {
  guia: GuiaChegadaValue;
  setGuia: (v: GuiaChegadaValue) => void;
};

export function CheckoutInstrucoesEditor({ guia, setGuia }: CheckoutInstrucoesEditorProps) {
  const items = guia.instrucoesCheckout ?? [];
  const atMax = items.length >= CHECKOUT_INSTRUCOES_MAX;

  function updateItems(next: InstrucaoCheckoutItem[]) {
    setGuia({
      ...guia,
      instrucoesCheckout: next.length ? next : undefined,
    });
  }

  return (
    <div>
      <PanelTitle
        title="Instruções de checkout"
        hint="Visíveis antes da reserva. Lembrete às 17h do dia anterior."
      />
      <ul className="space-y-2">
        {items.map((it, idx) => (
          <li key={it.id} className="rounded-xl border px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <input
                className="min-w-0 flex-1 font-medium outline-none"
                value={it.titulo}
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
                aria-label={`Remover instrução ${it.titulo || idx + 1}`}
              >
                Remover
              </button>
            </div>
            <textarea
              className="mt-1 w-full text-sm outline-none"
              value={it.texto}
              maxLength={CHECKOUT_INSTRUCAO_TEXTO_MAX}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...it, texto: e.target.value };
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
            { id: `c-${Date.now()}`, titulo: 'Nova instrução', texto: '' },
          ])
        }
      >
        + Adicionar instrução
      </button>
    </div>
  );
}
