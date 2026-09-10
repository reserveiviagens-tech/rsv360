'use client';

import { useMemo, useState } from 'react';
import { AMENITY_CATALOG, AMENITY_ID_SET, type AmenityId } from './amenity-catalog';

type Props = {
  amenities: Set<string>;
  toggleAmenity: (id: string) => void;
};

export function summarizeComodidadesClient(
  amenities: Set<string>,
  previewCount = 3,
): string | null {
  const ordered = AMENITY_CATALOG.filter((a) => amenities.has(a.id));
  if (ordered.length === 0) return null;
  const labels = ordered.slice(0, previewCount).map((a) => a.label);
  const rest = ordered.length - labels.length;
  if (rest > 0) return `${labels.join(', ')} + ${rest} mais`;
  return labels.join(', ');
}

export function normalizeAmenitySetClient(raw: unknown): Set<string> {
  const set = new Set<string>();
  if (!Array.isArray(raw)) return set;
  for (const item of raw) {
    let key = '';
    if (typeof item === 'string') key = item.toLowerCase().trim();
    else if (item && typeof item === 'object' && 'id' in item) {
      key = String((item as { id: string }).id).toLowerCase().trim();
    }
    if (!key) continue;
    if (AMENITY_ID_SET.has(key)) set.add(key);
    else if (key === 'wi-fi' || key === 'internet') set.add('wifi');
    else if (key === 'ar-condicionado' || key === 'arcondicionado') set.add('ar');
  }
  return set;
}

function CatalogPicker({
  selected,
  onToggle,
  onlyMissing,
}: {
  selected: Set<string>;
  onToggle: (id: AmenityId) => void;
  onlyMissing?: boolean;
}) {
  const items = onlyMissing
    ? AMENITY_CATALOG.filter((a) => !selected.has(a.id))
    : AMENITY_CATALOG;

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Todas as comodidades do catálogo já foram adicionadas.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((a) => {
        const on = selected.has(a.id);
        return (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onToggle(a.id)}
              className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                on
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
              aria-pressed={on}
            >
              <span className="text-xl" aria-hidden>
                {a.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">{a.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{a.desc}</span>
              </span>
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                  on
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 text-slate-400'
                }`}
                aria-hidden
              >
                {on ? '✓' : '+'}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ComodidadesEditor({ amenities, toggleAmenity }: Props) {
  const [mode, setMode] = useState<'view' | 'edit' | 'add'>('view');
  const selected = useMemo(
    () => AMENITY_CATALOG.filter((a) => amenities.has(a.id)),
    [amenities],
  );

  function toggle(id: AmenityId) {
    toggleAmenity(id);
  }

  if (mode === 'edit' || mode === 'add') {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {mode === 'add' ? 'Adicionar comodidades' : 'Editar comodidades'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === 'add'
                ? 'Escolha o que ainda falta no anúncio.'
                : 'Toque para adicionar ou remover comodidades.'}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm font-medium text-slate-700 underline-offset-2 hover:underline"
            onClick={() => setMode('view')}
          >
            Concluir
          </button>
        </div>
        <CatalogPicker
          selected={amenities}
          onToggle={toggle}
          onlyMissing={mode === 'add'}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Comodidades</h2>
          <p className="mt-1 text-sm text-slate-500">
            Você já adicionou estas ao seu anúncio.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            onClick={() => setMode('edit')}
          >
            Editar
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={() => setMode('add')}
            aria-label="Adicionar comodidades"
          >
            +
          </button>
        </div>
      </div>

      {selected.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center">
          <p className="text-sm text-slate-600">Nenhuma comodidade adicionada ainda.</p>
          <button
            type="button"
            className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => setMode('add')}
          >
            Adicionar comodidades
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {selected.map((a) => (
            <li
              key={a.id}
              className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3"
            >
              <span className="text-xl" aria-hidden>
                {a.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{a.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{a.desc}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {selected.length > 0 && selected.length < AMENITY_CATALOG.length ? (
        <button
          type="button"
          className="text-sm font-medium text-slate-700 underline underline-offset-2"
          onClick={() => setMode('add')}
        >
          Adicionar mais comodidades
        </button>
      ) : null}
    </div>
  );
}
