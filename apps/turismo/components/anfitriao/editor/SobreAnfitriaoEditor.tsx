'use client';

import { useEffect, useState } from 'react';
import type { EditorMeta } from './editor-types';

export type SobreAnfitriaoValue = NonNullable<EditorMeta['sobreAnfitriao']>;

export const SOBRE_ANFITRIAO_INTERESSES = [
  { id: 'gastronomia', label: 'Gastronomia e culinária' },
  { id: 'natureza', label: 'Natureza e ecoturismo' },
  { id: 'arte', label: 'Arte e cultura' },
  { id: 'esportes', label: 'Esportes e atividades ao ar livre' },
  { id: 'musica', label: 'Música e eventos' },
  { id: 'viagens', label: 'Viagens e exploração' },
  { id: 'familia', label: 'Família e crianças' },
  { id: 'pets', label: 'Animais de estimação' },
  { id: 'tecnologia', label: 'Tecnologia' },
  { id: 'leitura', label: 'Leitura e literatura' },
  { id: 'fotografia', label: 'Fotografia' },
  { id: 'bem-estar', label: 'Bem-estar e relaxamento' },
] as const;

export const SOBRE_ANFITRIAO_BIO_MAX = 500;
export const SOBRE_ANFITRIAO_ANOS_MAX = 99;

type SubKey = 'bio' | 'interesses' | 'anos' | 'visibilidade';

const SUBS: Array<{ id: SubKey; title: string; hint: string }> = [
  { id: 'bio', title: 'Bio curta', hint: 'Apresentação breve para o anúncio' },
  { id: 'interesses', title: 'Interesses', hint: 'O que você gosta de compartilhar com hóspedes' },
  { id: 'anos', title: 'Anos como anfitrião', hint: 'Experiência recebendo hóspedes' },
  { id: 'visibilidade', title: 'Visibilidade no anúncio', hint: 'Exibir perfil do anfitrião na página pública' },
];

type Props = {
  value: SobreAnfitriaoValue;
  onChange: (next: SobreAnfitriaoValue) => void;
};

export function summarizeSobreAnfitriaoClient(value: SobreAnfitriaoValue): string | null {
  const bio = String(value.bioCurta ?? '').trim();
  const nInt = Array.isArray(value.interesses) ? value.interesses.length : 0;
  const anos =
    typeof value.anosAnfitriao === 'number' && Number.isFinite(value.anosAnfitriao)
      ? value.anosAnfitriao
      : null;
  const visivel = value.mostrarNoAnuncio !== false;

  const parts: string[] = [];
  if (bio) {
    parts.push(bio.length <= 48 ? bio : `${bio.slice(0, 47)}…`);
  }
  if (nInt) {
    parts.push(`${nInt} interesse${nInt === 1 ? '' : 's'}`);
  }
  if (anos != null) {
    parts.push(`${anos} ano${anos === 1 ? '' : 's'}`);
  }
  if (!visivel) {
    parts.push('Oculto no anúncio');
  }
  return parts.length ? parts.join(' · ') : null;
}

function snippet(text: string | undefined, empty = 'Adicionar'): string {
  const t = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return empty;
  return t.length <= 72 ? t : `${t.slice(0, 71)}…`;
}

function toggleId(list: string[] | undefined, id: string): string[] {
  const cur = Array.isArray(list) ? [...list] : [];
  const i = cur.indexOf(id);
  if (i >= 0) cur.splice(i, 1);
  else cur.push(id);
  return cur;
}

function BioEditor({
  initial,
  onCancel,
  onSave,
}: {
  initial: string;
  onCancel: () => void;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(initial.slice(0, SOBRE_ANFITRIAO_BIO_MAX));
  const dirty = draft !== initial;

  useEffect(() => {
    setDraft(initial.slice(0, SOBRE_ANFITRIAO_BIO_MAX));
  }, [initial]);

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
        <h2 className="text-2xl font-bold text-slate-900">Bio curta</h2>
        <p className="mt-1 text-sm text-slate-500">Apresentação breve para o anúncio</p>
      </div>
      <textarea
        className="min-h-[220px] w-full flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none ring-slate-900 focus:ring-2"
        value={draft}
        maxLength={SOBRE_ANFITRIAO_BIO_MAX}
        onChange={(e) => setDraft(e.target.value.slice(0, SOBRE_ANFITRIAO_BIO_MAX))}
        aria-label="Bio curta"
        placeholder="Conte um pouco sobre você e o que torna sua hospedagem especial…"
      />
      <p className={`text-xs ${draft.length >= SOBRE_ANFITRIAO_BIO_MAX ? 'font-medium text-amber-700' : 'text-slate-500'}`}>
        {draft.length}/{SOBRE_ANFITRIAO_BIO_MAX} disponíveis
      </p>
      <div className="mt-auto flex gap-2 pt-2">
        <button
          type="button"
          className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!dirty}
          className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          onClick={() => onSave(draft)}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

export function SobreAnfitriaoEditor({ value, onChange }: Props) {
  const [sub, setSub] = useState<SubKey | null>(null);

  if (sub === 'bio') {
    return (
      <BioEditor
        initial={value.bioCurta ?? ''}
        onCancel={() => setSub(null)}
        onSave={(v) => {
          onChange({ ...value, bioCurta: v });
          setSub(null);
        }}
      />
    );
  }

  if (sub === 'interesses') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
          onClick={() => setSub(null)}
        >
          ← Voltar
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Interesses</h2>
        <p className="text-sm text-slate-500">Selecione temas que você gosta de compartilhar</p>
        <ul className="space-y-2">
          {SOBRE_ANFITRIAO_INTERESSES.map((item) => {
            const on = (value.interesses ?? []).includes(item.id);
            return (
              <li key={item.id}>
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm">
                  <span>{item.label}</span>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      onChange({
                        ...value,
                        interesses: toggleId(value.interesses, item.id),
                      })
                    }
                  />
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (sub === 'anos') {
    const anosStr =
      value.anosAnfitriao != null && Number.isFinite(value.anosAnfitriao)
        ? String(value.anosAnfitriao)
        : '';
    return (
      <div className="space-y-4">
        <button
          type="button"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
          onClick={() => setSub(null)}
        >
          ← Voltar
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Anos como anfitrião</h2>
        <p className="text-sm text-slate-500">Quantos anos você recebe hóspedes nesta plataforma ou similar</p>
        <label className="block text-sm">
          Anos de experiência
          <input
            type="number"
            min={0}
            max={SOBRE_ANFITRIAO_ANOS_MAX}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={anosStr}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                onChange({ ...value, anosAnfitriao: undefined });
                return;
              }
              const n = Math.min(SOBRE_ANFITRIAO_ANOS_MAX, Math.max(0, Math.floor(Number(raw))));
              if (Number.isFinite(n)) {
                onChange({ ...value, anosAnfitriao: n });
              }
            }}
            aria-label="Anos como anfitrião"
          />
        </label>
      </div>
    );
  }

  if (sub === 'visibilidade') {
    const mostrar = value.mostrarNoAnuncio !== false;
    return (
      <div className="space-y-4">
        <button
          type="button"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
          onClick={() => setSub(null)}
        >
          ← Voltar
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Visibilidade no anúncio</h2>
        <p className="text-sm text-slate-500">
          Quando ativo, hóspedes veem sua bio e interesses na página do anúncio. Foto e dados
          completos continuam no perfil da conta.
        </p>
        <label className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm">
          <span>Mostrar perfil do anfitrião no anúncio</span>
          <input
            type="checkbox"
            checked={mostrar}
            onChange={(e) => onChange({ ...value, mostrarNoAnuncio: e.target.checked })}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Sobre o anfitrião</h2>
        <p className="mt-1 text-sm text-slate-500">
          Bio, interesses e experiência exibidos no anúncio
        </p>
      </div>
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {SUBS.map((s) => {
          let summary = 'Adicionar';
          if (s.id === 'bio') {
            summary = snippet(value.bioCurta);
          } else if (s.id === 'interesses') {
            const n = value.interesses?.length ?? 0;
            summary = n ? `${n} selecionado(s)` : 'Adicionar';
          } else if (s.id === 'anos') {
            summary =
              value.anosAnfitriao != null && Number.isFinite(value.anosAnfitriao)
                ? `${value.anosAnfitriao} ano${value.anosAnfitriao === 1 ? '' : 's'}`
                : 'Adicionar';
          } else if (s.id === 'visibilidade') {
            summary = value.mostrarNoAnuncio === false ? 'Oculto no anúncio' : 'Visível no anúncio';
          }
          return (
            <li key={s.id}>
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                onClick={() => setSub(s.id)}
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{s.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{s.hint}</span>
                  <span className="mt-1 block text-xs text-slate-600">{summary}</span>
                </span>
                <span className="text-slate-400" aria-hidden>
                  ›
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
