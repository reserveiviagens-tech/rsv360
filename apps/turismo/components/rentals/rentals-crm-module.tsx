'use client';

import { useEffect, useMemo, useState } from 'react';
import { CRM_RENTAL_FOCUS_ID_KEY } from '../lintel/crm-live-chat-data';
import { Building2, CalendarClock, ChevronDown, KeyRound, Search, TrendingUp } from 'lucide-react';
import { LintelPrimaryActions } from '../lintel/lintel-primary-actions';
import { useCrmLocale } from '../lintel/crm-locale-provider';
import { LintelKpiPill } from '../lintel/lintel-kpi-pill';
import { LintelKpiStripRow } from '../lintel/lintel-kpi-strip-row';
import { useLintelCreateOptional } from '../lintel/lintel-create-provider';
import { useCrmLiveChatOptional } from '../lintel/crm-live-chat-provider';
import type { RentalCardAction } from './rental-portfolio-card';
import { LeaseCalendarPanel } from './lease-calendar-panel';
import { RentRollChart } from './rent-roll-chart';
import { RentalPortfolioCard } from './rental-portfolio-card';
import {
  SAMPLE_LEASE_CALENDAR,
  SAMPLE_RENTAL_PORTFOLIO,
  rentalFilterCounts,
  rentalMatchesFilter,
  type RentalPortfolioItem,
} from './rentals-data';
import { LINTEL_RENTALS_TW } from '../lintel/lintel-theme';
import { RentalsSkeleton } from './rentals-skeleton';

export const RENTALS_PAGE_BOOT_MS = 580;

type RentalsFilter = 'all' | 'vacant' | 'let' | 'application';
type RentalsSort = 'newest' | 'name';

export type RentalsCrmModuleProps = {
  isActive?: boolean;
  bootOnActivate?: boolean;
};

function chipClass(active: boolean) {
  return active
    ? `inline-flex h-[26px] items-center gap-1.5 rounded-full px-3 text-[11px] font-bold text-white shadow-sm ${LINTEL_RENTALS_TW.chipActive}`
    : `inline-flex h-[26px] items-center gap-1.5 rounded-full border border-gray-200/80 bg-white px-3 text-[11px] font-bold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-white ${LINTEL_RENTALS_TW.chipInactiveDark}`;
}

function chipCount(active: boolean) {
  return active
    ? 'flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-black'
    : 'flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-gray-100 px-1 text-[10px] font-black text-gray-600 dark:bg-gray-800 dark:text-gray-300';
}

const kpiBadgeBlue = `shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums ${LINTEL_RENTALS_TW.kpiBadgeBlue}`;
const kpiBadgeOrange = `shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${LINTEL_RENTALS_TW.kpiBadgeOrange}`;

export function RentalsCrmModule({ isActive = true, bootOnActivate = true }: RentalsCrmModuleProps) {
  const { copy } = useCrmLocale();
  const r = copy.rentals;
  const lintelCreate = useLintelCreateOptional();
  const liveChat = useCrmLiveChatOptional();

  const handleCardAction = (action: RentalCardAction, item: RentalPortfolioItem) => {
    const prefill = {
      rentalProperty: {
        id: item.id,
        name: item.name,
        address: item.address,
        area: item.area,
      },
    };
    if (action === 'viewing') {
      lintelCreate?.openCreate('viewing', { prefill });
      return;
    }
    if (action === 'lead') {
      lintelCreate?.openCreate('lead', { prefill });
      return;
    }
    liveChat?.sharePropertyCard(
      {
        id: item.id,
        name: item.name,
        subtitle: `${item.type} · ${item.area} · ${item.rent}`,
        thumb: item.photo,
        kind: 'rental',
        extraPhotos: 4,
      },
      { targetChat: 'nora' },
    );
  };
  const [filter, setFilter] = useState<RentalsFilter>('all');
  const [sort, setSort] = useState<RentalsSort>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return;
    const focusId = sessionStorage.getItem(CRM_RENTAL_FOCUS_ID_KEY);
    if (!focusId) return;
    sessionStorage.removeItem(CRM_RENTAL_FOCUS_ID_KEY);
    const row = SAMPLE_RENTAL_PORTFOLIO.find((p) => p.id === focusId);
    if (row) setSearch(row.name);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    if (!bootOnActivate) {
      setPageLoading(false);
      return;
    }
    setPageLoading(true);
    const id = window.setTimeout(() => setPageLoading(false), RENTALS_PAGE_BOOT_MS);
    return () => window.clearTimeout(id);
  }, [isActive, bootOnActivate]);

  const portfolio = SAMPLE_RENTAL_PORTFOLIO;
  const counts = useMemo(() => rentalFilterCounts(portfolio), [portfolio]);

  const totals = useMemo(() => {
    const units = portfolio.reduce((sum, row) => sum + row.units, 0);
    const occupied = portfolio.reduce((sum, row) => sum + row.occupied, 0);
    const vacantUnits = Math.max(0, units - occupied);
    const occupancy = units > 0 ? Math.round((occupied / units) * 100) : 0;
    return { units, occupied, vacantUnits, occupancy };
  }, [portfolio]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = portfolio.filter((item) => {
      if (!rentalMatchesFilter(item, filter)) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.area.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
      );
    });
    rows = [...rows].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      return b.createdAt.localeCompare(a.createdAt);
    });
    return rows;
  }, [portfolio, filter, search, sort]);

  if (!isActive) return null;

  if (pageLoading) {
    return <RentalsSkeleton />;
  }

  const filters: { key: RentalsFilter; label: string; count: number }[] = [
    { key: 'all', label: r.filterAll, count: counts.all },
    { key: 'vacant', label: r.filterVacant, count: counts.vacant },
    { key: 'let', label: r.filterLet, count: counts.let },
    { key: 'application', label: r.filterApplication, count: counts.application },
  ];

  const unitsBadge = `${totals.occupied}/${totals.units} ${r.kpiUnitsBadge}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center xl:justify-between xl:gap-3">
        <h1 className="min-w-0 truncate text-2xl font-black leading-none tracking-tight text-gray-900 dark:text-white">
          {copy.nav.rentals}
        </h1>
        <div className="min-w-0 flex-1 xl:flex xl:justify-end">
          <LintelKpiStripRow>
            <LintelKpiPill
              surface="inline"
              icon={<Building2 className="h-3.5 w-3.5" />}
              value={`${totals.occupancy}%`}
              label={r.occupancyKpi}
              valueClassName="text-base font-black leading-none text-gray-900 dark:text-white"
              valueSuffix={
                <span className={kpiBadgeBlue} title={unitsBadge}>
                  {totals.occupied}/{totals.units}
                </span>
              }
            />
            <LintelKpiPill
              surface="inline"
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              value="$363,150"
              label={r.monthlyRevenueKpi}
              valueClassName="text-base font-black leading-none text-gray-900 dark:text-white"
            />
            <LintelKpiPill
              surface="inline"
              icon={<KeyRound className="h-3.5 w-3.5" />}
              value={String(counts.vacant)}
              label={r.vacantUnitsKpi}
              tone="accentOrange"
              valueClassName="text-base font-black leading-none text-orange-600 dark:text-orange-400"
              valueSuffix={<span className={kpiBadgeOrange}>{r.kpiToLetBadge}</span>}
            />
            <LintelKpiPill
              surface="inline"
              icon={<CalendarClock className="h-3.5 w-3.5" />}
              value="36"
              label={r.expiringLeasesKpi}
              valueClassName="text-base font-black leading-none text-gray-900 dark:text-white"
            />
            <LintelPrimaryActions
              variant="rentals"
              hideOverflowMenu
              className="ml-0.5 shrink-0"
            />
          </LintelKpiStripRow>
        </div>
      </div>

      <div className="lintel-stagger grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <RentRollChart variant="lintel" />
        </div>
        <div className="lg:col-span-5">
          <LeaseCalendarPanel items={SAMPLE_LEASE_CALENDAR} compactLintelLayout />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div
            className={`flex h-[26px] w-full min-w-[12.5rem] max-w-[14rem] items-center gap-2 rounded-full border border-gray-200/90 bg-white px-3 shadow-xs dark:border-gray-700 ${LINTEL_RENTALS_TW.searchDark}`}
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={r.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-xs text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
            />
          </div>

          {filters.map(({ key, label, count }) => (
            <button key={key} type="button" onClick={() => setFilter(key)} className={chipClass(filter === key)}>
              {label}
              <span className={chipCount(filter === key)}>{count}</span>
            </button>
          ))}
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            className={`inline-flex h-[26px] items-center gap-1.5 rounded-full border border-gray-200/80 bg-white px-3 text-xs font-bold text-gray-800 shadow-xs dark:border-gray-700 dark:text-white ${LINTEL_RENTALS_TW.popoverDark}`}
            aria-expanded={sortOpen}
          >
            {sort === 'newest' ? r.sortNewest : r.sortName}
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" aria-hidden />
          </button>
          {sortOpen ? (
            <div
              className={`absolute right-0 top-full z-20 mt-1 min-w-[10rem] rounded-2xl border border-gray-200 bg-white p-1 shadow-xl dark:border-gray-700 ${LINTEL_RENTALS_TW.popoverDark}`}
            >
              {(
                [
                  ['newest', r.sortNewest],
                  ['name', r.sortName],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`flex w-full rounded-xl px-3 py-2 text-left text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    sort === key ? LINTEL_RENTALS_TW.sortActive : 'text-gray-700 dark:text-gray-200'
                  }`}
                  onClick={() => {
                    setSort(key);
                    setSortOpen(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="lintel-rentals-enter grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((item: RentalPortfolioItem, idx) => (
          <RentalPortfolioCard
            key={item.id}
            item={item}
            enterDelayMs={idx * 50}
            lintelUniformHeight
            onAction={(action, row) => handleCardAction(action, row)}
          />
        ))}
      </div>
    </div>
  );
}
