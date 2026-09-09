'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAnfitriaoMinhas } from '@/hooks/useAnfitriao';
import {
  filterUnitsBySearch,
  type SearchableUnit,
} from '@/lib/anfitriao-unit-search';
import { AnfitriaoUnitSearchField } from './AnfitriaoUnitSearchField';
import {
  compactThumbUrl,
  resolveUnitThumbUrl,
  statusPublicacaoLabel,
  unitThumbPlaceholder,
} from './unit-thumb';

export type AnfitriaoUnitListItem = SearchableUnit & {
  titulo: string;
  midia?: unknown;
};

const EXPANDED_KEY = 'rsv360.anfitriao.listings-rail.expanded';
const SCROLL_STEP = 72;
const HIDE_SCROLLBAR =
  '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

type Props = {
  currentId: number;
  /** Build href when switching unit (e.g. disponibilidade calendar). */
  hrefFor: (unitId: number) => string;
  className?: string;
  /**
   * rail = Airbnb vertical (default): collapsed thumbs / expanded list.
   * chip = compact control for very small screens.
   */
  variant?: 'rail' | 'chip' | 'tabs';
};

function UnitThumb({
  src,
  alt,
  size,
  seed,
  label,
}: {
  src: string | null;
  alt: string;
  size: number;
  seed: number;
  label: string;
}) {
  const fallback = unitThumbPlaceholder(seed, label);
  const [display, setDisplay] = useState(() =>
    src ? compactThumbUrl(src, size * 2) : fallback,
  );

  useEffect(() => {
    setDisplay(src ? compactThumbUrl(src, size * 2) : fallback);
  }, [src, size, fallback]);

  return (
    <span
      className="relative block shrink-0 overflow-hidden rounded-xl bg-slate-200 shadow-sm ring-1 ring-black/5"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- host midia / data-uri placeholders */}
      <img
        src={display}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setDisplay(fallback)}
        className="block h-full w-full object-cover"
      />
    </span>
  );
}

function thumbProps(u: AnfitriaoUnitListItem) {
  return {
    src: resolveUnitThumbUrl(u.midia),
    seed: Number(u.id) || 0,
    label: u.titulo || String(u.id),
  };
}

export function AnfitriaoPropertySwitcher({
  currentId,
  hrefFor,
  className = '',
  variant = 'rail',
}: Props) {
  const { data, isLoading } = useAnfitriaoMinhas(1, 100);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => {
    const raw = (data?.data?.items ?? []) as AnfitriaoUnitListItem[];
    return raw.filter((u) => Number.isFinite(Number(u.id)) && Number(u.id) > 0);
  }, [data]);

  const filtered = useMemo(() => filterUnitsBySearch(items, query), [items, query]);
  const visible = expanded ? filtered : items;

  const current = useMemo(
    () => items.find((u) => Number(u.id) === currentId),
    [items, currentId],
  );

  const updateScrollState = () => {
    const el = railRef.current;
    if (!el) {
      setCanScrollUp(false);
      setCanScrollDown(false);
      return;
    }
    const max = el.scrollHeight - el.clientHeight;
    setCanScrollUp(el.scrollTop > 2);
    setCanScrollDown(max > 2 && el.scrollTop < max - 2);
  };

  useEffect(() => {
    try {
      if (localStorage.getItem(EXPANDED_KEY) === '1') setExpanded(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = railRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollState) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro?.disconnect();
    };
  }, [visible.length, expanded]);

  function setExpandedPersist(next: boolean) {
    setExpanded(next);
    if (!next) setQuery('');
    try {
      localStorage.setItem(EXPANDED_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  function scrollRail(dir: 1 | -1) {
    railRef.current?.scrollBy({ top: dir * SCROLL_STEP, behavior: 'smooth' });
  }

  if (isLoading && items.length === 0) {
    return (
      <div className={`flex w-14 flex-col items-center gap-2 ${className}`} aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 w-12 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
    );
  }

  if (items.length <= 1) {
    return null;
  }

  if (variant === 'chip') {
    const t = current ? thumbProps(current) : { src: null, seed: currentId, label: String(currentId) };
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setExpandedPersist(true)}
          className="flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 text-left shadow-sm"
        >
          <UnitThumb src={t.src} alt="" size={32} seed={t.seed} label={t.label} />
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-slate-900">
              {current?.titulo || `Unidade #${currentId}`}
            </span>
            <span className="block text-[10px] text-slate-500">Trocar acomodação</span>
          </span>
        </button>
        {expanded ? (
          <ExpandedOverlay
            currentId={currentId}
            hrefFor={hrefFor}
            items={items}
            filtered={filtered}
            query={query}
            onQuery={setQuery}
            onClose={() => setExpandedPersist(false)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <aside
      className={`sticky top-4 z-20 shrink-0 self-start ${
        expanded ? 'flex w-[min(100%,288px)] flex-col' : 'flex w-14 flex-col items-center'
      } ${className}`}
      aria-label="Acomodações"
      data-expanded={expanded ? '1' : '0'}
    >
      {expanded ? (
        <AnfitriaoUnitSearchField
          value={query}
          onChange={setQuery}
          resultCount={query ? filtered.length : undefined}
          totalCount={query ? items.length : undefined}
          showHints={false}
          className="mb-2 w-full"
        />
      ) : null}

      {canScrollUp ? (
        <button
          type="button"
          onClick={() => scrollRail(-1)}
          className={`mb-1 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 ${
            expanded ? 'self-center' : ''
          }`}
          aria-label="Ver acomodações anteriores"
          title="Subir"
        >
          ↑
        </button>
      ) : (
        <div className="mb-1 h-8 w-8" aria-hidden />
      )}

      <div
        ref={railRef}
        className={`flex max-h-[min(360px,45vh)] flex-col gap-2 overflow-y-auto overscroll-contain ${HIDE_SCROLLBAR} ${
          expanded ? 'w-full' : 'items-center'
        }`}
        role="listbox"
      >
        {visible.map((u) => {
          const selected = Number(u.id) === currentId;
          const t = thumbProps(u);

          if (!expanded) {
            return (
              <Link
                key={u.id}
                href={hrefFor(u.id)}
                prefetch={false}
                role="option"
                aria-selected={selected}
                title={u.titulo}
                className={`block rounded-xl transition ${
                  selected
                    ? 'ring-2 ring-slate-900 ring-offset-2'
                    : 'ring-1 ring-transparent hover:ring-slate-300'
                }`}
              >
                <UnitThumb src={t.src} alt="" size={48} seed={t.seed} label={t.label} />
                <span className="sr-only">{u.titulo}</span>
              </Link>
            );
          }

          return (
            <Link
              key={u.id}
              href={hrefFor(u.id)}
              prefetch={false}
              role="option"
              aria-selected={selected}
              className={`flex w-full min-w-0 items-center gap-3 rounded-xl px-2 py-2 transition ${
                selected
                  ? 'border border-slate-900 bg-white shadow-sm'
                  : 'border border-transparent hover:bg-white/80'
              }`}
            >
              <UnitThumb src={t.src} alt="" size={44} seed={t.seed} label={t.label} />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {u.titulo || `Unidade #${u.id}`}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {statusPublicacaoLabel(u.statusPublicacao)}
                </span>
              </span>
            </Link>
          );
        })}
        {expanded && query && filtered.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-slate-500">Nenhum resultado</p>
        ) : null}
      </div>

      {canScrollDown ? (
        <button
          type="button"
          onClick={() => scrollRail(1)}
          className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 ${
            expanded ? 'self-center' : ''
          }`}
          aria-label="Ver mais acomodações"
          title="Descer"
        >
          ↓
        </button>
      ) : (
        <div className="mt-1 h-8 w-8" aria-hidden />
      )}

      <div
        className={`mt-2 w-full border-t border-slate-200 pt-3 ${
          expanded ? 'flex justify-start' : 'flex justify-center'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpandedPersist(!expanded);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg leading-none text-slate-700 hover:bg-slate-200"
          aria-label={expanded ? 'Recolher e mostrar só imagens' : 'Expandir e mostrar nomes'}
          aria-expanded={expanded}
          title={expanded ? 'Recolher' : 'Expandir nomes'}
        >
          {expanded ? '‹' : '›'}
        </button>
      </div>
    </aside>
  );
}

function ExpandedOverlay({
  currentId,
  hrefFor,
  items,
  filtered,
  query,
  onQuery,
  onClose,
}: {
  currentId: number;
  hrefFor: (id: number) => string;
  items: AnfitriaoUnitListItem[];
  filtered: AnfitriaoUnitListItem[];
  query: string;
  onQuery: (q: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-start bg-black/20 p-4 md:p-8">
      <button type="button" className="absolute inset-0" aria-label="Fechar" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"
        role="dialog"
        aria-label="Acomodações"
      >
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
            aria-label="Recolher"
          >
            ‹
          </button>
          <p className="text-sm font-semibold text-slate-900">Suas acomodações</p>
        </div>
        <AnfitriaoUnitSearchField
          value={query}
          onChange={onQuery}
          resultCount={query ? filtered.length : undefined}
          totalCount={query ? items.length : undefined}
          className="mb-3"
        />
        <ul className={`max-h-[min(70vh,520px)] space-y-1 overflow-y-auto ${HIDE_SCROLLBAR}`}>
          {filtered.map((u) => {
            const selected = Number(u.id) === currentId;
            const t = thumbProps(u);
            return (
              <li key={u.id}>
                <Link
                  href={hrefFor(u.id)}
                  prefetch={false}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-xl px-2 py-2 transition ${
                    selected
                      ? 'border border-slate-900 bg-slate-50'
                      : 'border border-transparent hover:bg-slate-50'
                  }`}
                >
                  <UnitThumb src={t.src} alt="" size={44} seed={t.seed} label={t.label} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {u.titulo}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {statusPublicacaoLabel(u.statusPublicacao)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
