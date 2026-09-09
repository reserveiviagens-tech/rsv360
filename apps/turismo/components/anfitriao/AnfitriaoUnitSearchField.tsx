'use client';

import { UNIT_SEARCH_HINTS, UNIT_SEARCH_PLACEHOLDER } from '@/lib/anfitriao-unit-search';

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  resultCount?: number;
  totalCount?: number;
  /** Show quick chips under the input. */
  showHints?: boolean;
};

export function AnfitriaoUnitSearchField({
  value,
  onChange,
  className = '',
  resultCount,
  totalCount,
  showHints = true,
}: Props) {
  return (
    <div className={className}>
      <label className="relative block">
        <span className="sr-only">Buscar acomodação</span>
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden
        >
          ⌕
        </span>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={UNIT_SEARCH_PLACEHOLDER}
          autoComplete="off"
          className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-900 shadow-sm outline-none ring-slate-900/10 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
            aria-label="Limpar busca"
          >
            Limpar
          </button>
        ) : null}
      </label>

      {value && resultCount != null && totalCount != null ? (
        <p className="mt-1.5 text-xs text-slate-500">
          {resultCount === 0
            ? 'Nenhuma acomodação encontrada'
            : `${resultCount} de ${totalCount} acomodação(ões)`}
        </p>
      ) : null}

      {showHints && !value ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {UNIT_SEARCH_HINTS.map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => onChange(hint)}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900"
            >
              {hint}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
