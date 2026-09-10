'use client';

import { useEffect, useState } from 'react';
import {
  DESCRICAO_ANUNCIO_MAX,
  DESCRICAO_CAMPO_MAX,
  DESCRICAO_SUB_FIELDS,
  type DescricaoSubKey,
} from './descricao-limits';

export type { DescricaoSubKey };

type Props = {
  descAnuncio: string;
  descProp: string;
  descAcesso: string;
  descInteracao: string;
  descOutras: string;
  descSub: DescricaoSubKey | null;
  setDescSub: (v: DescricaoSubKey | null) => void;
  setDescField: (key: DescricaoSubKey, v: string) => void;
};

export function summarizeDescricaoClient(anuncio: string, max = 80): string | null {
  const t = String(anuncio ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return null;
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function valueFor(props: Props, key: DescricaoSubKey): string {
  if (key === 'anuncio') return props.descAnuncio;
  if (key === 'propriedade') return props.descProp;
  if (key === 'acesso') return props.descAcesso;
  if (key === 'interacao') return props.descInteracao;
  return props.descOutras;
}

function snippet(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return 'Adicionar';
  return t.length <= 72 ? t : `${t.slice(0, 71)}…`;
}

function DescricaoFieldEditor({
  fieldKey,
  label,
  max,
  initial,
  onCancel,
  onSave,
}: {
  fieldKey: DescricaoSubKey;
  label: string;
  max: number;
  initial: string;
  onCancel: () => void;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(initial.slice(0, max));
  const dirty = draft !== initial;
  const remainingHint = `${draft.length}/${max} disponíveis`;

  useEffect(() => {
    setDraft(initial.slice(0, max));
  }, [fieldKey, initial, max]);

  return (
    <div className="flex min-h-[420px] flex-col space-y-4">
      <button
        type="button"
        className="self-start text-sm font-medium text-slate-600 hover:text-slate-900"
        onClick={onCancel}
      >
        ← Voltar
      </button>
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{label}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {fieldKey === 'anuncio'
            ? 'Texto principal do anúncio · até 500 caracteres · emojis permitidos'
            : 'Detalhe para hóspedes · até 1000 caracteres · emojis permitidos'}
        </p>
      </div>
      <textarea
        className="min-h-[220px] w-full flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none ring-slate-900 focus:ring-2"
        value={draft}
        maxLength={max}
        onChange={(e) => setDraft(e.target.value.slice(0, max))}
        aria-label={label}
      />
      <p
        className={`text-xs ${
          draft.length >= max ? 'font-medium text-amber-700' : 'text-slate-500'
        }`}
      >
        {remainingHint}
      </p>
      <div className="mt-auto flex gap-2 pt-2">
        <button
          type="button"
          className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-800"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!dirty}
          className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onSave(draft)}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

export function DescricaoEditor(props: Props) {
  if (props.descSub) {
    const meta = DESCRICAO_SUB_FIELDS.find((f) => f.key === props.descSub);
    if (!meta) return null;
    return (
      <DescricaoFieldEditor
        fieldKey={meta.key}
        label={meta.label}
        max={meta.max}
        initial={valueFor(props, meta.key)}
        onCancel={() => props.setDescSub(null)}
        onSave={(v) => {
          props.setDescField(meta.key, v);
          props.setDescSub(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Descrição</h2>
        <p className="mt-1 text-sm text-slate-500">
          Conte aos hóspedes o que torna seu espaço especial. Edite cada seção abaixo.
        </p>
      </div>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
        {DESCRICAO_SUB_FIELDS.map((f) => {
          const val = valueFor(props, f.key);
          return (
            <li key={f.key}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50"
                onClick={() => props.setDescSub(f.key)}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{f.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {snippet(val)}
                  </span>
                </span>
                <span className="shrink-0 text-slate-400" aria-hidden>
                  ›
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span aria-hidden>💡</span> Dicas
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">
          <li>
            A descrição do anúncio (até {DESCRICAO_ANUNCIO_MAX} caracteres) é a mais visível na
            busca.
          </li>
          <li>
            Use “Sua propriedade” e “Acesso” para orientar chegada, estacionamento e entradas.
          </li>
          <li>Evite dados de contato ou links externos — use o guia de chegada para isso.</li>
          <li>Demais campos: até {DESCRICAO_CAMPO_MAX} caracteres cada.</li>
        </ul>
      </div>
    </div>
  );
}
