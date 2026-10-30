'use client';

import { useEffect, useState } from 'react';
import { HOME_SECTIONS, type HomeSectionId } from '../../lib/home-sections';
import { homeSectionsApi } from '../../services/homeSectionsApi';

export type SectionStat = {
  id: HomeSectionId;
  label: string;
  shortLabel: string;
  total: number;
  active: number;
};

const SHORT: Record<HomeSectionId, string> = {
  hero: 'Hero',
  escolhas: 'Escolhas',
  destinos: 'Destinos',
  ofertas: 'Ofertas',
  tempo: 'Tempo',
};

type Props = {
  activeSection: HomeSectionId;
  onSelectSection: (id: HomeSectionId) => void;
  /** Bump to refetch after mutations on the active tab */
  refreshKey?: number;
};

export function HomeSectionStatCards({ activeSection, onSelectSection, refreshKey = 0 }: Props) {
  const [stats, setStats] = useState<SectionStat[]>(() =>
    HOME_SECTIONS.map((s) => ({
      id: s.id,
      label: s.label,
      shortLabel: SHORT[s.id],
      total: 0,
      active: 0,
    })),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await Promise.all(
          HOME_SECTIONS.map(async (section) => {
            try {
              const items = await homeSectionsApi.listAdmin(section.id);
              const active = items.filter((i) => i.isActive !== false).length;
              return {
                id: section.id,
                label: section.label,
                shortLabel: SHORT[section.id],
                total: items.length,
                active,
              } satisfies SectionStat;
            } catch {
              return {
                id: section.id,
                label: section.label,
                shortLabel: SHORT[section.id],
                total: 0,
                active: 0,
              } satisfies SectionStat;
            }
          }),
        );
        if (!cancelled) setStats(rows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      data-testid="home-sections-statcards"
    >
      {stats.map((stat) => {
        const isActiveTab = stat.id === activeSection;
        const healthy = stat.active > 0;
        return (
          <button
            key={stat.id}
            type="button"
            data-testid={`statcard-${stat.id}`}
            onClick={() => onSelectSection(stat.id)}
            className={`min-h-[72px] rounded-2xl border px-3 py-3 text-left transition-all duration-200 ${
              isActiveTab
                ? 'border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-600/20'
                : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {stat.shortLabel}
              </span>
              <span
                className={`inline-flex h-2 w-2 shrink-0 rounded-full ${
                  loading ? 'bg-slate-300' : healthy ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
                aria-hidden
              />
            </div>
            <div className="mt-1.5 text-2xl font-extrabold text-slate-900 tabular-nums">
              {loading ? '—' : stat.active}
              <span className="ml-1 text-sm font-semibold text-slate-400">
                {loading ? '' : `ativo${stat.active === 1 ? '' : 's'}`}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              {loading ? 'Carregando…' : `${stat.total} no total`}
            </div>
          </button>
        );
      })}
    </div>
  );
}
